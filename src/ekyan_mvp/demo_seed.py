from __future__ import annotations

import random
from datetime import date, datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session, sessionmaker

from .models import (
    AdoptionIntention,
    Blocker,
    BusinessTransaction,
    ConfigItem,
    Farmer,
    FieldOrder,
    ProgrammeCost,
    SavingsRecord,
    User,
)

SEED_VERSION = "busia-poultry-demo-v1"
RANDOM_SEED = 20261124
WARD_NAMES = ("Teso South", "Nambale", "Matayos")
INPUTS = ("Day-old chicks", "Feed (bags)", "Vaccines (doses)", "Drinkers/feeders")
BLOCKER_CATEGORIES = (
    "Inputs",
    "Finance",
    "Water",
    "Market",
    "Disease",
    "Labour",
    "Land access",
    "Time",
)


def _count(session: Session, model: type) -> int:
    return int(session.scalar(select(func.count()).select_from(model)) or 0)


def _month_start(day: date, months_ago: int) -> date:
    month_index = day.year * 12 + day.month - 1 - months_ago
    year, month = divmod(month_index, 12)
    return date(year, month + 1, 1)


def _assert_synthetic_only(session: Session) -> None:
    for model in (User, Farmer, FieldOrder, Blocker, BusinessTransaction, AdoptionIntention):
        non_synthetic = session.scalar(
            select(model.id).where(model.synthetic.is_(False)).limit(1)
        )
        if non_synthetic is not None:
            raise RuntimeError(
                f"Refusing to add demo records: {model.__tablename__} contains non-synthetic data."
            )


