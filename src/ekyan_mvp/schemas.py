from __future__ import annotations

from datetime import date, datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

Role = Literal[
    "agripreneur",
    "supplier",
    "lender",
    "investor",
    "buyer",
    "extension_officer",
    "programme_manager",
    "administrator",
]

TransactionType = Literal[
    "sale",
    "service",
    "purchase",
    "other_income",
    "other_expense",
    "loan_received",
    "loan_repayment",
    "savings_deposit",
    "savings_out",
    "owner_in",
    "owner_out",
]
TransactionCategory = Literal[
    "sales",
    "services",
    "feed",
    "chicks",
    "vaccines",
    "equipment",
    "transport",
    "wages",
    "rent",
    "phone_data",
    "loan",
    "savings",
    "owner",
    "other",
]
PaymentStatus = Literal["paid", "unpaid"]


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)


class DemoSessionRequest(StrictModel):
    role: Role


class RegisterRequest(StrictModel):
    display_name: str = Field(alias="displayName", min_length=3, max_length=120)
    email: str = Field(min_length=5, max_length=254)
    password: str = Field(min_length=12, max_length=256)
    role: Role
    terms_accepted: bool = Field(default=False, alias="termsAccepted")
    terms_version: str | None = Field(default=None, alias="termsVersion", max_length=40)


class LoginRequest(StrictModel):
    email: str = Field(min_length=5, max_length=254)
    password: str = Field(min_length=1, max_length=256)


class UserApprovalRequest(StrictModel):
    status: Literal["approved", "rejected"]


