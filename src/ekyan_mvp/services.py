from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from .models import (
    AuditLog,
    BusinessTransaction,
    ConfigItem,
    FieldOrder,
    Farmer,
)

DEFAULT_CATEGORY_ROUTES = {
    "inputs": "supplier",
    "finance": "lender",
    "disease": "extension_officer",
    "water": "extension_officer",
    "land access": "extension_officer",
    "labour": "extension_officer",
    "time": "extension_officer",
    "market": "buyer",
}

TRIAGE_KEYWORDS = {
    "Disease": ("disease", "sick", "ill", "poultry", "vaccine", "ugonjwa", "kuku"),
    "Water": ("water", "dry", "drought", "maji", "ukame"),
    "Finance": ("loan", "credit", "money", "finance", "mkopo", "pesa"),
    "Inputs": ("feed", "seed", "vaccine", "input", "chick", "mbegu", "chakula"),
    "Market": ("buyer", "market", "price", "sell", "soko", "mnunuzi", "bei"),
    "Land access": ("land", "plot", "shamba"),
    "Labour": ("labour", "worker", "help", "kazi"),
    "Time": ("time", "delay", "late", "muda"),
}


def audit(
    session: Session,
    *,
    actor_id: str,
    action: str,
    entity: str,
    entity_id: str | None = None,
    on_behalf_of: str | None = None,
    metadata: dict[str, Any] | None = None,
) -> None:
    session.add(
        AuditLog(
            actor_id=actor_id,
            action=action,
            entity=entity,
            entity_id=entity_id,
            on_behalf_of=on_behalf_of,
            metadata_json=metadata or {},
            created_at=datetime.now(timezone.utc),
        )
    )


def category_route(session: Session, category: str) -> tuple[str, int]:
    normalized = category.strip().casefold()
    item = session.scalar(
        select(ConfigItem).where(
            ConfigItem.item_type == "blocker_category",
            ConfigItem.active.is_(True),
            ConfigItem.name.ilike(category.strip()),
        )
    )
    if item:
        return item.route_to or "extension_officer", item.sla_days or 7
    return DEFAULT_CATEGORY_ROUTES.get(normalized, "extension_officer"), 7


def triage_blocker(description: str) -> dict[str, Any]:
    normalized = description.casefold()
    scores = {
        category: sum(1 for keyword in keywords if keyword in normalized)
        for category, keywords in TRIAGE_KEYWORDS.items()
    }
    category, matches = max(scores.items(), key=lambda item: item[1])
    if matches == 0:
        category = "Other"
    urgency = "high" if any(word in normalized for word in ("urgent", "emergency", "critical", "haraka")) else "medium"
    return {
        "category": category,
        "urgency": urgency,
        "confidence": "low" if matches <= 1 else "medium",
        "rationale": "Keyword-based suggestion only; an agripreneur must confirm or edit before routing.",
        "source": "ekyan-rule-triage-v1",
    }


def week_start(value: date) -> date:
    return value - timedelta(days=value.weekday())


def _month_start(value: date, months_back: int) -> date:
    year = value.year
    month = value.month - months_back
    while month <= 0:
        year -= 1
        month += 12
    return date(year, month, 1)