def seed_synthetic_demo(factory: sessionmaker[Session]) -> dict[str, int | bool]:
    randomizer = random.Random(RANDOM_SEED)
    with factory.begin() as session:
        marker = session.scalar(
            select(ConfigItem).where(
                ConfigItem.item_type == "seed_marker",
                ConfigItem.name == SEED_VERSION,
            )
        )
        if marker is not None:
            return {"alreadySeeded": True}

        _assert_synthetic_only(session)
        now = datetime.now(timezone.utc)
        today = date.today()

        agripreneur_ids = [f"demo-agripreneur-{index:03d}" for index in range(1, 4)]
        agripreneur_ids.extend(f"seed-agripreneur-{index:03d}" for index in range(4, 16))
        new_users = [
            User(
                id=agripreneur_id,
                display_name=f"Demo Agripreneur {index:03d}",
                role="agripreneur",
                gender="woman" if index <= 9 else "man",
                disability="yes" if index == 10 else "not_stated",
                synthetic=True,
            )
            for index, agripreneur_id in enumerate(agripreneur_ids, start=1)
            if session.get(User, agripreneur_id) is None
        ]
        for index in range(2, 4):
            user_id = f"seed-supplier-{index:03d}"
            if session.get(User, user_id) is None:
                new_users.append(
                    User(
                        id=user_id,
                        display_name=f"Demo Supplier {index:03d}",
                        role="supplier",
                        synthetic=True,
                    )
                )
        session.add_all(new_users)
        session.flush()

        existing_farmer_count = _count(session, Farmer)
        farmers_to_add = max(0, 1500 - existing_farmer_count)
        farmer_records = []
        for index in range(existing_farmer_count + 1, existing_farmer_count + farmers_to_add + 1):
            agripreneur_id = agripreneur_ids[(index - 1) % len(agripreneur_ids)]
            farmer_records.append(
                Farmer(
                    id=f"seed-farmer-{index:04d}",
                    agripreneur_id=agripreneur_id,
                    name=f"Demo Farmer {index:04d}",
                    village=f"Synthetic Village {chr(65 + randomizer.randrange(5))}",
                    ward=randomizer.choice(WARD_NAMES),
                    county="Busia",
                    gender="woman" if randomizer.random() < 0.56 else "man",
                    disability="yes" if index in {10, 314, 902} else "not_stated",
                    consent_to_record=True,
                    created_at=now - timedelta(days=randomizer.randrange(180)),
                    synthetic=True,
                )
            )
        session.add_all(farmer_records)
        session.flush()
        farmer_ids = sorted(session.scalars(select(Farmer.id)).all())
        farmer_by_id = {
            farmer.id: farmer
            for farmer in session.scalars(select(Farmer)).all()
        }

        orders_to_add = max(0, 2000 - _count(session, FieldOrder))
        order_records = []
        for index in range(1, orders_to_add + 1):
            farmer = farmer_by_id[farmer_ids[(index * 17) % len(farmer_ids)]]
            item = randomizer.choice(INPUTS)
            status = randomizer.choices(
                ("open", "committed", "fulfilled"),
                weights=(5, 2, 3),
                k=1,
            )[0]
            order_records.append(
                FieldOrder(
                    id=f"seed-order-{index:06d}",
                    farmer_id=farmer.id,
                    agripreneur_id=farmer.agripreneur_id,
                    item=item,
                    quantity=(
                        randomizer.randint(1, 8)
                        if item == "Feed (bags)"
                        else randomizer.randint(25, 200)
                        if item in {"Day-old chicks", "Vaccines (doses)"}
                        else randomizer.randint(1, 12)
                    ),
                    needed_by=today + timedelta(days=randomizer.randint(2, 28)),
                    ward=farmer.ward,
                    county=farmer.county,
                    status=status,
                    acted_by=farmer.agripreneur_id,
                    on_behalf_of=farmer.id,
                    created_at=now - timedelta(days=randomizer.randrange(120)),
                    synthetic=True,
                )
            )
        session.add_all(order_records)

        route_targets = {
            "Inputs": ("supplier", "demo-supplier-001"),
            "Finance": ("lender", "demo-lender-001"),
            "Water": ("extension_officer", "demo-extension-officer-001"),
            "Market": ("buyer", "demo-buyer-001"),
            "Disease": ("extension_officer", "demo-extension-officer-001"),
            "Labour": ("extension_officer", "demo-extension-officer-001"),
            "Land access": ("extension_officer", "demo-extension-officer-001"),
            "Time": ("extension_officer", "demo-extension-officer-001"),
        }
        blockers_to_add = max(0, 300 - _count(session, Blocker))
        blocker_records = []
        for index in range(1, blockers_to_add + 1):
            farmer = farmer_by_id[farmer_ids[(index * 11) % len(farmer_ids)]]
            category = randomizer.choice(BLOCKER_CATEGORIES)
            route_to, assignee_id = route_targets[category]
            status = randomizer.choices(
                ("open", "in_progress", "resolved"),
                weights=(5, 2, 3),
                k=1,
            )[0]
            created_at = now - timedelta(days=randomizer.randrange(90))
            resolved_at = created_at + timedelta(days=randomizer.randint(1, 6)) if status == "resolved" else None
            blocker_records.append(
                Blocker(
                    id=f"seed-blocker-{index:05d}",
                    farmer_id=farmer.id,
                    agripreneur_id=farmer.agripreneur_id,
                    category=category,
                    description=f"Synthetic scenario: {category.lower()} follow-up requested.",
                    ward=farmer.ward,
                    county=farmer.county,
                    urgency=randomizer.choice(("low", "medium", "high")),
                    route_to=route_to,
                    assignee_id=assignee_id,
                    status=status,
                    due_at=created_at + timedelta(days=7),
                    resolution_note="Synthetic follow-up recorded." if resolved_at else None,
                    farmer_confirmed=resolved_at is not None,
                    resolved_at=resolved_at,
                    acted_by=farmer.agripreneur_id,
                    on_behalf_of=farmer.id,
                    created_at=created_at,
                    synthetic=True,
                )
            )
        session.add_all(blocker_records)

        intentions_to_add = max(0, 600 - _count(session, AdoptionIntention))
        intention_records = []
        for index in range(1, intentions_to_add + 1):
            farmer = farmer_by_id[farmer_ids[(index * 7) % len(farmer_ids)]]
            created_at = now - timedelta(days=randomizer.randrange(120))
            intention_records.append(
                AdoptionIntention(
                    id=f"seed-intention-{index:05d}",
                    farmer_id=farmer.id,
                    agripreneur_id=farmer.agripreneur_id,
                    practice="Synthetic poultry care plan",
                    target_date=created_at.date() + timedelta(days=randomizer.randint(7, 45)),
                    acted_by=farmer.agripreneur_id,
                    on_behalf_of=farmer.id,
                    created_at=created_at,
                    synthetic=True,
                )
            )
        session.add_all(intention_records)

        transactions_to_add = max(0, 900 - _count(session, BusinessTransaction))
        transaction_records = []
        savings_records = []
        for index in range(1, transactions_to_add + 1):
            farmer = farmer_by_id[farmer_ids[(index * 13) % len(farmer_ids)]]
            agripreneur_id = farmer.agripreneur_id
            transaction_type = randomizer.choice(("sale", "purchase", "service"))
            transaction_records.append(
                BusinessTransaction(
                    id=f"seed-transaction-{index:06d}",
                    agripreneur_id=agripreneur_id,
                    farmer_id=farmer.id if transaction_type != "service" else None,
                    transaction_type=transaction_type,
                    amount_kes=randomizer.randrange(500, 15001, 100),
                    counterparty=f"synthetic-{randomizer.choice(('buyer', 'supplier'))}-{randomizer.randint(1, 12):03d}",
                    transaction_date=today - timedelta(days=randomizer.randrange(180)),
                    acted_by=agripreneur_id,
                    on_behalf_of=farmer.id if transaction_type != "service" else None,
                    created_at=now - timedelta(days=randomizer.randrange(180)),
                    synthetic=True,
                )
            )
        for month_offset in range(6):
            month_date = _month_start(today, month_offset)
            for agripreneur_id in agripreneur_ids:
                savings_records.append(
                    SavingsRecord(
                        agripreneur_id=agripreneur_id,
                        month=month_date.strftime("%Y-%m"),
                        amount_kes=randomizer.randrange(0, 5001, 100),
                        source="mock_chomoka",
                        synthetic=True,
                    )
                )
        session.add_all(transaction_records + savings_records)

        programme_costs = []
        for month_offset in range(6):
            period_start = _month_start(today, month_offset)
            next_month = _month_start(today, month_offset - 1)
            programme_costs.append(
                ProgrammeCost(
                    period_start=period_start,
                    period_end=next_month - timedelta(days=1),
                    county="Busia",
                    amount_kes=randomizer.randrange(100000, 500001, 1000),
                    created_by="demo-administrator-001",
                    synthetic=True,
                )
            )
        session.add_all(programme_costs)
        session.add(
            ConfigItem(
                item_type="seed_marker",
                name=SEED_VERSION,
                synthetic=True,
            )
        )

        return {
            "alreadySeeded": False,
            "farmersAdded": len(farmer_records),
            "ordersAdded": len(order_records),
            "blockersAdded": len(blocker_records),
            "intentionsAdded": len(intention_records),
            "transactionsAdded": len(transaction_records),
            "savingsRecordsAdded": len(savings_records),
            "programmeCostPeriodsAdded": len(programme_costs),
        }