class FarmerCreate(StrictModel):
    client_id: str | None = Field(default=None, alias="clientId", min_length=1, max_length=80)
    name: str = Field(min_length=3, max_length=120)
    phone: str | None = Field(default=None, max_length=40)
    village: str = Field(min_length=1, max_length=120)
    ward: str = Field(min_length=1, max_length=80)
    county: str = Field(default="Busia", min_length=1, max_length=80)
    gender: Literal["woman", "man", "another", "not_stated"] = "not_stated"
    disability: Literal["yes", "no", "not_stated"] = "not_stated"
    consent_to_record: bool = Field(alias="consentToRecord")
    synthetic: Literal[True] = True

    @field_validator("name")
    @classmethod
    def require_synthetic_name(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized.lower().startswith(("synthetic ", "demo ")):
            raise ValueError("Synthetic-only mode requires names beginning with Synthetic or Demo.")
        return normalized

    @field_validator("village")
    @classmethod
    def require_synthetic_village(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized.lower().startswith(("synthetic ", "demo ")):
            raise ValueError("Synthetic-only mode requires village names beginning with Synthetic or Demo.")
        return normalized

    @field_validator("phone")
    @classmethod
    def require_synthetic_phone(cls, value: str | None) -> str | None:
        if value is not None and not value.lower().startswith("synthetic-"):
            raise ValueError("Synthetic-only mode accepts only synthetic phone references.")
        return value


class OrderCreate(StrictModel):
    client_id: str | None = Field(default=None, alias="clientId", min_length=1, max_length=80)
    farmer_id: str = Field(alias="farmerId", min_length=1, max_length=80)
    item: str = Field(min_length=1, max_length=120)
    quantity: float = Field(gt=0, le=1_000_000)
    needed_by: date = Field(alias="neededBy")
    ward: str = Field(min_length=1, max_length=80)
    county: str = Field(default="Busia", min_length=1, max_length=80)
    synthetic: Literal[True] = True


class BlockerTriageRequest(StrictModel):
    description: str = Field(min_length=8, max_length=4000)
    ward: str = Field(min_length=1, max_length=80)


class BlockerCreate(StrictModel):
    client_id: str | None = Field(default=None, alias="clientId", min_length=1, max_length=80)
    farmer_id: str | None = Field(default=None, alias="farmerId", min_length=1, max_length=80)
    category: str = Field(min_length=1, max_length=80)
    description: str = Field(min_length=8, max_length=4000)
    ward: str = Field(min_length=1, max_length=80)
    county: str = Field(default="Busia", min_length=1, max_length=80)
    urgency: Literal["low", "medium", "high"] = "medium"
    confirmed_suggestion: bool = Field(alias="confirmedSuggestion")
    synthetic: Literal[True] = True


class BlockerUpdate(StrictModel):
    status: Literal["open", "acknowledged", "in_progress", "resolved", "cannot_resolve", "closed"] | None = None
    resolution_note: str | None = Field(default=None, alias="resolutionNote", max_length=4000)
    farmer_confirmed: bool | None = Field(default=None, alias="farmerConfirmed")
    assignee_id: str | None = Field(default=None, alias="assigneeId")


class TransactionCreate(StrictModel):
    client_id: str | None = Field(default=None, alias="clientId", min_length=1, max_length=80)
    farmer_id: str | None = Field(default=None, alias="farmerId", min_length=1, max_length=80)
    transaction_type: TransactionType = Field(alias="transactionType")
    category: TransactionCategory = "other"
    amount_kes: float = Field(alias="amountKes", gt=0, le=1_000_000_000)
    counterparty: str | None = Field(default=None, max_length=120)
    transaction_date: date = Field(alias="transactionDate")
    payment_status: PaymentStatus = Field(default="paid", alias="paymentStatus")
    due_date: date | None = Field(default=None, alias="dueDate")
    notes: str | None = Field(default=None, max_length=240)
    synthetic: Literal[True] = True

    @field_validator("category")
    @classmethod
    def normalize_category(cls, value: str) -> str:
        return value.strip()

    @field_validator("counterparty")
    @classmethod
    def require_synthetic_counterparty(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        if not normalized.lower().startswith(("synthetic-", "demo-")):
            raise ValueError("Synthetic-only mode accepts only synthetic counterparty references.")
        return normalized

    @field_validator("notes")
    @classmethod
    def require_synthetic_notes(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        if not normalized.lower().startswith(("synthetic ", "demo ")):
            raise ValueError("Synthetic-only mode requires notes beginning with Synthetic or Demo.")
        return normalized

    @model_validator(mode="after")
    def validate_due_date(self):
        if self.due_date and self.due_date < self.transaction_date:
            raise ValueError("Due date cannot be before the transaction date.")
        return self


class TransactionUpdate(StrictModel):
    transaction_type: TransactionType | None = Field(default=None, alias="transactionType")
    category: TransactionCategory | None = None
    amount_kes: float | None = Field(default=None, alias="amountKes", gt=0, le=1_000_000_000)
    counterparty: str | None = Field(default=None, max_length=120)
    transaction_date: date | None = Field(default=None, alias="transactionDate")
    payment_status: PaymentStatus | None = Field(default=None, alias="paymentStatus")
    due_date: date | None = Field(default=None, alias="dueDate")
    notes: str | None = Field(default=None, max_length=240)

    @field_validator("category")
    @classmethod
    def normalize_category(cls, value: str | None) -> str | None:
        return value.strip() if value is not None else None

    @field_validator("counterparty")
    @classmethod
    def require_synthetic_counterparty(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        if not normalized.lower().startswith(("synthetic-", "demo-")):
            raise ValueError("Synthetic-only mode accepts only synthetic counterparty references.")
        return normalized

    @field_validator("notes")
    @classmethod
    def require_synthetic_notes(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        if not normalized.lower().startswith(("synthetic ", "demo ")):
            raise ValueError("Synthetic-only mode requires notes beginning with Synthetic or Demo.")
        return normalized


class ApplicationPackRequest(StrictModel):
    purpose: Literal["working_capital", "inputs", "equipment", "other"]
    requested_amount_kes: float = Field(alias="requestedAmountKes", gt=0, le=1_000_000_000)
    term_months: int = Field(alias="termMonths", ge=1, le=60)
    include_transactions: bool = Field(default=False, alias="includeTransactions")

class AdoptionIntentionCreate(StrictModel):
    client_id: str | None = Field(default=None, alias="clientId", min_length=1, max_length=80)
    farmer_id: str = Field(alias="farmerId", min_length=1, max_length=80)
    practice: str = Field(min_length=3, max_length=200)
    target_date: date = Field(alias="targetDate")
    synthetic: Literal[True] = True

    @field_validator("practice")
    @classmethod
    def require_synthetic_practice(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized.lower().startswith(("synthetic ", "demo ")):
            raise ValueError("Synthetic-only mode requires practice descriptions beginning with Synthetic or Demo.")
        return normalized


class SyncEntry(StrictModel):
    client_id: str = Field(alias="clientId", min_length=1, max_length=80)
    kind: Literal["farmer", "order", "blocker", "transaction", "intention", "blocker_update", "order_fulfilment"]
    payload: dict[str, Any]
    on_behalf_of: str | None = Field(default=None, alias="onBehalfOf", max_length=80)
    created_at: datetime | None = Field(default=None, alias="createdAt")


class SyncRequest(StrictModel):
    entries: list[SyncEntry] = Field(min_length=1, max_length=100)


class SupplierCommitmentCreate(StrictModel):
    quantity: float = Field(gt=0, le=1_000_000)
    unit_price_kes: float = Field(alias="unitPriceKes", gt=0, le=1_000_000_000)
    quality_evidence_ref: str = Field(alias="qualityEvidenceRef", min_length=1, max_length=200)
    delivery_date: date = Field(alias="deliveryDate")


class ConsentCreate(StrictModel):
    lender_id: str = Field(alias="lenderId", min_length=1, max_length=80)
    purpose: Literal["finance_readiness_review", "input_finance_assessment"]
    expires_at: datetime = Field(alias="expiresAt")


class ProgrammeCostCreate(StrictModel):
    period_start: date = Field(alias="periodStart")
    period_end: date = Field(alias="periodEnd")
    county: str | None = Field(default=None, max_length=80)
    amount_kes: float = Field(alias="amountKes", gt=0, le=10_000_000_000)


class ConfigItemCreate(StrictModel):
    item_type: Literal["county", "value_chain", "ward", "input", "blocker_category"]
    name: str = Field(min_length=1, max_length=120)
    county: str | None = Field(default=None, max_length=80)
    route_to: Role | None = Field(default=None)
    sla_days: int | None = Field(default=None, ge=1, le=365)
