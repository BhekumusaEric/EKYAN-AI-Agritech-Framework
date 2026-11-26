from __future__ import annotations

from datetime import date, datetime, timezone
from typing import Any
from uuid import uuid4

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    JSON,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


def new_id() -> str:
    return str(uuid4())


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "mvp_users"

    id: Mapped[str] = mapped_column(String(80), primary_key=True)
    display_name: Mapped[str] = mapped_column(String(120), nullable=False)
    role: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    email: Mapped[str | None] = mapped_column(String(254))
    password_hash: Mapped[str | None] = mapped_column(String(256))
    approval_status: Mapped[str] = mapped_column(String(16), default="approved", nullable=False)
    token_version: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    gender: Mapped[str] = mapped_column(String(32), default="not_stated", nullable=False)
    disability: Mapped[str] = mapped_column(String(32), default="not_stated", nullable=False)
    active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    synthetic: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class Farmer(Base):
    __tablename__ = "mvp_farmers"

    id: Mapped[str] = mapped_column(String(80), primary_key=True, default=new_id)
    agripreneur_id: Mapped[str] = mapped_column(ForeignKey("mvp_users.id"), index=True)
    client_id: Mapped[str | None] = mapped_column(String(80), unique=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    phone: Mapped[str | None] = mapped_column(String(40))
    village: Mapped[str] = mapped_column(String(120), nullable=False)
    ward: Mapped[str] = mapped_column(String(80), nullable=False)
    county: Mapped[str] = mapped_column(String(80), default="Busia", nullable=False)
    gender: Mapped[str] = mapped_column(String(32), default="not_stated", nullable=False)
    disability: Mapped[str] = mapped_column(String(32), default="not_stated", nullable=False)
    consent_to_record: Mapped[bool] = mapped_column(Boolean, nullable=False)
    synthetic: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class AdoptionIntention(Base):
    __tablename__ = "mvp_adoption_intentions"
    __table_args__ = (Index("ix_mvp_intentions_farmer_created", "farmer_id", "created_at"),)

    id: Mapped[str] = mapped_column(String(80), primary_key=True, default=new_id)
    client_id: Mapped[str | None] = mapped_column(String(80), unique=True)
    farmer_id: Mapped[str] = mapped_column(ForeignKey("mvp_farmers.id"), index=True)
    agripreneur_id: Mapped[str] = mapped_column(ForeignKey("mvp_users.id"), index=True)
    practice: Mapped[str] = mapped_column(String(200), nullable=False)
    target_date: Mapped[date] = mapped_column(Date, nullable=False)
    acted_by: Mapped[str] = mapped_column(String(80), nullable=False)
    on_behalf_of: Mapped[str] = mapped_column(String(80), nullable=False)
    synthetic: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class FieldOrder(Base):
    __tablename__ = "mvp_orders"
    __table_args__ = (
        CheckConstraint("quantity > 0", name="ck_mvp_order_quantity_positive"),
        Index("ix_mvp_orders_demand", "item", "ward", "needed_by", "status"),
    )

    id: Mapped[str] = mapped_column(String(80), primary_key=True, default=new_id)
    client_id: Mapped[str | None] = mapped_column(String(80), unique=True)
    farmer_id: Mapped[str] = mapped_column(ForeignKey("mvp_farmers.id"), index=True)
    agripreneur_id: Mapped[str] = mapped_column(ForeignKey("mvp_users.id"), index=True)
    item: Mapped[str] = mapped_column(String(120), nullable=False)
    quantity: Mapped[float] = mapped_column(nullable=False)
    needed_by: Mapped[date] = mapped_column(Date, nullable=False)
    ward: Mapped[str] = mapped_column(String(80), nullable=False)
    county: Mapped[str] = mapped_column(String(80), default="Busia", nullable=False)
    status: Mapped[str] = mapped_column(String(24), default="open", nullable=False, index=True)
    demand_group_id: Mapped[str | None] = mapped_column(String(80), index=True)
    acted_by: Mapped[str] = mapped_column(String(80), nullable=False)
    on_behalf_of: Mapped[str] = mapped_column(String(80), nullable=False)
    synthetic: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class Blocker(Base):
    __tablename__ = "mvp_blockers"
    __table_args__ = (
        Index("ix_mvp_blockers_workflow", "status", "due_at", "route_to"),
    )

    id: Mapped[str] = mapped_column(String(80), primary_key=True, default=new_id)
    client_id: Mapped[str | None] = mapped_column(String(80), unique=True)
    farmer_id: Mapped[str | None] = mapped_column(ForeignKey("mvp_farmers.id"), index=True)
    agripreneur_id: Mapped[str] = mapped_column(ForeignKey("mvp_users.id"), index=True)
    category: Mapped[str] = mapped_column(String(80), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    ward: Mapped[str] = mapped_column(String(80), nullable=False)
    county: Mapped[str] = mapped_column(String(80), default="Busia", nullable=False)
    urgency: Mapped[str] = mapped_column(String(16), default="medium", nullable=False)
    route_to: Mapped[str] = mapped_column(String(32), nullable=False)
    assignee_id: Mapped[str | None] = mapped_column(ForeignKey("mvp_users.id"))
    status: Mapped[str] = mapped_column(String(24), default="open", nullable=False)
    due_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    resolution_note: Mapped[str | None] = mapped_column(Text)
    farmer_confirmed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    acted_by: Mapped[str] = mapped_column(String(80), nullable=False)
    on_behalf_of: Mapped[str | None] = mapped_column(String(80))
    synthetic: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class BusinessTransaction(Base):
    __tablename__ = "mvp_transactions"
    __table_args__ = (
        CheckConstraint("amount_kes > 0", name="ck_mvp_transaction_amount_positive"),
        Index("ix_mvp_transactions_owner_date", "agripreneur_id", "transaction_date"),
    )

    id: Mapped[str] = mapped_column(String(80), primary_key=True, default=new_id)
    client_id: Mapped[str | None] = mapped_column(String(80), unique=True)
    agripreneur_id: Mapped[str] = mapped_column(ForeignKey("mvp_users.id"), index=True)
    farmer_id: Mapped[str | None] = mapped_column(ForeignKey("mvp_farmers.id"))
    transaction_type: Mapped[str] = mapped_column(String(16), nullable=False)
    category: Mapped[str] = mapped_column(String(80), default="other", nullable=False)
    amount_kes: Mapped[float] = mapped_column(nullable=False)
    counterparty: Mapped[str | None] = mapped_column(String(120))
    transaction_date: Mapped[date] = mapped_column(Date, nullable=False)
    payment_status: Mapped[str] = mapped_column(String(16), default="paid", nullable=False)
    due_date: Mapped[date | None] = mapped_column(Date)
    notes: Mapped[str | None] = mapped_column(Text)
    evidence_status: Mapped[str] = mapped_column(String(32), default="self_reported", nullable=False)
    acted_by: Mapped[str] = mapped_column(String(80), nullable=False)
    on_behalf_of: Mapped[str | None] = mapped_column(String(80))
    synthetic: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class DemandGroup(Base):
    __tablename__ = "mvp_demand_groups"
    __table_args__ = (
        UniqueConstraint("item", "county", "ward", "week_start", name="uq_mvp_demand_group"),
        CheckConstraint("total_quantity > 0", name="ck_mvp_demand_quantity_positive"),
    )

    id: Mapped[str] = mapped_column(String(80), primary_key=True, default=new_id)
    item: Mapped[str] = mapped_column(String(120), nullable=False)
    county: Mapped[str] = mapped_column(String(80), nullable=False)
    ward: Mapped[str] = mapped_column(String(80), nullable=False)
    week_start: Mapped[date] = mapped_column(Date, nullable=False)
    total_quantity: Mapped[float] = mapped_column(nullable=False)
    farmer_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    agripreneur_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    status: Mapped[str] = mapped_column(String(24), default="open", nullable=False, index=True)
    synthetic: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class SupplierCommitment(Base):
    __tablename__ = "mvp_supplier_commitments"

    id: Mapped[str] = mapped_column(String(80), primary_key=True, default=new_id)
    demand_group_id: Mapped[str] = mapped_column(ForeignKey("mvp_demand_groups.id"), index=True)
    supplier_id: Mapped[str] = mapped_column(ForeignKey("mvp_users.id"), index=True)
    quantity: Mapped[float] = mapped_column(nullable=False)
    unit_price_kes: Mapped[float] = mapped_column(nullable=False)
    quality_evidence_ref: Mapped[str] = mapped_column(String(200), nullable=False)
    delivery_date: Mapped[date] = mapped_column(Date, nullable=False)
    status: Mapped[str] = mapped_column(String(24), default="committed", nullable=False)
    synthetic: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class SavingsRecord(Base):
    __tablename__ = "mvp_savings_records"

    id: Mapped[str] = mapped_column(String(80), primary_key=True, default=new_id)
    agripreneur_id: Mapped[str] = mapped_column(ForeignKey("mvp_users.id"), index=True)
    month: Mapped[str] = mapped_column(String(7), nullable=False)
    amount_kes: Mapped[float] = mapped_column(nullable=False)
    source: Mapped[str] = mapped_column(String(40), default="mock_chomoka", nullable=False)
    synthetic: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class Consent(Base):
    __tablename__ = "mvp_consents"

    id: Mapped[str] = mapped_column(String(80), primary_key=True, default=new_id)
    agripreneur_id: Mapped[str] = mapped_column(ForeignKey("mvp_users.id"), index=True)
    lender_id: Mapped[str] = mapped_column(ForeignKey("mvp_users.id"), index=True)
    purpose: Mapped[str] = mapped_column(String(80), nullable=False)
    granted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    synthetic: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class ProgrammeCost(Base):
    __tablename__ = "mvp_programme_costs"

    id: Mapped[str] = mapped_column(String(80), primary_key=True, default=new_id)
    period_start: Mapped[date] = mapped_column(Date, nullable=False)
    period_end: Mapped[date] = mapped_column(Date, nullable=False)
    county: Mapped[str | None] = mapped_column(String(80))
    amount_kes: Mapped[float] = mapped_column(nullable=False)
    created_by: Mapped[str] = mapped_column(ForeignKey("mvp_users.id"))
    synthetic: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class Notification(Base):
    __tablename__ = "mvp_notifications"

    id: Mapped[str] = mapped_column(String(80), primary_key=True, default=new_id)
    recipient_id: Mapped[str] = mapped_column(ForeignKey("mvp_users.id"), index=True)
    title: Mapped[str] = mapped_column(String(120), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    synthetic: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class SyncReceipt(Base):
    __tablename__ = "mvp_sync_receipts"

    client_id: Mapped[str] = mapped_column(String(80), primary_key=True)
    actor_id: Mapped[str] = mapped_column(ForeignKey("mvp_users.id"), index=True)
    entity_id: Mapped[str] = mapped_column(String(80), nullable=False)
    kind: Mapped[str] = mapped_column(String(24), nullable=False)
    result: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class AuditLog(Base):
    __tablename__ = "mvp_audit_logs"
    __table_args__ = (Index("ix_mvp_audit_actor_time", "actor_id", "created_at"),)

    id: Mapped[str] = mapped_column(String(80), primary_key=True, default=new_id)
    actor_id: Mapped[str] = mapped_column(ForeignKey("mvp_users.id"), index=True)
    action: Mapped[str] = mapped_column(String(64), nullable=False)
    entity: Mapped[str] = mapped_column(String(64), nullable=False)
    entity_id: Mapped[str | None] = mapped_column(String(80))
    on_behalf_of: Mapped[str | None] = mapped_column(String(80))
    metadata_json: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class ConfigItem(Base):
    __tablename__ = "mvp_config_items"

    id: Mapped[str] = mapped_column(String(80), primary_key=True, default=new_id)
    item_type: Mapped[str] = mapped_column(String(40), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    county: Mapped[str | None] = mapped_column(String(80))
    route_to: Mapped[str | None] = mapped_column(String(32))
    sla_days: Mapped[int | None] = mapped_column(Integer)
    active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    synthetic: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class AdvisorySource(Base):
    __tablename__ = "mvp_advisory_sources"

    id: Mapped[str] = mapped_column(String(80), primary_key=True, default=new_id)
    title: Mapped[str] = mapped_column(String(160), nullable=False)
    language: Mapped[str] = mapped_column(String(8), nullable=False)
    value_chain: Mapped[str] = mapped_column(String(80), nullable=False)
    source_url: Mapped[str | None] = mapped_column(String(500))
    content: Mapped[str] = mapped_column(Text, nullable=False)
    approved_by: Mapped[str | None] = mapped_column(ForeignKey("mvp_users.id"))
    active: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    synthetic: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
