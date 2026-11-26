"""EKYAN Connect pilot API for synthetic, human-led coordination workflows."""

import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from fastapi import Depends, FastAPI, Header, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from dotenv import load_dotenv
from sqlalchemy import select
from sqlalchemy.orm import Session

load_dotenv()

configured_origins = [
    origin.strip()
    for origin in os.getenv("ALLOWED_ORIGINS", "").split(",")
    if origin.strip()
]
local_origins = ["http://localhost:3000", "http://127.0.0.1:3000"]
allowed_origins = (
    configured_origins
    if os.getenv("EKYAN_ENV", "development").casefold() == "production"
    else list(dict.fromkeys(local_origins + configured_origins))
)

# Module imports
from climate_engine.advisory import get_advisory
from marketplace.engine import (
    forecast_price, MARKET_BASELINES
)
from datetime import date

from ekyan_mvp.auth import InvalidToken, development_secret, hash_password, verify_token
from ekyan_mvp.database import initialize_database, make_engine, make_session_factory
from ekyan_mvp.models import User, new_id
from ekyan_mvp.router import create_router

_environment = os.getenv("EKYAN_ENV", "development").strip().lower()
_configured_database_url = os.getenv("EKYAN_DATABASE_URL") or os.getenv("DATABASE_URL") or ""
if _environment == "production" and not _configured_database_url.startswith(("postgres://", "postgresql://", "postgresql+psycopg://")):
    raise RuntimeError("Configure EKYAN_DATABASE_URL or DATABASE_URL with PostgreSQL before starting EKYAN in production.")
if _environment == "production" and not configured_origins:
    raise RuntimeError("Configure ALLOWED_ORIGINS for the production web client.")
_configured_auth_secret = os.getenv("EKYAN_AUTH_SECRET", "")
if _environment == "production" and len(_configured_auth_secret) < 32:
    raise RuntimeError("EKYAN_AUTH_SECRET must be configured with at least 32 characters in production.")
if _environment == "production" and os.getenv("EKYAN_ENABLE_DEMO_AUTH", "false").lower() == "true":
    raise RuntimeError("Demo role sign-in must remain disabled in production.")
_auth_secret = _configured_auth_secret or development_secret()
_demo_auth_enabled = _environment != "production" and os.getenv("EKYAN_ENABLE_DEMO_AUTH", "true").strip().lower() == "true"
_registration_enabled = os.getenv(
    "EKYAN_ENABLE_REGISTRATION", "false" if _environment == "production" else "true"
).strip().lower() == "true"
_mvp_engine = make_engine()
_mvp_session_factory = make_session_factory(_mvp_engine)


def authenticated_account(request: Request, authorization: str | None = Header(default=None)) -> User:
    token = request.cookies.get("ekyan_session")
    if authorization:
        scheme, separator, bearer = authorization.partition(" ")
        if scheme.lower() != "bearer" or not separator or not bearer:
            raise HTTPException(status_code=401, detail="A valid bearer access token is required.")
        token = bearer
    if not token:
        raise HTTPException(status_code=401, detail="A bearer access token is required.")
    try:
        claims = verify_token(token, secret=request.app.state.auth_secret)
    except InvalidToken as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from exc
    with request.app.state.mvp_session_factory() as session:
        actor = session.get(User, claims["sub"])
        if (actor is None or not actor.active or actor.approval_status != "approved"
                or actor.role != claims["role"] or claims.get("ver", 0) != actor.token_version):
            raise HTTPException(status_code=401, detail="The account is inactive or its role changed.")
        session.expunge(actor)
        return actor


def require_account_roles(*allowed: str):
    def dependency(actor: User = Depends(authenticated_account)) -> User:
        if actor.role not in allowed:
            raise HTTPException(status_code=403, detail="This role cannot perform that action.")
        return actor
    return dependency

app = FastAPI(
    title="EKYAN Connect API",
    description="Digital operating layer for UNICEF EKYAN youth agripreneurs — Kenya",
    version="1.0.0",
    docs_url="/docs",
)
app.state.auth_secret = _auth_secret
app.state.mvp_session_factory = _mvp_session_factory

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=True,
    allow_origin_regex=(
        None if _environment == "production"
        else r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$"
    ),
)

# ── Climate advisory endpoint ─────────────────────────────────────────────────

@app.get("/api/v1/climate/advisory")
async def climate_advisory(
    county: str, ndvi: Optional[float] = None,
    actor: User = Depends(require_account_roles("agripreneur", "extension_officer", "programme_manager", "administrator")),
):
    nudges = await get_advisory(county, ndvi)
    return {
        "county": county,
        "nudges": [
            {
                "trigger": n.trigger,
                "severity": n.severity,
                "action_required": n.action_required,
                "swahili": n.message_swahili,
                "english": n.message_english,
            }
            for n in nudges
        ],
    }


# ── Marketplace endpoints ─────────────────────────────────────────────────────

@app.get("/api/v1/market/price")
def market_price(
    commodity: str, days_ahead: int = 14,
    actor: User = Depends(require_account_roles("agripreneur", "supplier", "buyer", "programme_manager", "administrator")),
):
    target = date.today().__class__.fromordinal(
        date.today().toordinal() + days_ahead
    )
    f = forecast_price(commodity, target)
    return {
        "commodity": f.commodity,
        "forecast_date": f.forecast_date.isoformat(),
        "fair_farmgate_kes": f.fair_price_kes,
        "market_wholesale_kes": f.market_price_kes,
        "broker_wouldve_paid_kes": f.broker_price_kes,
        "farmer_gain_per_kg_kes": f.farmer_gain_kes,
        "confidence": f.confidence,
    }


