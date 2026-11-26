from __future__ import annotations

import csv
import io
import re
from collections import defaultdict
from datetime import date, datetime, timedelta, timezone
from statistics import median
from typing import Callable

from fastapi import APIRouter, Cookie, Depends, Header, HTTPException, Query, Request, Response
from fastapi.responses import Response
from pydantic import ValidationError
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, sessionmaker

from .auth import InvalidToken, _DUMMY_PASSWORD_HASH, hash_password, issue_token, verify_password, verify_token
from .database import ROLES, session_dependency
from .notifications import (
    notify_blocker_escalated,
    notify_blocker_resolved,
    notify_consent_granted,
    notify_consent_revoked,
    notify_order_fulfilled,
    notify_supplier_commitment,
)
from .models import (
    AdoptionIntention,
    AuditLog,
    Blocker,
    BusinessTransaction,
    ConfigItem,
    Consent,
    DemandGroup,
    Farmer,
    FieldOrder,
    Notification,
    ProgrammeCost,
    SavingsRecord,
    SupplierCommitment,
    SyncReceipt,
    User,
    new_id,
    utcnow,
)
from .schemas import (
    AdoptionIntentionCreate,
    ApplicationPackRequest,
    BlockerCreate,
    BlockerTriageRequest,
    BlockerUpdate,
    ConfigItemCreate,
    ConsentCreate,
    DemoSessionRequest,
    LoginRequest,
    RegisterRequest,
    UserApprovalRequest,
    FarmerCreate,
    OrderCreate,
    ProgrammeCostCreate,
    SupplierCommitmentCreate,
    SyncEntry,
    SyncRequest,
    TransactionCreate,
    TransactionUpdate,
)
from .services import audit, category_route, readiness_profile, triage_blocker, week_start

DEMO_ROLE_IDS = {
    "agripreneur": "demo-agripreneur-001",
    "supplier": "demo-supplier-001",
    "lender": "demo-lender-001",
    "investor": "demo-investor-001",
    "buyer": "demo-buyer-001",
    "extension_officer": "demo-extension-officer-001",
    "programme_manager": "demo-programme-manager-001",
    "administrator": "demo-administrator-001",
}

ROLE_USER_IDS = {
    role: user_id for role, user_id in DEMO_ROLE_IDS.items()
}

KPI_DEFINITIONS = [
    {"id": "K1", "name": "Blockers logged", "formula": "Count of blockers in the selected period", "source": "Blocker Resolution"},
    {"id": "K2", "name": "Blocker resolution rate", "formula": "Resolved blockers ÷ blockers logged", "source": "Blocker Resolution"},
    {"id": "K3", "name": "Median time to resolve", "formula": "Median resolvedAt − createdAt", "source": "Blocker Resolution"},
    {"id": "K4", "name": "Order fulfilment rate", "formula": "Fulfilled order lines ÷ order lines", "source": "Pooled Demand"},
    {"id": "K5", "name": "Supplier commitment rate", "formula": "Demand groups with commitments ÷ open demand groups", "source": "Pooled Demand"},
    {"id": "K6", "name": "Intention → action conversion", "formula": "Farmers with a fulfilled order ÷ farmers with a logged intention (service-action proxy, not verified practice adoption)", "source": "Field Log + Pooled Demand"},
    {"id": "K7", "name": "Agripreneurs with current business records", "formula": "Agripreneurs with at least one income and one operating-cost entry in the selected period ÷ active agripreneurs", "source": "Business Book"},
    {"id": "K8", "name": "Farmers served per agripreneur", "formula": "Active farmers ÷ active agripreneurs", "source": "Field Log"},
    {"id": "K9", "name": "Women share", "formula": "Women participants ÷ participants, by role", "source": "People records"},
    {"id": "K10", "name": "Cost per outcome", "formula": "Approved programme cost ÷ verified outcomes", "source": "Programme costs + outcomes"},
    {"id": "K11", "name": "Data-quality score", "formula": "Records passing checks ÷ records checked", "source": "Data-quality checks"},
]


def _is_overdue(blocker: Blocker) -> bool:
    if blocker.status in {"resolved", "cannot_resolve", "closed"}:
        return False
    deadline = blocker.due_at
    if deadline.tzinfo is None:
        deadline = deadline.replace(tzinfo=timezone.utc)
    return deadline <= utcnow()


def _escalate_overdue(session: Session) -> int:
    manager_id = DEMO_ROLE_IDS["programme_manager"]
    escalated = 0
    blockers = session.scalars(
        select(Blocker).where(Blocker.status.in_(("open", "acknowledged", "in_progress")))
    ).all()
    for blocker in blockers:
        if _is_overdue(blocker) and (
            blocker.route_to != "programme_manager" or blocker.assignee_id != manager_id
        ):
            blocker.route_to = "programme_manager"
            blocker.assignee_id = manager_id
            audit(
                session,
                actor_id="system-sla-service",
                action="escalate_overdue",
                entity="blocker",
                entity_id=blocker.id,
                on_behalf_of=blocker.farmer_id,
                metadata={"escalatedTo": manager_id},
            )
            session.add(
                Notification(
                    recipient_id=manager_id,
                    title="Overdue blocker escalated",
                    body=f"Blocker {blocker.id} passed its configured response deadline.",
                    synthetic=True,
                )
            )
            # WhatsApp notification (no-op if phone not configured or synthetic)
            agripreneur = session.get(User, blocker.agripreneur_id)
            import asyncio
            try:
                asyncio.get_event_loop().run_until_complete(
                    notify_blocker_escalated(
                        getattr(agripreneur, "phone", None) if agripreneur else None,
                        blocker.id,
                        blocker.category,
                        blocker.urgency,
                    )
                )
            except Exception:
                pass
            escalated += 1
    return escalated


def _as_utc(value: datetime) -> datetime:
    return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value.astimezone(timezone.utc)


def _refresh_demand_groups(session: Session) -> None:
    orders = session.scalars(
        select(FieldOrder).where(FieldOrder.status.in_(("open", "committed")))
    ).all()
    grouped: dict[tuple[str, str, str, date], list[FieldOrder]] = defaultdict(list)
    for order in orders:
        grouped[(order.item, order.county, order.ward, week_start(order.needed_by))].append(order)

    existing_groups = session.scalars(select(DemandGroup)).all()
    by_key = {
        (item.item, item.county, item.ward, item.week_start): item
        for item in existing_groups
    }
    active_keys = set(grouped)
    for key, group_orders in grouped.items():
        item, county, ward, start = key
        demand_group = by_key.get(key)
        if demand_group is None:
            demand_group = DemandGroup(
                item=item,
                county=county,
                ward=ward,
                week_start=start,
                total_quantity=sum(order.quantity for order in group_orders),
                farmer_count=len({order.farmer_id for order in group_orders}),
                agripreneur_count=len({order.agripreneur_id for order in group_orders}),
                status="open",
            )
            session.add(demand_group)
            session.flush()
        demand_group.total_quantity = sum(order.quantity for order in group_orders)
        demand_group.farmer_count = len({order.farmer_id for order in group_orders})
        demand_group.agripreneur_count = len({order.agripreneur_id for order in group_orders})
        demand_group.status = (
            "open" if any(order.status == "open" for order in group_orders) else "committed"
        )
        for order in group_orders:
            order.demand_group_id = demand_group.id

    for item in existing_groups:
        if (item.item, item.county, item.ward, item.week_start) not in active_keys and item.status in {"open", "committed"}:
            item.status = "closed"