def readiness_profile(session: Session, agripreneur_id: str) -> dict[str, Any]:
    today = date.today()
    first_month = _month_start(today, 5)
    all_transactions = session.scalars(
        select(BusinessTransaction).where(
            BusinessTransaction.agripreneur_id == agripreneur_id
        )
    ).all()
    transactions = [
        entry for entry in all_transactions if entry.transaction_date >= first_month
    ]
    orders = session.scalars(
        select(FieldOrder).where(FieldOrder.agripreneur_id == agripreneur_id)
    ).all()
    month_starts = [_month_start(today, offset) for offset in range(5, -1, -1)]
    month_transactions = {
        month.strftime("%Y-%m"): [
            entry
            for entry in transactions
            if entry.transaction_date.strftime("%Y-%m") == month.strftime("%Y-%m")
        ]
        for month in month_starts
    }
    income_types = {"sale", "service", "other_income"}
    expense_types = {"purchase", "other_expense"}
    cash_in_types = income_types | {"loan_received", "savings_out", "owner_in"}
    cash_out_types = expense_types | {"loan_repayment", "savings_deposit", "owner_out"}

    def amount_for(entries: list[BusinessTransaction], kinds: set[str]) -> float:
        return sum(entry.amount_kes for entry in entries if entry.transaction_type in kinds)

    def paid_amount_for(entries: list[BusinessTransaction], kinds: set[str]) -> float:
        return sum(
            entry.amount_kes
            for entry in entries
            if entry.transaction_type in kinds and entry.payment_status == "paid"
        )

    monthly_summary = []
    for month in month_starts:
        key = month.strftime("%Y-%m")
        entries = month_transactions[key]
        income = amount_for(entries, income_types)
        expenses = amount_for(entries, expense_types)
        cash_in = paid_amount_for(entries, cash_in_types)
        cash_out = paid_amount_for(entries, cash_out_types)
        monthly_summary.append(
            {
                "month": key,
                "status": "recorded" if entries else "no_records",
                "entry_count": len(entries),
                "recorded_income_kes": round(income, 2),
                "income_received_kes": round(paid_amount_for(entries, income_types), 2),
                "operating_expenses_kes": round(expenses, 2),
                "expenses_paid_kes": round(paid_amount_for(entries, expense_types), 2),
                "loan_received_kes": round(paid_amount_for(entries, {"loan_received"}), 2),
                "loan_repayment_kes": round(paid_amount_for(entries, {"loan_repayment"}), 2),
                "savings_deposit_kes": round(paid_amount_for(entries, {"savings_deposit"}), 2),
                "savings_withdrawal_kes": round(paid_amount_for(entries, {"savings_out"}), 2),
                "unpaid_income_kes": round(
                    sum(
                        entry.amount_kes
                        for entry in entries
                        if entry.transaction_type in income_types and entry.payment_status == "unpaid"
                    ),
                    2,
                ),
                "unpaid_expenses_kes": round(
                    sum(
                        entry.amount_kes
                        for entry in entries
                        if entry.transaction_type in expense_types and entry.payment_status == "unpaid"
                    ),
                    2,
                ),
                "net_cash_movement_kes": round(cash_in - cash_out, 2),
            }
        )

    revenue = amount_for(transactions, income_types)
    expenses = amount_for(transactions, expense_types)
    operating_surplus = revenue - expenses
    loan_receipts = paid_amount_for(all_transactions, {"loan_received"})
    loan_repayments = paid_amount_for(all_transactions, {"loan_repayment"})
    savings_deposits = paid_amount_for(all_transactions, {"savings_deposit"})
    savings_withdrawals = paid_amount_for(all_transactions, {"savings_out"})
    customer_ids = {
        entry.farmer_id
        for entry in transactions
        if entry.farmer_id is not None and entry.transaction_type in income_types
    }
    customer_ids.update(order.farmer_id for order in orders)
    months_with_income = sum(
        1 for entries in month_transactions.values() if amount_for(entries, income_types) > 0
    )
    months_with_expenses = sum(
        1 for entries in month_transactions.values() if amount_for(entries, expense_types) > 0
    )
    months_with_entries = sum(1 for entries in month_transactions.values() if entries)
    unpaid_without_due_date = sum(
        1
        for entry in transactions
        if entry.payment_status == "unpaid" and entry.due_date is None
    )
    record_checks = [
        {
            "id": "income_records",
            "status": "complete" if months_with_income else "attention",
            "count": months_with_income,
        },
        {
            "id": "expense_records",
            "status": "complete" if months_with_expenses else "attention",
            "count": months_with_expenses,
        },
        {
            "id": "unpaid_due_dates",
            "status": "complete" if unpaid_without_due_date == 0 else "attention",
            "count": unpaid_without_due_date,
        },
    ]
    unpaid_income = sum(
        entry.amount_kes
        for entry in transactions
        if entry.transaction_type in income_types and entry.payment_status == "unpaid"
    )
    unpaid_expenses = sum(
        entry.amount_kes
        for entry in transactions
        if entry.transaction_type in expense_types and entry.payment_status == "unpaid"
    )
    farmer_count = len(
        session.scalars(
            select(Farmer.id).where(Farmer.agripreneur_id == agripreneur_id)
        ).all()
    )
    return {
        "agripreneur_id": agripreneur_id,
        "decision_notice": "This is an informational summary of synthetic, self-reported records, not a credit score, eligibility decision, or loan approval.",
        "period": {"from": first_month.isoformat(), "to": today.isoformat()},
        "business": {
            "revenue_kes": round(revenue, 2),
            "expenses_kes": round(expenses, 2),
            "operating_surplus_kes": round(operating_surplus, 2),
            "unpaid_income_kes": round(unpaid_income, 2),
            "unpaid_expenses_kes": round(unpaid_expenses, 2),
            "customer_count": len(customer_ids),
            "farmer_records": farmer_count,
            "existing_obligations_kes": round(max(0.0, loan_receipts - loan_repayments), 2),
            "obligations_status": "estimate_from_recorded_entries" if loan_receipts or loan_repayments else "not_recorded",
            "savings_balance_estimate_kes": round(max(0.0, savings_deposits - savings_withdrawals), 2),
        },
        "record_coverage": {
            "months_with_entries": months_with_entries,
            "months_with_income": months_with_income,
            "months_with_expenses": months_with_expenses,
            "months_in_period": len(month_starts),
            "entry_count": len(transactions),
            "unpaid_without_due_date": unpaid_without_due_date,
        },
        "record_checks": record_checks,
        "monthly_summary": monthly_summary,
        "protected_characteristics_used": [],
        "synthetic": True,
    }