@app.get("/api/v1/market/commodities")
def list_commodities(actor: User = Depends(require_account_roles("agripreneur", "supplier", "buyer", "programme_manager", "administrator"))):
    return {"commodities": list(MARKET_BASELINES.keys())}


# ── Investor profile endpoint ─────────────────────────────────────────────────

@app.get("/api/v1/investor/profiles")
def investor_profiles(actor: User = Depends(require_account_roles("investor", "administrator"))):
    """Investor-specific sharing remains closed until purpose-bound consent is supported."""
    return {"profiles": [], "synthetic": True, "count": 0,
            "message": "No investor profiles are available until EKYAN has an investor-specific consent flow."}


# ── Buyer marketplace endpoints ────────────────────────────────────────────────

@app.get("/api/v1/marketplace/listings")
def list_harvest_listings(
    commodity: Optional[str] = None, county: Optional[str] = None,
    actor: User = Depends(require_account_roles("buyer", "agripreneur", "administrator")),
):
    return {"listings": [], "count": 0, "synthetic": True,
            "message": "Marketplace listings are not enabled in this pilot phase."}


@app.get("/api/v1/marketplace/price-forecast")
def marketplace_price_forecast(
    commodity: str, days_ahead: int = 14,
    actor: User = Depends(require_account_roles("buyer", "agripreneur", "administrator")),
):
    target = date.today().__class__.fromordinal(date.today().toordinal() + days_ahead)
    f = forecast_price(commodity, target)
    return {
        "commodity": f.commodity,
        "forecast_date": f.forecast_date.isoformat(),
        "fair_farmgate_kes": f.fair_price_kes,
        "market_wholesale_kes": f.market_price_kes,
        "broker_wouldve_paid_kes": f.broker_price_kes,
        "farmer_gain_per_kg_kes": f.farmer_gain_kes,
        "confidence": f.confidence,
        "synthetic": True,
    }


# ── Agronomist local chat (Ollama fallback) ────────────────────────────────────

class LocalChatRequest(BaseModel):
    message: str
    participant_id: str = "synthetic-demo-001"
    language: str = "en"


@app.post("/api/v1/advisory/chat")
async def advisory_chat(
    req: LocalChatRequest,
    actor: User = Depends(require_account_roles("agripreneur", "extension_officer")),
):
    """Fail closed until approved-source retrieval and human escalation exist."""
    return {
        "reply": (
            "No approved advisory source is connected, so I cannot provide farm guidance. Please route this question to a qualified extension officer. "
            "Hakuna chanzo cha ushauri kilichoidhinishwa. Tafadhali peleka swali hili kwa afisa ugani mwenye sifa."
        ),
        "source": "none",
        "confidence": "unavailable",
        "participant_id": req.participant_id,
        "synthetic": True,
    }


# ── Health ────────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "healthy", "service": "EKYAN Connect API", "version": "1.0.0"}


# ── BRS MVP services: local persistence, scoped roles and audit ───────────────

@app.on_event("startup")
def initialize_mvp_services() -> None:
    initialize_database(_mvp_engine, _mvp_session_factory)
    admin_email = os.getenv("EKYAN_BOOTSTRAP_ADMIN_EMAIL", "").strip().lower()
    admin_password = os.getenv("EKYAN_BOOTSTRAP_ADMIN_PASSWORD", "")
    default_admin_name = "EKYAN Administrator" if _environment == "production" else "Demo Administrator"
    admin_name = os.getenv("EKYAN_BOOTSTRAP_ADMIN_NAME", default_admin_name).strip()
    if bool(admin_email) != bool(admin_password):
        raise RuntimeError("Set both EKYAN_BOOTSTRAP_ADMIN_EMAIL and EKYAN_BOOTSTRAP_ADMIN_PASSWORD.")
    with _mvp_session_factory.begin() as session:
        existing_admin = session.scalar(
            select(User).where(User.role == "administrator", User.email.is_not(None), User.active.is_(True))
        )
        if admin_email and session.scalar(select(User.id).where(User.email == admin_email)) is None:
            if len(admin_password) < 12:
                raise RuntimeError("The bootstrap administrator password must be at least 12 characters.")
            if _environment != "production" and (
                not admin_email.endswith(".invalid") or not admin_name.lower().startswith(("demo ", "synthetic "))
            ):
                raise RuntimeError("Local bootstrap admin accounts must use a Demo or Synthetic name and .invalid email.")
            session.add(User(
                id=new_id(), display_name=admin_name, email=admin_email, password_hash=hash_password(admin_password),
                role="administrator", active=True, approval_status="approved", synthetic=_environment != "production",
            ))
        elif _environment == "production" and existing_admin is None:
            raise RuntimeError("Configure bootstrap administrator credentials before starting EKYAN in production.")


app.include_router(
    create_router(
        _mvp_session_factory,
        auth_secret=_auth_secret,
        demo_auth_enabled=_demo_auth_enabled,
        registration_enabled=_registration_enabled,
        production_mode=_environment == "production",
    )
)