def create_router(
    factory: sessionmaker[Session],
    *,
    auth_secret: str,
    demo_auth_enabled: bool,
    registration_enabled: bool = False,
    production_mode: bool = False,
) -> APIRouter:
    router = APIRouter(prefix="/api/v1")
    get_db = session_dependency(factory)

    def get_actor(
        authorization: str | None = Header(default=None),
        ekyan_session: str | None = Cookie(default=None),
        session: Session = Depends(get_db),
    ) -> User:
        token = ekyan_session
        if authorization:
            scheme, separator, bearer = authorization.partition(" ")
            if scheme.lower() != "bearer" or not separator or not bearer:
                raise HTTPException(status_code=401, detail="A valid bearer access token is required.")
            token = bearer
        if not token:
            raise HTTPException(status_code=401, detail="A bearer access token is required.")
        try:
            claims = verify_token(token, secret=auth_secret)
        except InvalidToken as exc:
            raise HTTPException(status_code=401, detail=str(exc)) from exc
        actor = session.get(User, claims["sub"])
        if (actor is None or not actor.active or actor.role != claims["role"]
                or actor.approval_status != "approved"
                or claims.get("ver", 0) != actor.token_version):
            raise HTTPException(status_code=401, detail="The account is inactive or its role changed.")
        return actor

    def require_roles(*allowed: str) -> Callable:
        def dependency(actor: User = Depends(get_actor)) -> User:
            if actor.role not in allowed:
                raise HTTPException(status_code=403, detail="This role cannot perform that action.")
            return actor

        return dependency

    def owned_farmer(
        session: Session,
        farmer_id: str,
        actor_id: str,
    ) -> Farmer:
        farmer = session.get(Farmer, farmer_id)
        if farmer is None:
            farmer = session.scalar(select(Farmer).where(Farmer.client_id == farmer_id))
        if farmer is None or farmer.agripreneur_id != actor_id:
            raise HTTPException(status_code=404, detail="Farmer record was not found.")
        if not farmer.consent_to_record:
            raise HTTPException(status_code=403, detail="Farmer consent to record is not active.")
        return farmer

    def serialize_farmer(farmer: Farmer) -> dict:
        return {
            "id": farmer.id,
            "name": farmer.name,
            "phone": farmer.phone,
            "village": farmer.village,
            "ward": farmer.ward,
            "county": farmer.county,
            "gender": farmer.gender,
            "disability": farmer.disability,
            "consentToRecord": farmer.consent_to_record,
            "synthetic": farmer.synthetic,
            "createdAt": farmer.created_at.isoformat(),
        }

    def serialize_order(order: FieldOrder) -> dict:
        return {
            "id": order.id,
            "clientId": order.client_id,
            "farmerId": order.farmer_id,
            "item": order.item,
            "quantity": order.quantity,
            "neededBy": order.needed_by.isoformat(),
            "ward": order.ward,
            "status": order.status,
            "demandGroupId": order.demand_group_id,
            "actedBy": order.acted_by,
            "onBehalfOf": order.on_behalf_of,
            "synthetic": order.synthetic,
            "createdAt": order.created_at.isoformat(),
        }

    def serialize_transaction(item: BusinessTransaction) -> dict:
        return {
            "id": item.id,
            "clientId": item.client_id,
            "transactionType": item.transaction_type,
            "category": item.category,
            "amountKes": item.amount_kes,
            "counterparty": item.counterparty,
            "transactionDate": item.transaction_date.isoformat(),
            "paymentStatus": item.payment_status,
            "dueDate": item.due_date.isoformat() if item.due_date else None,
            "notes": item.notes,
            "evidenceStatus": item.evidence_status,
            "farmerId": item.farmer_id,
            "actedBy": item.acted_by,
            "onBehalfOf": item.on_behalf_of,
            "synthetic": item.synthetic,
        }

    def serialize_blocker(blocker: Blocker, *, redact_farmer: bool = False) -> dict:
        return {
            "id": blocker.id,
            "clientId": blocker.client_id,
            "farmerId": None if redact_farmer else blocker.farmer_id,
            "category": blocker.category,
            "description": None if redact_farmer else blocker.description,
            "ward": blocker.ward,
            "county": blocker.county,
            "urgency": blocker.urgency,
            "routeTo": blocker.route_to,
            "assigneeId": blocker.assignee_id,
            "status": blocker.status,
            "dueAt": blocker.due_at.isoformat(),
            "overdue": _is_overdue(blocker),
            "resolutionNote": blocker.resolution_note,
            "farmerConfirmed": blocker.farmer_confirmed,
            "createdAt": blocker.created_at.isoformat(),
            "synthetic": blocker.synthetic,
        }

    def issue_account_session(
        session: Session,
        actor: User,
        response: Response,
        *,
        demo_only: bool,
        native_client: bool = False,
    ) -> dict:
        token = issue_token(
            subject=actor.id,
            role=actor.role,
            secret=auth_secret,
            version=actor.token_version,
        )
        audit(session, actor_id=actor.id, action="session_issued", entity="session", entity_id=actor.id)
        session.commit()
        response.set_cookie(
            key="ekyan_session",
            value=token,
            httponly=True,
            secure=production_mode,
            samesite="none" if production_mode else "lax",
            max_age=3600,
            path="/api/v1",
        )
        result = {
            "tokenType": "Bearer",
            "expiresIn": 3600,
            "actor": {"id": actor.id, "displayName": actor.display_name, "role": actor.role},
            "synthetic": actor.synthetic,
            "demoOnly": demo_only,
            "active": True,
        }
        if native_client:
            result["accessToken"] = token
        return result

    @router.post("/auth/register", status_code=201)
    def register_account(
        request: RegisterRequest,
        response: Response,
        request_info: Request,
        session: Session = Depends(get_db),
    ) -> dict:
        if not registration_enabled:
            raise HTTPException(status_code=404, detail="Account registration is not enabled.")
        native_client = request_info.headers.get("x-ekyan-client") == "native"
        if native_client and (not request.terms_accepted or request.terms_version != "pilot-2026-11"):
            raise HTTPException(status_code=422, detail="Please accept the current Terms & Conditions before creating an account.")
        email = request.email.strip().lower()
        if not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", email):
            raise HTTPException(status_code=422, detail="Enter a valid email address.")
        if not production_mode and (
            not email.endswith(".invalid")
            or not request.display_name.strip().lower().startswith(("synthetic ", "demo "))
        ):
            raise HTTPException(
                status_code=422,
                detail="Local prototype accounts must use a Synthetic or Demo name and an .invalid email address.",
            )
        if session.scalar(select(User.id).where(User.email == email)):
            raise HTTPException(status_code=409, detail="An account with this email already exists.")
        is_self_service_role = request.role == "agripreneur"
        actor = User(
            id=new_id(),
            display_name=request.display_name.strip(),
            email=email,
            password_hash=hash_password(request.password),
            role=request.role,
            active=is_self_service_role,
            approval_status="approved" if is_self_service_role else "pending",
            synthetic=not production_mode,
        )
        session.add(actor)
        try:
            session.flush()
            audit(session, actor_id=actor.id, action="user_account_created", entity="user", entity_id=actor.id,
                  metadata={"role": actor.role})
            if native_client:
                audit(session, actor_id=actor.id, action="user_terms_accepted", entity="user", entity_id=actor.id,
                      metadata={"termsVersion": request.terms_version, "client": "native"})
            if not is_self_service_role:
                audit(
                    session,
                    actor_id=actor.id,
                    action="role_access_requested",
                    entity="user",
                    entity_id=actor.id,
                    metadata={"requestedRole": actor.role},
                )
                session.commit()
                return {
                    "status": "pending",
                    "active": False,
                    "message": "Your role request is awaiting administrator approval.",
                }
            return issue_account_session(
                session, actor, response, demo_only=actor.synthetic,
                native_client=request_info.headers.get("x-ekyan-client") == "native",
            )
        except IntegrityError as exc:
            session.rollback()
            raise HTTPException(status_code=409, detail="An account with this email already exists.") from exc

    @router.post("/auth/login")
    def login_account(
        request: LoginRequest,
        response: Response,
        request_info: Request,
        session: Session = Depends(get_db),
    ) -> dict:
        email = request.email.strip().lower()
        actor = session.scalar(select(User).where(User.email == email))
        if actor is None:
            verify_password(request.password, _DUMMY_PASSWORD_HASH)
            raise HTTPException(status_code=401, detail="Email or password is incorrect.")
        if not verify_password(request.password, actor.password_hash):
            raise HTTPException(status_code=401, detail="Email or password is incorrect.")
        if actor.approval_status == "pending":
            raise HTTPException(status_code=403, detail="Your account is awaiting administrator approval.")
        if actor.approval_status != "approved" or not actor.active:
            raise HTTPException(status_code=403, detail="This account is not active.")
        return issue_account_session(
            session, actor, response, demo_only=actor.synthetic,
            native_client=request_info.headers.get("x-ekyan-client") == "native",
        )

    @router.post("/auth/logout")
    def logout_account(
        response: Response,
        actor: User = Depends(get_actor),
        session: Session = Depends(get_db),
    ) -> dict:
        actor.token_version += 1
        audit(session, actor_id=actor.id, action="session_revoked", entity="session", entity_id=actor.id)
        session.commit()
        response.delete_cookie(
            key="ekyan_session", path="/api/v1", secure=production_mode,
            httponly=True, samesite="none" if production_mode else "lax",
        )
        return {"status": "signed_out"}

    @router.post("/auth/demo-session")
    def create_demo_session(
        request: DemoSessionRequest,
        response: Response,
        request_info: Request,
        session: Session = Depends(get_db),
    ) -> dict:
        if not demo_auth_enabled:
            raise HTTPException(status_code=404, detail="Demo sign-in is disabled.")
        user_id = DEMO_ROLE_IDS[request.role]
        actor = session.get(User, user_id)
        if actor is None or not actor.active or not actor.synthetic:
            raise HTTPException(status_code=503, detail="Synthetic demo account is unavailable.")
        return issue_account_session(
            session, actor, response, demo_only=True,
            native_client=request_info.headers.get("x-ekyan-client") == "native",
        )

    @router.get("/me")
    def get_me(actor: User = Depends(get_actor)) -> dict:
        return {
            "id": actor.id,
            "displayName": actor.display_name,
            "role": actor.role,
            "synthetic": actor.synthetic,
            "email": actor.email,
            "approvalStatus": actor.approval_status,
        }

    @router.get("/admin/user-requests")
    def list_user_requests(
        session: Session = Depends(get_db),
        actor: User = Depends(require_roles("administrator")),
    ) -> dict:
        users = session.scalars(
            select(User).where(User.approval_status == "pending").order_by(User.created_at)
        ).all()
        audit(session, actor_id=actor.id, action="pending_account_requests_viewed", entity="user_access_queue")
        session.commit()
        return {"users": [{"id": user.id, "displayName": user.display_name, "email": user.email,
                           "role": user.role, "createdAt": user.created_at.isoformat()} for user in users]}

    @router.post("/admin/user-requests/{user_id}")
    def review_user_request(
        user_id: str,
        request: UserApprovalRequest,
        session: Session = Depends(get_db),
        actor: User = Depends(require_roles("administrator")),
    ) -> dict:
        user = session.get(User, user_id)
        if user is None or user.approval_status != "pending":
            raise HTTPException(status_code=404, detail="Pending account request was not found.")
        user.approval_status = request.status
        user.active = request.status == "approved"
        audit(session, actor_id=actor.id, action=f"user_access_{request.status}", entity="user", entity_id=user.id,
              metadata={"role": user.role})
        session.commit()
        return {"id": user.id, "status": user.approval_status, "active": user.active}

    @router.get("/config")
    def get_configuration(
        session: Session = Depends(get_db),
        actor: User = Depends(get_actor),
    ) -> dict:
        items = session.scalars(
            select(ConfigItem).where(ConfigItem.active.is_(True)).order_by(ConfigItem.item_type, ConfigItem.name)
        ).all()
        grouped: dict[str, list[dict]] = defaultdict(list)
        for item in items:
            grouped[item.item_type].append(
                {
                    "id": item.id,
                    "name": item.name,
                    "county": item.county,
                    "routeTo": item.route_to,
                    "slaDays": item.sla_days,
                    "synthetic": item.synthetic,
                }
            )
        return {"items": grouped, "roles": list(ROLES), "pilot": {"county": "Busia", "valueChain": "Poultry"}}

    @router.post("/config/items", status_code=201)
    def add_configuration_item(
        request: ConfigItemCreate,
        session: Session = Depends(get_db),
        actor: User = Depends(require_roles("administrator")),
    ) -> dict:
        duplicate = session.scalar(
            select(ConfigItem).where(
                ConfigItem.item_type == request.item_type,
                ConfigItem.name.ilike(request.name.strip()),
                ConfigItem.active.is_(True),
            )
        )
        if duplicate:
            raise HTTPException(status_code=409, detail="That configuration item already exists.")
        if request.item_type == "blocker_category" and not request.route_to:
            raise HTTPException(status_code=422, detail="A blocker category requires a default route.")
        item = ConfigItem(
            item_type=request.item_type,
            name=request.name.strip(),
            county=request.county,
            route_to=request.route_to,
            sla_days=request.sla_days or (7 if request.item_type == "blocker_category" else None),
        )
        session.add(item)
        audit(session, actor_id=actor.id, action="create", entity="configuration", entity_id=item.id)
        session.commit()
        return {"id": item.id, "itemType": item.item_type, "name": item.name, "synthetic": item.synthetic}

    @router.post("/farmers", status_code=201)
    def create_farmer(
        request: FarmerCreate,
        session: Session = Depends(get_db),
        actor: User = Depends(require_roles("agripreneur", "administrator")),
    ) -> dict:
        if not request.consent_to_record:
            raise HTTPException(status_code=422, detail="Consent to record is required before saving a farmer.")
        if request.client_id:
            prior = session.scalar(select(Farmer).where(Farmer.client_id == request.client_id))
            if prior:
                if prior.agripreneur_id != actor.id:
                    raise HTTPException(status_code=409, detail="Client reference is already used.")
                return {"farmer": serialize_farmer(prior), "duplicate": True}
        farmer = Farmer(
            id=f"synthetic-farmer-{new_id()}",
            agripreneur_id=actor.id,
            client_id=request.client_id,
            name=request.name,
            phone=request.phone,
            village=request.village,
            ward=request.ward,
            county=request.county,
            gender=request.gender,
            disability=request.disability,
            consent_to_record=True,
        )
        session.add(farmer)
        audit(
            session,
            actor_id=actor.id,
            action="create",
            entity="farmer",
            entity_id=farmer.id,
            on_behalf_of=farmer.id,
        )
        session.commit()
        return {"farmer": serialize_farmer(farmer), "duplicate": False}

    @router.get("/farmers")
    def list_farmers(
        session: Session = Depends(get_db),
        actor: User = Depends(get_actor),
    ) -> dict:
        if actor.role in {"agripreneur"}:
            query = select(Farmer).where(Farmer.agripreneur_id == actor.id)
        elif actor.role in {"programme_manager", "administrator"}:
            query = select(Farmer)
        else:
            raise HTTPException(status_code=403, detail="This role cannot list farmer records.")
        return {"farmers": [serialize_farmer(item) for item in session.scalars(query.order_by(Farmer.created_at.desc())).all()]}

    @router.post("/orders", status_code=201)
    def create_order(
        request: OrderCreate,
        session: Session = Depends(get_db),
        actor: User = Depends(require_roles("agripreneur", "administrator")),
    ) -> dict:
        farmer = owned_farmer(session, request.farmer_id, actor.id)
        if request.client_id:
            prior = session.scalar(select(FieldOrder).where(FieldOrder.client_id == request.client_id))
            if prior:
                if prior.agripreneur_id != actor.id:
                    raise HTTPException(status_code=409, detail="Client reference is already used.")
                return {"order": serialize_order(prior), "duplicate": True}
        order = FieldOrder(
            client_id=request.client_id,
            farmer_id=farmer.id,
            agripreneur_id=actor.id,
            item=request.item,
            quantity=request.quantity,
            needed_by=request.needed_by,
            ward=request.ward,
            county=request.county,
            acted_by=actor.id,
            on_behalf_of=farmer.id,
        )
        session.add(order)
        audit(session, actor_id=actor.id, action="create", entity="order", entity_id=order.id, on_behalf_of=farmer.id)
        session.commit()
        return {"order": serialize_order(order), "duplicate": False}

    @router.get("/orders")
    def list_orders(
        session: Session = Depends(get_db),
        actor: User = Depends(get_actor),
    ) -> dict:
        if actor.role == "agripreneur":
            query = select(FieldOrder).where(FieldOrder.agripreneur_id == actor.id)
        elif actor.role in {"programme_manager", "administrator"}:
            query = select(FieldOrder)
        else:
            raise HTTPException(status_code=403, detail="This role cannot view individual orders.")
        orders = session.scalars(query.order_by(FieldOrder.created_at.desc())).all()
        return {"orders": [serialize_order(item) for item in orders]}

    @router.post("/transactions", status_code=201)
    def create_transaction(
        request: TransactionCreate,
        session: Session = Depends(get_db),
        actor: User = Depends(require_roles("agripreneur", "administrator")),
    ) -> dict:
        farmer = None
        if request.farmer_id:
            farmer = owned_farmer(session, request.farmer_id, actor.id)
        if request.client_id:
            prior = session.scalar(
                select(BusinessTransaction).where(BusinessTransaction.client_id == request.client_id)
            )
            if prior:
                if prior.agripreneur_id != actor.id:
                    raise HTTPException(status_code=409, detail="Client reference is already used.")
                return {"transaction": serialize_transaction(prior), "duplicate": True}
        item = BusinessTransaction(
            client_id=request.client_id,
            agripreneur_id=actor.id,
            farmer_id=farmer.id if farmer else None,
            transaction_type=request.transaction_type,
            category=request.category,
            amount_kes=request.amount_kes,
            counterparty=request.counterparty,
            transaction_date=request.transaction_date,
            payment_status=request.payment_status,
            due_date=request.due_date,
            notes=request.notes,
            acted_by=actor.id,
            on_behalf_of=farmer.id if farmer else None,
        )
        session.add(item)
        audit(
            session,
            actor_id=actor.id,
            action="create",
            entity="transaction",
            entity_id=item.id,
            on_behalf_of=farmer.id if farmer else None,
        )
        session.commit()
        return {"transaction": serialize_transaction(item), "duplicate": False}

    @router.patch("/transactions/{transaction_id}")
    def update_transaction(
        transaction_id: str,
        request: TransactionUpdate,
        session: Session = Depends(get_db),
        actor: User = Depends(require_roles("agripreneur")),
    ) -> dict:
        item = session.get(BusinessTransaction, transaction_id)
        if item is None or item.agripreneur_id != actor.id:
            raise HTTPException(status_code=404, detail="Business record was not found.")
        values = request.model_dump(exclude_unset=True)
        if not values:
            raise HTTPException(status_code=422, detail="Provide at least one field to update.")
        required_fields = {"transaction_type", "category", "amount_kes", "transaction_date", "payment_status"}
        if any(key in values and values[key] is None for key in required_fields):
            raise HTTPException(status_code=422, detail="Required business record fields cannot be cleared.")
        due_date = values.get("due_date", item.due_date)
        transaction_date = values.get("transaction_date", item.transaction_date)
        if due_date is not None and due_date < transaction_date:
            raise HTTPException(status_code=422, detail="Due date cannot be before the transaction date.")
        for key, value in values.items():
            setattr(item, key, value)
        audit(
            session,
            actor_id=actor.id,
            action="update",
            entity="transaction",
            entity_id=item.id,
            metadata={"fields": sorted(values)},
        )
        session.commit()
        return {"transaction": serialize_transaction(item)}

    @router.get("/transactions")
    def list_transactions(
        session: Session = Depends(get_db),
        actor: User = Depends(get_actor),
    ) -> dict:
        if actor.role == "agripreneur":
            query = select(BusinessTransaction).where(BusinessTransaction.agripreneur_id == actor.id)
        elif actor.role in {"programme_manager", "administrator"}:
            query = select(BusinessTransaction)
        else:
            raise HTTPException(status_code=403, detail="This role cannot view individual transactions.")
        return {
            "transactions": [
                serialize_transaction(item)
                for item in session.scalars(query.order_by(BusinessTransaction.transaction_date.desc())).all()
            ]
        }

    @router.post("/blockers/triage")
    def suggest_blocker_route(
        request: BlockerTriageRequest,
        actor: User = Depends(require_roles("agripreneur")),
    ) -> dict:
        suggestion = triage_blocker(request.description)
        return {**suggestion, "requiresHumanConfirmation": True}

    @router.post("/blockers", status_code=201)
    def create_blocker(
        request: BlockerCreate,
        session: Session = Depends(get_db),
        actor: User = Depends(require_roles("agripreneur", "administrator")),
    ) -> dict:
        if not request.confirmed_suggestion:
            raise HTTPException(status_code=422, detail="Confirm or edit the suggested category and urgency before routing.")
        farmer = owned_farmer(session, request.farmer_id, actor.id) if request.farmer_id else None
        if request.client_id:
            prior = session.scalar(select(Blocker).where(Blocker.client_id == request.client_id))
            if prior:
                if prior.agripreneur_id != actor.id:
                    raise HTTPException(status_code=409, detail="Client reference is already used.")
                return {"blocker": serialize_blocker(prior), "duplicate": True}
        route_to, sla_days = category_route(session, request.category)
        blocker = Blocker(
            client_id=request.client_id,
            farmer_id=farmer.id if farmer else None,
            agripreneur_id=actor.id,
            category=request.category,
            description=request.description,
            ward=request.ward,
            county=request.county,
            urgency=request.urgency,
            route_to=route_to,
            assignee_id=ROLE_USER_IDS.get(route_to),
            status="open",
            due_at=utcnow() + timedelta(days=sla_days),
            acted_by=actor.id,
            on_behalf_of=farmer.id if farmer else None,
        )
        session.add(blocker)
        audit(
            session,
            actor_id=actor.id,
            action="create_and_route",
            entity="blocker",
            entity_id=blocker.id,
            on_behalf_of=farmer.id if farmer else None,
            metadata={"routeTo": route_to, "slaDays": sla_days},
        )
        session.commit()
        return {"blocker": serialize_blocker(blocker), "duplicate": False}

    @router.get("/blockers")
    def list_blockers(
        session: Session = Depends(get_db),
        actor: User = Depends(get_actor),
    ) -> dict:
        _escalate_overdue(session)
        session.commit()
        if actor.role == "agripreneur":
            query = select(Blocker).where(Blocker.agripreneur_id == actor.id)
        elif actor.role == "extension_officer":
            query = select(Blocker).where(Blocker.assignee_id == actor.id)
        elif actor.role in {"programme_manager", "administrator"}:
            query = select(Blocker)
        elif actor.role in {"supplier", "lender", "buyer"}:
            query = select(Blocker).where(Blocker.route_to == actor.role)
        else:
            raise HTTPException(status_code=403, detail="This role cannot view the blocker queue.")
        blockers = session.scalars(query.order_by(Blocker.due_at.asc())).all()
        redact = actor.role in {"supplier", "lender", "buyer"}
        return {"blockers": [serialize_blocker(item, redact_farmer=redact) for item in blockers]}

    @router.patch("/blockers/{blocker_id}")
    def update_blocker(
        blocker_id: str,
        request: BlockerUpdate,
        session: Session = Depends(get_db),
        actor: User = Depends(get_actor),
    ) -> dict:
        blocker = session.get(Blocker, blocker_id)
        if blocker is None:
            raise HTTPException(status_code=404, detail="Blocker was not found.")
        is_owner = actor.role == "agripreneur" and blocker.agripreneur_id == actor.id
        can_resolve = actor.role in {"programme_manager", "administrator"} or blocker.assignee_id == actor.id
        if not is_owner and not can_resolve:
            raise HTTPException(status_code=403, detail="This role cannot update this blocker.")
        values = request.model_dump(exclude_unset=True)
        new_status = values.get("status", blocker.status)
        note = values.get("resolution_note", blocker.resolution_note)
        farmer_confirmed = values.get("farmer_confirmed", blocker.farmer_confirmed)
        if new_status in {"resolved", "cannot_resolve", "closed"} and not (note or "").strip():
            raise HTTPException(status_code=422, detail="A resolution note is required before closing this blocker.")
        if new_status == "resolved" and not farmer_confirmed:
            raise HTTPException(status_code=422, detail="Farmer or agripreneur confirmation is required to resolve this blocker.")
        if is_owner and values.get("assignee_id") is not None:
            raise HTTPException(status_code=403, detail="An agripreneur cannot reassign a blocker.")
        if "assignee_id" in values and actor.role not in {"programme_manager", "administrator"}:
            raise HTTPException(status_code=403, detail="Only programme managers can change blocker assignment.")
        for key, value in values.items():
            if key == "assignee_id":
                assignee = session.get(User, value) if value else None
                if value and assignee is None:
                    raise HTTPException(status_code=422, detail="Assignee does not exist.")
            setattr(blocker, key, value)
        if new_status == "resolved":
            blocker.resolved_at = utcnow()
        audit(
            session,
            actor_id=actor.id,
            action="update",
            entity="blocker",
            entity_id=blocker.id,
            on_behalf_of=blocker.farmer_id,
            metadata={"status": new_status},
        )
        session.commit()
        # WhatsApp notification on resolution
        if new_status == "resolved":
            agripreneur = session.get(User, blocker.agripreneur_id)
            import asyncio
            try:
                asyncio.get_event_loop().run_until_complete(
                    notify_blocker_resolved(
                        getattr(agripreneur, "phone", None) if agripreneur else None,
                        blocker.id,
                        blocker.category,
                        blocker.resolution_note or "",
                    )
                )
            except Exception:
                pass
        return {"blocker": serialize_blocker(blocker)}

    @router.post("/sync")
    def sync_offline_entries(
        request: SyncRequest,
        session: Session = Depends(get_db),
        actor: User = Depends(require_roles("agripreneur")),
    ) -> dict:
        results: list[dict] = []
        for entry in request.entries:
            prior_receipt = session.get(SyncReceipt, entry.client_id)
            if prior_receipt:
                if prior_receipt.actor_id == actor.id:
                    results.append({"clientId": entry.client_id, "status": "duplicate", **prior_receipt.result})
                else:
                    audit(
                        session,
                        actor_id=actor.id,
                        action="sync_conflict",
                        entity=entry.kind,
                        entity_id=entry.client_id,
                    )
                    session.commit()
                    results.append({"clientId": entry.client_id, "status": "conflict", "reason": "Client reference belongs to another actor."})
                continue

            try:
                payload = dict(entry.payload)
                payload["clientId"] = entry.client_id
                if entry.on_behalf_of:
                    payload.setdefault("farmerId", entry.on_behalf_of)
                if entry.kind == "farmer":
                    parsed = FarmerCreate.model_validate(payload)
                    if not parsed.consent_to_record:
                        raise ValueError("Consent to record is required.")
                    entity = Farmer(
                        id=f"synthetic-farmer-{new_id()}",
                        agripreneur_id=actor.id,
                        client_id=entry.client_id,
                        name=parsed.name,
                        phone=parsed.phone,
                        village=parsed.village,
                        ward=parsed.ward,
                        county=parsed.county,
                        gender=parsed.gender,
                        disability=parsed.disability,
                        consent_to_record=True,
                    )
                    entity_name = "farmer"
                elif entry.kind == "order":
                    parsed = OrderCreate.model_validate(payload)
                    farmer = owned_farmer(session, parsed.farmer_id, actor.id)
                    entity = FieldOrder(
                        client_id=entry.client_id,
                        farmer_id=farmer.id,
                        agripreneur_id=actor.id,
                        item=parsed.item,
                        quantity=parsed.quantity,
                        needed_by=parsed.needed_by,
                        ward=parsed.ward,
                        county=parsed.county,
                        acted_by=actor.id,
                        on_behalf_of=farmer.id,
                    )
                    entity_name = "order"
                elif entry.kind == "intention":
                    payload.pop("ward", None)
                    parsed = AdoptionIntentionCreate.model_validate(payload)
                    farmer = owned_farmer(session, parsed.farmer_id, actor.id)
                    entity = AdoptionIntention(
                        client_id=entry.client_id,
                        farmer_id=farmer.id,
                        agripreneur_id=actor.id,
                        practice=parsed.practice,
                        target_date=parsed.target_date,
                        acted_by=actor.id,
                        on_behalf_of=farmer.id,
                    )
                    entity_name = "adoption_intention"
                elif entry.kind == "blocker":
                    parsed = BlockerCreate.model_validate(payload)
                    if not parsed.confirmed_suggestion:
                        raise ValueError("Confirm the suggested blocker route before syncing.")
                    farmer = owned_farmer(session, parsed.farmer_id, actor.id) if parsed.farmer_id else None
                    route_to, sla_days = category_route(session, parsed.category)
                    entity = Blocker(
                        client_id=entry.client_id,
                        farmer_id=farmer.id if farmer else None,
                        agripreneur_id=actor.id,
                        category=parsed.category,
                        description=parsed.description,
                        ward=parsed.ward,
                        county=parsed.county,
                        urgency=parsed.urgency,
                        route_to=route_to,
                        assignee_id=ROLE_USER_IDS.get(route_to),
                        status="open",
                        due_at=utcnow() + timedelta(days=sla_days),
                        acted_by=actor.id,
                        on_behalf_of=farmer.id if farmer else None,
                    )
                    entity_name = "blocker"
                elif entry.kind == "blocker_update":
                    blocker_id = payload.get("blockerId")
                    expected_status = payload.get("expectedStatus")
                    if not isinstance(blocker_id, str) or not blocker_id:
                        raise ValueError("Blocker reference is required.")
                    blocker = session.get(Blocker, blocker_id)
                    if blocker is None or blocker.agripreneur_id != actor.id:
                        raise ValueError("Blocker was not found for this agripreneur.")
                    if blocker.status != expected_status:
                        raise ValueError("This blocker changed since it was saved on the phone. Refresh and review it.")
                    parsed = BlockerUpdate.model_validate({
                        key: payload[key]
                        for key in ("status", "resolutionNote", "farmerConfirmed")
                        if key in payload
                    })
                    if parsed.status is None:
                        raise ValueError("Choose a status before saving.")
                    values = parsed.model_dump(exclude_unset=True)
                    new_status = values["status"]
                    note = values.get("resolution_note", blocker.resolution_note)
                    farmer_confirmed = values.get("farmer_confirmed", blocker.farmer_confirmed)
                    if new_status in {"resolved", "cannot_resolve", "closed"} and not (note or "").strip():
                        raise ValueError("Add a follow-up note before closing this blocker.")
                    if new_status == "resolved" and not farmer_confirmed:
                        raise ValueError("Confirm with the farmer before marking this blocker resolved.")
                    for key, value in values.items():
                        setattr(blocker, key, value)
                    blocker.resolved_at = utcnow() if new_status == "resolved" else None
                    entity = blocker
                    entity_name = "blocker_update"
                elif entry.kind == "order_fulfilment":
                    order_id = payload.get("orderId")
                    expected_status = payload.get("expectedStatus")
                    if not isinstance(order_id, str) or not order_id:
                        raise ValueError("Input request reference is required.")
                    order = session.get(FieldOrder, order_id)
                    if order is None or order.agripreneur_id != actor.id:
                        raise ValueError("Input request was not found for this agripreneur.")
                    if expected_status != "committed" or order.status not in {"committed", "fulfilled"}:
                        raise ValueError("This input request is no longer awaiting receipt confirmation. Refresh the list.")
                    if order.status == "committed":
                        order.status = "fulfilled"
                    entity = order
                    entity_name = "order_fulfilment"
                else:
                    if "transactionDate" not in payload and "date" in payload:
                        payload["transactionDate"] = payload.pop("date")
                    parsed = TransactionCreate.model_validate(payload)
                    farmer = owned_farmer(session, parsed.farmer_id, actor.id) if parsed.farmer_id else None
                    entity = BusinessTransaction(
                        client_id=entry.client_id,
                        agripreneur_id=actor.id,
                        farmer_id=farmer.id if farmer else None,
                        transaction_type=parsed.transaction_type,
                        category=parsed.category,
                        amount_kes=parsed.amount_kes,
                        counterparty=parsed.counterparty,
                        transaction_date=parsed.transaction_date,
                        payment_status=parsed.payment_status,
                        due_date=parsed.due_date,
                        notes=parsed.notes,
                        acted_by=actor.id,
                        on_behalf_of=farmer.id if farmer else None,
                    )
                    entity_name = "transaction"

                with session.begin_nested():
                    session.add(entity)
                    session.flush()
                    audit(
                        session,
                        actor_id=actor.id,
                        action="sync_update" if entry.kind in {"blocker_update", "order_fulfilment"} else "sync_create",
                        entity=entity_name,
                        entity_id=entity.id,
                        on_behalf_of=getattr(entity, "on_behalf_of", None),
                        metadata={"clientId": entry.client_id},
                    )
                    receipt_result = {"entityId": entity.id, "kind": entity_name}
                    session.add(
                        SyncReceipt(
                            client_id=entry.client_id,
                            actor_id=actor.id,
                            entity_id=entity.id,
                            kind=entity_name,
                            result=receipt_result,
                        )
                    )
                    session.flush()
                session.commit()
                results.append({"clientId": entry.client_id, "status": "created", **receipt_result})
            except (ValidationError, ValueError, HTTPException, IntegrityError) as exc:
                session.rollback()
                if isinstance(exc, HTTPException):
                    reason = str(exc.detail)
                elif isinstance(exc, ValidationError):
                    reason = exc.errors(include_url=False)[0]["msg"]
                else:
                    reason = str(exc) or "Entry could not be saved."
                results.append({"clientId": entry.client_id, "status": "rejected", "reason": reason})
        return {"results": results, "synthetic": True}

    @router.get("/demand-groups")
    def list_demand_groups(
        session: Session = Depends(get_db),
        actor: User = Depends(require_roles("agripreneur", "supplier", "programme_manager", "administrator")),
    ) -> dict:
        _refresh_demand_groups(session)
        session.commit()
        groups = session.scalars(
            select(DemandGroup).where(DemandGroup.status.in_(("open", "committed")))
        ).all()
        commitments = session.scalars(select(SupplierCommitment)).all()
        committed_quantity: dict[str, float] = defaultdict(float)
        for item in commitments:
            if item.status == "committed":
                committed_quantity[item.demand_group_id] += item.quantity
        visible = []
        for group in groups:
            remaining = max(0.0, group.total_quantity - committed_quantity[group.id])
            if actor.role == "agripreneur":
                owned_order = session.scalar(
                    select(FieldOrder.id).where(
                        FieldOrder.agripreneur_id == actor.id,
                        FieldOrder.demand_group_id == group.id,
                    )
                )
                if not owned_order:
                    continue
            visible.append(
                {
                    "id": group.id,
                    "item": group.item,
                    "county": group.county,
                    "ward": group.ward,
                    "weekStart": group.week_start.isoformat(),
                    "totalQuantity": group.total_quantity,
                    "remainingQuantity": remaining,
                    "farmerCount": group.farmer_count,
                    "agripreneurCount": group.agripreneur_count,
                    "status": group.status,
                    "synthetic": group.synthetic,
                }
            )
        return {"demandGroups": visible}

    @router.post("/demand-groups/{group_id}/commitments", status_code=201)
    def create_supplier_commitment(
        group_id: str,
        request: SupplierCommitmentCreate,
        session: Session = Depends(get_db),
        actor: User = Depends(require_roles("supplier")),
    ) -> dict:
        group = session.get(DemandGroup, group_id)
        if group is None or group.status not in {"open", "committed"}:
            raise HTTPException(status_code=404, detail="Open demand group was not found.")
        if not request.quality_evidence_ref.casefold().startswith("synthetic-"):
            raise HTTPException(status_code=422, detail="Synthetic-only mode accepts synthetic evidence references only.")
        existing = session.scalars(
            select(SupplierCommitment).where(
                SupplierCommitment.demand_group_id == group.id,
                SupplierCommitment.status == "committed",
            )
        ).all()
        committed = sum(item.quantity for item in existing)
        remaining = max(0.0, group.total_quantity - committed)
        if request.quantity > remaining:
            raise HTTPException(status_code=422, detail=f"Commitment exceeds remaining pooled quantity ({remaining:g}).")
        commitment = SupplierCommitment(
            demand_group_id=group.id,
            supplier_id=actor.id,
            quantity=request.quantity,
            unit_price_kes=request.unit_price_kes,
            quality_evidence_ref=request.quality_evidence_ref,
            delivery_date=request.delivery_date,
        )
        session.add(commitment)
        if committed + request.quantity >= group.total_quantity:
            group.status = "committed"
            orders = session.scalars(
                select(FieldOrder).where(
                    FieldOrder.demand_group_id == group.id,
                    FieldOrder.status == "open",
                )
            ).all()
            recipients = {order.agripreneur_id for order in orders}
            for order in orders:
                order.status = "committed"
            for recipient_id in recipients:
                session.add(
                    Notification(
                        recipient_id=recipient_id,
                        title="Supplier commitment received",
                        body=f"A supplier committed to pooled demand {group.id}. Review the proposed price and delivery date.",
                    )
                )
        audit(
            session,
            actor_id=actor.id,
            action="create",
            entity="supplier_commitment",
            entity_id=commitment.id,
            metadata={"demandGroupId": group.id, "quantity": request.quantity},
        )
        session.commit()
        # WhatsApp notifications to agripreneurs in this demand group
        notified_agripreneurs: set[str] = set()
        for order in session.scalars(
            select(FieldOrder).where(FieldOrder.demand_group_id == group.id)
        ).all():
            if order.agripreneur_id not in notified_agripreneurs:
                notified_agripreneurs.add(order.agripreneur_id)
                agripreneur = session.get(User, order.agripreneur_id)
                import asyncio
                try:
                    asyncio.get_event_loop().run_until_complete(
                        notify_supplier_commitment(
                            getattr(agripreneur, "phone", None) if agripreneur else None,
                            group.item,
                            request.quantity,
                            request.unit_price_kes,
                            request.delivery_date.isoformat(),
                        )
                    )
                except Exception:
                    pass
        return {
            "commitment": {
                "id": commitment.id,
                "demandGroupId": group.id,
                "quantity": commitment.quantity,
                "unitPriceKes": commitment.unit_price_kes,
                "qualityEvidenceRef": commitment.quality_evidence_ref,
                "deliveryDate": commitment.delivery_date.isoformat(),
                "status": commitment.status,
                "synthetic": commitment.synthetic,
            }
        }

    @router.post("/orders/{order_id}/fulfil")
    def confirm_order_fulfilment(
        order_id: str,
        session: Session = Depends(get_db),
        actor: User = Depends(require_roles("agripreneur")),
    ) -> dict:
        order = session.get(FieldOrder, order_id)
        if order is None or order.agripreneur_id != actor.id:
            raise HTTPException(status_code=404, detail="Order was not found.")
        if order.status != "committed":
            raise HTTPException(status_code=409, detail="Only committed orders can be confirmed as fulfilled.")
        order.status = "fulfilled"
        audit(session, actor_id=actor.id, action="confirm_fulfilment", entity="order", entity_id=order.id, on_behalf_of=order.farmer_id)
        # WhatsApp notification on fulfilment
        agripreneur = session.get(User, order.agripreneur_id)
        import asyncio
        try:
            asyncio.get_event_loop().run_until_complete(
                notify_order_fulfilled(
                    getattr(agripreneur, "phone", None) if agripreneur else None,
                    order.item,
                    order.quantity,
                )
            )
        except Exception:
            pass
        group = session.get(DemandGroup, order.demand_group_id) if order.demand_group_id else None
        if group:
            remaining_orders = session.scalar(
                select(FieldOrder.id).where(
                    FieldOrder.demand_group_id == group.id,
                    FieldOrder.status != "fulfilled",
                )
            )
            if remaining_orders is None:
                group.status = "fulfilled"
        session.commit()
        return {"order": serialize_order(order)}

    @router.get("/notifications")
    def list_notifications(
        session: Session = Depends(get_db),
        actor: User = Depends(get_actor),
    ) -> dict:
        notifications = session.scalars(
            select(Notification)
            .where(Notification.recipient_id == actor.id)
            .order_by(Notification.created_at.desc())
            .limit(100)
        ).all()
        return {
            "notifications": [
                {
                    "id": item.id,
                    "title": item.title,
                    "body": item.body,
                    "readAt": item.read_at.isoformat() if item.read_at else None,
                    "createdAt": item.created_at.isoformat(),
                    "synthetic": item.synthetic,
                }
                for item in notifications
            ]
        }

    @router.get("/profiles/me")
    def get_own_profile(
        session: Session = Depends(get_db),
        actor: User = Depends(require_roles("agripreneur")),
    ) -> dict:
        profile = readiness_profile(session, actor.id)
        audit(session, actor_id=actor.id, action="view", entity="finance_profile", entity_id=actor.id)
        session.commit()
        return profile

    @router.post("/profiles/me/application-pack")
    def download_application_pack(
        request: ApplicationPackRequest,
        session: Session = Depends(get_db),
        actor: User = Depends(require_roles("agripreneur")),
    ) -> Response:
        profile = readiness_profile(session, actor.id)
        period_start = date.fromisoformat(profile["period"]["from"])
        transactions = session.scalars(
            select(BusinessTransaction)
            .where(
                BusinessTransaction.agripreneur_id == actor.id,
                BusinessTransaction.transaction_date >= period_start,
            )
            .order_by(BusinessTransaction.transaction_date.asc(), BusinessTransaction.created_at.asc())
        ).all()
        output = io.StringIO(newline="")
        writer = csv.writer(output)
        writer.writerow(["EKYAN Connect finance preparation summary", "Synthetic demo only"])
        writer.writerow(["This is not a credit score, approval, or lender decision.", "The export is not sent to any lender."])
        writer.writerow(["Profile reference", profile["agripreneur_id"]])
        writer.writerow(["Purpose", request.purpose.replace("_", " ")])
        writer.writerow(["Requested amount (KES)", request.requested_amount_kes])
        writer.writerow(["Requested term (months)", request.term_months])
        writer.writerow(["Record period", f'{profile["period"]["from"]} to {profile["period"]["to"]}'])
        writer.writerow(["Recorded income (KES)", profile["business"]["revenue_kes"]])
        writer.writerow(["Recorded operating expenses (KES)", profile["business"]["expenses_kes"]])
        writer.writerow(["Operating surplus estimate (KES)", profile["business"]["operating_surplus_kes"]])
        writer.writerow(["Unpaid income (KES)", profile["business"]["unpaid_income_kes"]])
        writer.writerow(["Unpaid expenses (KES)", profile["business"]["unpaid_expenses_kes"]])
        writer.writerow(["Recorded borrowing estimate (KES)", profile["business"]["existing_obligations_kes"]])
        writer.writerow(["Record coverage (months with entries)", profile["record_coverage"]["months_with_entries"]])
        writer.writerow(["Months in reporting period", profile["record_coverage"]["months_in_period"]])
        writer.writerow(["Evidence status", "Self-reported unless explicitly verified"])
        if request.include_transactions:
            writer.writerow([])
            writer.writerow(
                ["Date", "Record type", "Category", "Amount (KES)", "Payment status", "Due date", "Evidence status"]
            )
            for item in transactions:
                writer.writerow(
                    [
                        item.transaction_date.isoformat(),
                        item.transaction_type,
                        item.category,
                        item.amount_kes,
                        item.payment_status,
                        item.due_date.isoformat() if item.due_date else "",
                        item.evidence_status,
                    ]
                )
        audit(
            session,
            actor_id=actor.id,
            action="export",
            entity="finance_application_pack",
            entity_id=actor.id,
            metadata={
                "purpose": request.purpose,
                "includeTransactions": request.include_transactions,
            },
        )
        session.commit()
        return Response(
            content=output.getvalue(),
            media_type="text/csv",
            headers={
                "Content-Disposition": f'attachment; filename="ekyan-finance-summary-{actor.id}.csv"'
            },
        )

    @router.post("/consents", status_code=201)
    def grant_consent(
        request: ConsentCreate,
        session: Session = Depends(get_db),
        actor: User = Depends(require_roles("agripreneur")),
    ) -> dict:
        lender = session.get(User, request.lender_id)
        if lender is None or lender.role != "lender" or not lender.active:
            raise HTTPException(status_code=422, detail="Select an active lender organisation.")
        expires_at = request.expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        now = utcnow()
        if expires_at <= now or expires_at > now + timedelta(days=90):
            raise HTTPException(status_code=422, detail="Consent must expire within the next 90 days.")
        consent = Consent(
            agripreneur_id=actor.id,
            lender_id=lender.id,
            purpose=request.purpose,
            expires_at=expires_at,
        )
        session.add(consent)
        audit(
            session,
            actor_id=actor.id,
            action="grant",
            entity="consent",
            entity_id=consent.id,
            metadata={"lenderId": lender.id, "purpose": consent.purpose, "expiresAt": expires_at.isoformat()},
        )
        session.commit()
        import asyncio
        try:
            asyncio.get_event_loop().run_until_complete(
                notify_consent_granted(
                    getattr(actor, "phone", None),
                    lender.id,
                    consent.purpose,
                    expires_at.isoformat(),
                )
            )
        except Exception:
            pass
        return {
            "consent": {
                "id": consent.id,
                "lenderId": consent.lender_id,
                "purpose": consent.purpose,
                "grantedAt": consent.granted_at.isoformat(),
                "expiresAt": consent.expires_at.isoformat(),
                "revokedAt": None,
                "synthetic": consent.synthetic,
            }
        }

    @router.get("/consents")
    def list_own_consents(
        session: Session = Depends(get_db),
        actor: User = Depends(require_roles("agripreneur")),
    ) -> dict:
        consents = session.scalars(
            select(Consent).where(Consent.agripreneur_id == actor.id).order_by(Consent.granted_at.desc())
        ).all()
        now = utcnow()
        return {
            "consents": [
                {
                    "id": item.id,
                    "lenderId": item.lender_id,
                    "purpose": item.purpose,
                    "grantedAt": item.granted_at.isoformat(),
                    "expiresAt": item.expires_at.isoformat(),
                    "revokedAt": item.revoked_at.isoformat() if item.revoked_at else None,
                    "active": item.revoked_at is None and _as_utc(item.expires_at) > now,
                    "synthetic": item.synthetic,
                }
                for item in consents
            ]
        }

    @router.delete("/consents/{consent_id}")
    def revoke_consent(
        consent_id: str,
        session: Session = Depends(get_db),
        actor: User = Depends(require_roles("agripreneur")),
    ) -> dict:
        consent = session.get(Consent, consent_id)
        if consent is None or consent.agripreneur_id != actor.id:
            raise HTTPException(status_code=404, detail="Consent was not found.")
        if consent.revoked_at is None:
            consent.revoked_at = utcnow()
            audit(session, actor_id=actor.id, action="revoke", entity="consent", entity_id=consent.id)
            session.commit()
            import asyncio
            try:
                asyncio.get_event_loop().run_until_complete(
                    notify_consent_revoked(
                        getattr(actor, "phone", None),
                        consent.lender_id,
                    )
                )
            except Exception:
                pass
        return {"id": consent.id, "revoked": True, "revokedAt": consent.revoked_at.isoformat()}

    @router.get("/profiles/consented")
    def list_consented_profiles(
        session: Session = Depends(get_db),
        actor: User = Depends(require_roles("lender")),
    ) -> dict:
        consents = session.scalars(
            select(Consent).where(
                Consent.lender_id == actor.id,
                Consent.revoked_at.is_(None),
                Consent.purpose.in_(("finance_readiness_review", "input_finance_assessment")),
            )
        ).all()
        profiles = []
        now = utcnow()
        for consent in consents:
            if _as_utc(consent.expires_at) <= now:
                continue
            user = session.get(User, consent.agripreneur_id)
            if not user or not user.active:
                continue
            profile = readiness_profile(session, user.id)
            profile["consent"] = {
                "id": consent.id,
                "purpose": consent.purpose,
                "expiresAt": consent.expires_at.isoformat(),
            }
            audit(
                session,
                actor_id=actor.id,
                action="view",
                entity="finance_profile",
                entity_id=user.id,
                metadata={"consentId": consent.id},
            )
            profiles.append(profile)
        session.commit()
        return {"profiles": profiles, "synthetic": True}

    @router.get("/profiles/{agripreneur_id}")
    def get_consented_profile(
        agripreneur_id: str,
        session: Session = Depends(get_db),
        actor: User = Depends(require_roles("lender")),
    ) -> dict:
        now = utcnow()
        consents = session.scalars(
            select(Consent).where(
                Consent.agripreneur_id == agripreneur_id,
                Consent.lender_id == actor.id,
                Consent.revoked_at.is_(None),
                Consent.purpose.in_(("finance_readiness_review", "input_finance_assessment")),
            )
        ).all()
        active = next((item for item in consents if _as_utc(item.expires_at) > now), None)
        if active is None:
            audit(
                session,
                actor_id=actor.id,
                action="denied_profile_view",
                entity="finance_profile",
                entity_id=agripreneur_id,
            )
            session.commit()
            raise HTTPException(status_code=403, detail="Active purpose-specific consent is required.")
        profile = readiness_profile(session, agripreneur_id)
        profile["consent"] = {
            "id": active.id,
            "purpose": active.purpose,
            "expiresAt": active.expires_at.isoformat(),
        }
        audit(
            session,
            actor_id=actor.id,
            action="view",
            entity="finance_profile",
            entity_id=agripreneur_id,
            metadata={"consentId": active.id},
        )
        session.commit()
        return profile

    @router.get("/kpis/definitions")
    def get_kpi_definitions(
        actor: User = Depends(require_roles("programme_manager", "administrator")),
    ) -> dict:
        return {"definitions": KPI_DEFINITIONS}

    @router.get("/kpi")
    def get_kpis(
        start: date | None = Query(default=None),
        end: date | None = Query(default=None),
        county: str | None = Query(default=None),
        value_chain: str | None = Query(default=None, alias="valueChain"),
        gender: str | None = Query(default=None),
        session: Session = Depends(get_db),
        actor: User = Depends(require_roles("programme_manager", "administrator")),
    ) -> dict:
        return {
            "definitions": KPI_DEFINITIONS,
            "values": _build_kpi_values(
                session,
                start=start,
                end=end,
                county=county,
                value_chain=value_chain,
                gender=gender,
            ),
            "filters": {
                "start": start.isoformat() if start else None,
                "end": end.isoformat() if end else None,
                "county": county,
                "valueChain": value_chain,
                "gender": gender,
            },
            "synthetic": True,
        }

    @router.get("/kpi/export.csv")
    def export_kpis(
        start: date | None = Query(default=None),
        end: date | None = Query(default=None),
        county: str | None = Query(default=None),
        value_chain: str | None = Query(default=None, alias="valueChain"),
        gender: str | None = Query(default=None),
        session: Session = Depends(get_db),
        actor: User = Depends(require_roles("programme_manager", "administrator")),
    ) -> Response:
        values = _build_kpi_values(
            session,
            start=start,
            end=end,
            county=county,
            value_chain=value_chain,
            gender=gender,
        )
        output = io.StringIO(newline="")
        writer = csv.writer(output)
        writer.writerow(["id", "name", "value", "unit", "source", "synthetic"])
        for definition in KPI_DEFINITIONS:
            value = values[definition["id"]]
            writer.writerow(
                [
                    definition["id"],
                    definition["name"],
                    "" if value["value"] is None else value["value"],
                    value["unit"],
                    definition["source"],
                    "true",
                ]
            )
        audit(
            session,
            actor_id=actor.id,
            action="export",
            entity="kpi",
            metadata={"start": start.isoformat() if start else None, "end": end.isoformat() if end else None},
        )
        session.commit()
        return Response(
            output.getvalue(),
            media_type="text/csv; charset=utf-8",
            headers={"Content-Disposition": 'attachment; filename="ekyan-kpis.csv"'},
        )

    @router.get("/data-quality")
    def get_data_quality(
        session: Session = Depends(get_db),
        actor: User = Depends(require_roles("programme_manager", "administrator")),
    ) -> dict:
        result = _run_data_quality(session)
        audit(session, actor_id=actor.id, action="run", entity="data_quality", metadata=result["summary"])
        session.commit()
        return result

    @router.post("/programme-costs", status_code=201)
    def add_programme_cost(
        request: ProgrammeCostCreate,
        session: Session = Depends(get_db),
        actor: User = Depends(require_roles("administrator")),
    ) -> dict:
        if request.period_end < request.period_start:
            raise HTTPException(status_code=422, detail="Period end must be on or after period start.")
        cost = ProgrammeCost(
            period_start=request.period_start,
            period_end=request.period_end,
            county=request.county,
            amount_kes=request.amount_kes,
            created_by=actor.id,
        )
        session.add(cost)
        audit(session, actor_id=actor.id, action="create", entity="programme_cost", entity_id=cost.id)
        session.commit()
        return {
            "id": cost.id,
            "periodStart": cost.period_start.isoformat(),
            "periodEnd": cost.period_end.isoformat(),
            "amountKes": cost.amount_kes,
            "synthetic": cost.synthetic,
        }

    @router.get("/fairness")
    def get_fairness_report(
        session: Session = Depends(get_db),
        actor: User = Depends(require_roles("programme_manager", "administrator")),
    ) -> dict:
        agripreneurs = session.scalars(
            select(User).where(User.role == "agripreneur", User.active.is_(True))
        ).all()
        groups: dict[str, list[float]] = defaultdict(list)
        for user in agripreneurs:
            profile = readiness_profile(session, user.id)
            coverage = profile["record_coverage"]
            percent = coverage["months_with_entries"] / coverage["months_in_period"] * 100
            groups[f"gender:{user.gender}"].append(percent)
            groups[f"disability:{user.disability}"].append(percent)
        return {
            "groups": {
                key: {
                    "count": len(scores),
                    "meanRecordCoveragePercent": round(sum(scores) / len(scores), 2) if scores else None,
                    "minimumRecordCoveragePercent": min(scores) if scores else None,
                    "maximumRecordCoveragePercent": max(scores) if scores else None,
                }
                for key, scores in sorted(groups.items())
            },
            "disclaimer": "Synthetic inclusion monitoring only; protected characteristics are not individual assessment inputs.",
            "synthetic": True,
        }

    @router.post("/admin/sla/sweep")
    def run_sla_sweep(
        session: Session = Depends(get_db),
        actor: User = Depends(require_roles("programme_manager", "administrator")),
    ) -> dict:
        count = _escalate_overdue(session)
        audit(session, actor_id=actor.id, action="run", entity="blocker_sla_sweep", metadata={"escalated": count})
        session.commit()
        return {"escalated": count, "checkedAt": utcnow().isoformat(), "synthetic": True}

    return router


