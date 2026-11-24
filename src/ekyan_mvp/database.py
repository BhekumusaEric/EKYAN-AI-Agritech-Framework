from __future__ import annotations

import os
from datetime import date, timedelta
from pathlib import Path
from typing import Generator

from sqlalchemy import Engine, create_engine, inspect, make_url, select, text
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from .models import (
    Base,
    Blocker,
    BusinessTransaction,
    ConfigItem,
    Farmer,
    FieldOrder,
    SavingsRecord,
    User,
    utcnow,
)

ROLES = (
    "agripreneur",
    "supplier",
    "lender",
    "investor",
    "buyer",
    "extension_officer",
    "programme_manager",
    "administrator",
)


def database_url_from_environment() -> str:
    configured = os.getenv("EKYAN_DATABASE_URL") or os.getenv("DATABASE_URL")
    if configured:
        if configured.startswith("postgres://"):
            return configured.replace("postgres://", "postgresql+psycopg://", 1)
        if configured.startswith("postgresql://"):
            return configured.replace("postgresql://", "postgresql+psycopg://", 1)
        return configured
    data_directory = Path(__file__).resolve().parents[2] / "data"
    data_directory.mkdir(parents=True, exist_ok=True)
    return f"sqlite:///{(data_directory / 'ekyan_local.db').as_posix()}"


def make_engine(database_url: str | None = None) -> Engine:
    url = database_url or database_url_from_environment()
    options: dict[str, object] = {"pool_pre_ping": True}
    if url.startswith("sqlite"):
        options["connect_args"] = {"check_same_thread": False}
        if url in {"sqlite://", "sqlite:///:memory:"}:
            options["poolclass"] = StaticPool
        else:
            database_path = make_url(url).database
            if database_path and database_path != ":memory:":
                Path(database_path).expanduser().resolve().parent.mkdir(parents=True, exist_ok=True)
    return create_engine(url, **options)


def make_session_factory(engine: Engine) -> sessionmaker[Session]:
    return sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


def upgrade_transaction_schema(engine: Engine) -> None:
    if not inspect(engine).has_table(BusinessTransaction.__tablename__):
        return
    existing_columns = {
        column["name"]
        for column in inspect(engine).get_columns(BusinessTransaction.__tablename__)
    }
    additions = {
        "category": "VARCHAR(80) NOT NULL DEFAULT 'other'",
        "payment_status": "VARCHAR(16) NOT NULL DEFAULT 'paid'",
        "due_date": "DATE",
        "notes": "TEXT",
    }
    with engine.begin() as connection:
        for name, declaration in additions.items():
            if name not in existing_columns:
                connection.execute(
                    text(
                        f"ALTER TABLE {BusinessTransaction.__tablename__} "
                        f"ADD COLUMN {name} {declaration}"
                    )
                )