def _build_kpi_values(
    session: Session,
    *,
    start: date | None,
    end: date | None,
    county: str | None,
    value_chain: str | None,
    gender: str | None,
) -> dict[str, dict]:
    if start and end and end < start:
        raise HTTPException(status_code=422, detail="Period end must be on or after period start.")
    if value_chain and value_chain.casefold() != "poultry":
        empty = True
    else:
        empty = False

    farmers = session.scalars(select(Farmer)).all()
    if county:
        farmers = [item for item in farmers if item.county.casefold() == county.casefold()]
    if gender:
        farmers = [item for item in farmers if item.gender.casefold() == gender.casefold()]
    farmer_ids = {item.id for item in farmers}

    intentions = session.scalars(select(AdoptionIntention)).all()
    orders = session.scalars(select(FieldOrder)).all()
    blockers = session.scalars(select(Blocker)).all()
    transactions = session.scalars(select(BusinessTransaction)).all()
    if empty:
        intentions, orders, blockers, transactions, farmers = [], [], [], [], []
        farmer_ids = set()
    intentions = [item for item in intentions if item.farmer_id in farmer_ids]
    if county:
        orders = [item for item in orders if item.county.casefold() == county.casefold()]
        blockers = [item for item in blockers if item.county.casefold() == county.casefold()]
    if gender:
        orders = [item for item in orders if item.farmer_id in farmer_ids]
        blockers = [item for item in blockers if item.farmer_id in farmer_ids]
        transactions = [item for item in transactions if item.farmer_id in farmer_ids]
    if start:
        intentions = [item for item in intentions if item.created_at.date() >= start]
        orders = [item for item in orders if item.created_at.date() >= start]
        blockers = [item for item in blockers if item.created_at.date() >= start]
        transactions = [item for item in transactions if item.transaction_date >= start]
    if end:
        intentions = [item for item in intentions if item.created_at.date() <= end]
        orders = [item for item in orders if item.created_at.date() <= end]
        blockers = [item for item in blockers if item.created_at.date() <= end]
        transactions = [item for item in transactions if item.transaction_date <= end]

    resolved = [item for item in blockers if item.status == "resolved" and item.resolved_at]
    resolution_hours = [
        (_as_utc(item.resolved_at) - _as_utc(item.created_at)).total_seconds() / 3600
        for item in resolved
    ]
    fulfilled = [item for item in orders if item.status == "fulfilled"]
    intention_farmer_ids = {item.farmer_id for item in intentions}
    ordered_farmer_ids = intention_farmer_ids.intersection(item.farmer_id for item in orders)
    action_farmer_ids = intention_farmer_ids.intersection(item.farmer_id for item in fulfilled)
    demand_groups = session.scalars(
        select(DemandGroup).where(DemandGroup.status.in_(("open", "committed")))
    ).all()
    if county:
        demand_groups = [item for item in demand_groups if item.county.casefold() == county.casefold()]
    if start:
        demand_groups = [item for item in demand_groups if item.week_start >= start]
    if end:
        demand_groups = [item for item in demand_groups if item.week_start <= end]
    if empty:
        demand_groups = []
    demand_group_ids = {item.id for item in demand_groups}
    groups_with_commitment = {
        item.demand_group_id
        for item in session.scalars(select(SupplierCommitment)).all()
        if item.status == "committed" and item.demand_group_id in demand_group_ids
    }
    active_agripreneurs = session.scalars(
        select(User).where(User.role == "agripreneur", User.active.is_(True))
    ).all()
    if gender:
        active_agripreneurs = [item for item in active_agripreneurs if item.gender.casefold() == gender.casefold()]
    if county:
        county_agripreneur_ids = {item.agripreneur_id for item in farmers}
        active_agripreneurs = [item for item in active_agripreneurs if item.id in county_agripreneur_ids]
    if empty:
        active_agripreneurs = []
    profile_transactions = session.scalars(select(BusinessTransaction)).all()
    if start:
        profile_transactions = [item for item in profile_transactions if item.transaction_date >= start]
    if end:
        profile_transactions = [item for item in profile_transactions if item.transaction_date <= end]
    covered_profiles = 0
    for user in active_agripreneurs:
        user_transactions = [
            item for item in profile_transactions if item.agripreneur_id == user.id
        ]
        has_income = any(
            item.transaction_type in {"sale", "service", "other_income"}
            for item in user_transactions
        )
        has_expense = any(
            item.transaction_type in {"purchase", "other_expense"}
            for item in user_transactions
        )
        if has_income and has_expense:
            covered_profiles += 1
    women = sum(1 for user in active_agripreneurs if user.gender == "woman") + sum(1 for farmer in farmers if farmer.gender == "woman")
    participant_count = len(active_agripreneurs) + len(farmers)
    quality = _run_data_quality(session)["summary"]["score"]
    costs = session.scalars(select(ProgrammeCost)).all()
    if start:
        costs = [item for item in costs if item.period_end >= start]
    if end:
        costs = [item for item in costs if item.period_start <= end]
    if county:
        costs = [item for item in costs if not item.county or item.county.casefold() == county.casefold()]
    outcomes = len(resolved) + len(fulfilled)
    cost_per_outcome = sum(item.amount_kes for item in costs) / outcomes if costs and outcomes else None
    values = {
        "K1": {"value": len(blockers), "unit": "count"},
        "K2": {"value": round(len(resolved) / len(blockers) * 100, 2) if blockers else None, "unit": "percent"},
        "K3": {"value": round(median(resolution_hours), 2) if resolution_hours else None, "unit": "hours"},
        "K4": {"value": round(len(fulfilled) / len(orders) * 100, 2) if orders else None, "unit": "percent"},
        "K5": {
            "value": round(len(groups_with_commitment) / len(demand_groups) * 100, 2) if demand_groups and not gender else None,
            "unit": "percent",
            **({"unavailableReason": "Demand groups do not yet retain gender-disaggregated commitments."} if gender else {}),
        },
        "K6": {
            "value": round(len(action_farmer_ids) / len(intention_farmer_ids) * 100, 2) if intention_farmer_ids else None,
            "unit": "percent",
            "numerator": len(action_farmer_ids),
            "denominator": len(intention_farmer_ids),
            "funnel": {
                "intentionFarmers": len(intention_farmer_ids),
                "orderedFarmers": len(ordered_farmer_ids),
                "fulfilledFarmers": len(action_farmer_ids),
                "adoptionVerified": None,
            },
            **({"unavailableReason": "No adoption intentions are recorded for this reporting period."} if not intention_farmer_ids else {}),
            "interpretationNote": "A fulfilled order is a service-action proxy; it does not verify that a farming practice was adopted.",
        },
        "K7": {
            "value": round(covered_profiles / len(active_agripreneurs) * 100, 2) if active_agripreneurs else None,
            "unit": "percent",
            "numerator": covered_profiles,
            "denominator": len(active_agripreneurs),
        },
        "K8": {"value": round(len(farmers) / len(active_agripreneurs), 2) if active_agripreneurs else None, "unit": "farmers per agripreneur"},
        "K9": {"value": round(women / participant_count * 100, 2) if participant_count else None, "unit": "percent"},
        "K10": {"value": round(cost_per_outcome, 2) if cost_per_outcome is not None else None, "unit": "KES per verified outcome"},
        "K11": {"value": quality, "unit": "percent"},
    }
    return {
        key: {**value, "synthetic": True, "source": next(item["source"] for item in KPI_DEFINITIONS if item["id"] == key)}
        for key, value in values.items()
    }


def _run_data_quality(session: Session) -> dict:
    exceptions: list[dict] = []
    farmers = session.scalars(select(Farmer)).all()
    intentions = session.scalars(select(AdoptionIntention)).all()
    orders = session.scalars(select(FieldOrder)).all()
    blockers = session.scalars(select(Blocker)).all()
    transactions = session.scalars(select(BusinessTransaction)).all()
    checked = 0
    passed = 0
    for kind, records, required in (
        ("farmer", farmers, ("name", "village", "ward", "county")),
        ("adoption_intention", intentions, ("practice", "target_date")),
        ("order", orders, ("item", "quantity", "ward")),
        ("blocker", blockers, ("category", "description", "ward")),
        ("transaction", transactions, ("transaction_type", "amount_kes", "transaction_date")),
    ):
        for record in records:
            checked += 1
            missing = [field for field in required if getattr(record, field, None) in (None, "")]
            if missing:
                exceptions.append({"entity": kind, "entityId": record.id, "issue": "missing_required_fields", "fields": missing})
            elif kind == "transaction" and record.amount_kes > 10_000_000:
                exceptions.append({"entity": kind, "entityId": record.id, "issue": "amount_outlier_review"})
            else:
                passed += 1
    score = round(passed / checked * 100, 2) if checked else None
    return {
        "summary": {
            "checked": checked,
            "passed": passed,
            "exceptions": len(exceptions),
            "score": score,
        },
        "exceptions": exceptions,
        "synthetic": True,
    }