def initialize_database(engine: Engine, factory: sessionmaker[Session]) -> None:
    Base.metadata.create_all(engine)
    upgrade_transaction_schema(engine)
    with factory.begin() as session:
        demo_users = [
            ("demo-agripreneur-001", "Demo Agripreneur 001", "agripreneur", "woman", "not_stated"),
            ("demo-agripreneur-002", "Demo Agripreneur 002", "agripreneur", "man", "not_stated"),
            ("demo-agripreneur-003", "Demo Agripreneur 003", "agripreneur", "woman", "yes"),
            ("demo-supplier-001", "Demo Supplier", "supplier", "not_stated", "not_stated"),
            ("demo-lender-001", "Demo Lender", "lender", "not_stated", "not_stated"),
            ("demo-investor-001", "Demo Investor", "investor", "not_stated", "not_stated"),
            ("demo-buyer-001", "Demo Buyer", "buyer", "not_stated", "not_stated"),
            ("demo-extension-officer-001", "Demo Extension Officer", "extension_officer", "not_stated", "not_stated"),
            ("demo-programme-manager-001", "Demo Programme Manager", "programme_manager", "not_stated", "not_stated"),
            ("demo-administrator-001", "Demo Administrator", "administrator", "not_stated", "not_stated"),
        ]
        for user_id, display_name, role, gender, disability in demo_users:
            if session.get(User, user_id) is None:
                session.add(
                    User(
                        id=user_id,
                        display_name=display_name,
                        role=role,
                        gender=gender,
                        disability=disability,
                        synthetic=True,
                    )
                )
        if session.get(User, "system-sla-service") is None:
            session.add(
                User(
                    id="system-sla-service",
                    display_name="Synthetic SLA Service",
                    role="system",
                    synthetic=True,
                )
            )

        config = (
            ("county", "Busia", None, None, None),
            ("value_chain", "Poultry", None, None, None),
            ("ward", "Teso South", "Busia", None, None),
            ("ward", "Nambale", "Busia", None, None),
            ("ward", "Matayos", "Busia", None, None),
            ("input", "Day-old chicks", None, None, None),
            ("input", "Feed (bags)", None, None, None),
            ("input", "Vaccines (doses)", None, None, None),
            ("input", "Drinkers/feeders", None, None, None),
            ("blocker_category", "Inputs", None, "supplier", 7),
            ("blocker_category", "Finance", None, "lender", 7),
            ("blocker_category", "Water", None, "extension_officer", 7),
            ("blocker_category", "Market", None, "buyer", 7),
            ("blocker_category", "Disease", None, "extension_officer", 7),
            ("blocker_category", "Labour", None, "extension_officer", 7),
            ("blocker_category", "Land access", None, "extension_officer", 7),
            ("blocker_category", "Time", None, "extension_officer", 7),
        )
        existing = {
            (item.item_type, item.name)
            for item in session.scalars(select(ConfigItem)).all()
        }
        for item_type, name, county, route_to, sla_days in config:
            if (item_type, name) not in existing:
                session.add(
                    ConfigItem(
                        item_type=item_type,
                        name=name,
                        county=county,
                        route_to=route_to,
                        sla_days=sla_days,
                        synthetic=True,
                    )
                )

        if session.get(Farmer, "synthetic-farmer-001") is None:
            session.add_all(
                [
                    Farmer(
                        id="synthetic-farmer-001",
                        agripreneur_id="demo-agripreneur-001",
                        name="Synthetic Farmer 001",
                        village="Synthetic Village A",
                        ward="Teso South",
                        gender="woman",
                        disability="not_stated",
                        consent_to_record=True,
                    ),
                    Farmer(
                        id="synthetic-farmer-002",
                        agripreneur_id="demo-agripreneur-001",
                        name="Synthetic Farmer 002",
                        village="Synthetic Village B",
                        ward="Teso South",
                        gender="man",
                        disability="not_stated",
                        consent_to_record=True,
                    ),
                ]
            )
            session.flush()
            today = date.today()
            session.add_all(
                [
                    FieldOrder(
                        id="synthetic-order-001",
                        farmer_id="synthetic-farmer-001",
                        agripreneur_id="demo-agripreneur-001",
                        item="Feed (bags)",
                        quantity=20,
                        needed_by=today + timedelta(days=7),
                        ward="Teso South",
                        county="Busia",
                        acted_by="demo-agripreneur-001",
                        on_behalf_of="synthetic-farmer-001",
                    ),
                    FieldOrder(
                        id="synthetic-order-002",
                        farmer_id="synthetic-farmer-002",
                        agripreneur_id="demo-agripreneur-001",
                        item="Feed (bags)",
                        quantity=15,
                        needed_by=today + timedelta(days=7),
                        ward="Teso South",
                        county="Busia",
                        acted_by="demo-agripreneur-001",
                        on_behalf_of="synthetic-farmer-002",
                    ),
                    Blocker(
                        id="synthetic-blocker-001",
                        farmer_id="synthetic-farmer-001",
                        agripreneur_id="demo-agripreneur-001",
                        category="Inputs",
                        description="Synthetic poultry feed access requires follow-up.",
                        ward="Teso South",
                        county="Busia",
                        urgency="medium",
                        route_to="supplier",
                        assignee_id="demo-supplier-001",
                        due_at=utcnow() + timedelta(days=7),
                        acted_by="demo-agripreneur-001",
                        on_behalf_of="synthetic-farmer-001",
                    ),
                ]
            )
            session.add_all(
                [
                    BusinessTransaction(
                        agripreneur_id="demo-agripreneur-001",
                        farmer_id="synthetic-farmer-001",
                        transaction_type="sale",
                        amount_kes=8500,
                        counterparty="synthetic-buyer-001",
                        transaction_date=today - timedelta(days=35),
                        acted_by="demo-agripreneur-001",
                        on_behalf_of="synthetic-farmer-001",
                    ),
                    BusinessTransaction(
                        agripreneur_id="demo-agripreneur-001",
                        transaction_type="purchase",
                        amount_kes=3200,
                        counterparty="synthetic-supplier-001",
                        transaction_date=today - timedelta(days=32),
                        acted_by="demo-agripreneur-001",
                    ),
                ]
            )
            session.add(
                SavingsRecord(
                    agripreneur_id="demo-agripreneur-001",
                    month=(today - timedelta(days=30)).strftime("%Y-%m"),
                    amount_kes=500,
                    source="mock_chomoka",
                )
            )


def session_dependency(factory: sessionmaker[Session]):
    def get_session() -> Generator[Session, None, None]:
        session = factory()
        try:
            yield session
        finally:
            session.close()

    return get_session
