"""
EKYAN Connect — WhatsApp Notification Service
Dispatches WhatsApp messages for key platform events:
- Blocker escalation / status change
- Supplier commitment received
- Order fulfilled
- Consent granted/revoked
"""
from __future__ import annotations

import logging
import os
from typing import Any

import httpx

log = logging.getLogger("ekyan.notifications")

WHATSAPP_TOKEN = os.getenv("WHATSAPP_ACCESS_TOKEN", "")
WHATSAPP_PHONE_ID = os.getenv("WHATSAPP_PHONE_NUMBER_ID", "")
WHATSAPP_API = "https://graph.facebook.com/v19.0"


async def _send(to: str, body: str) -> bool:
    """Send a WhatsApp text message. Returns True on success."""
    if not WHATSAPP_TOKEN or not WHATSAPP_PHONE_ID:
        log.info("WhatsApp not configured — notification skipped (to=...%s)", to[-4:] if len(to) >= 4 else to)
        return False
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            response = await client.post(
                f"{WHATSAPP_API}/{WHATSAPP_PHONE_ID}/messages",
                headers={"Authorization": f"Bearer {WHATSAPP_TOKEN}"},
                json={
                    "messaging_product": "whatsapp",
                    "to": to,
                    "type": "text",
                    "text": {"body": body},
                },
            )
            if response.status_code >= 400:
                log.warning("WhatsApp send failed %s: %s", response.status_code, response.text[:200])
                return False
            return True
    except Exception as exc:
        log.warning("WhatsApp send error: %s", exc)
        return False


def _is_real_phone(phone: str) -> bool:
    """Only dispatch to real E.164 phone numbers, not synthetic IDs."""
    cleaned = phone.strip().replace(" ", "").replace("-", "")
    return cleaned.startswith("+") and cleaned[1:].isdigit() and len(cleaned) >= 10


async def notify_blocker_escalated(
    agripreneur_phone: str | None,
    blocker_id: str,
    category: str,
    urgency: str,
) -> None:
    """Notify agripreneur when their blocker is escalated to programme manager."""
    if not agripreneur_phone or not _is_real_phone(agripreneur_phone):
        return
    body = (
        f"⚠️ EKYAN Connect: Your {category} blocker ({blocker_id[:8]}…) "
        f"has been escalated to the programme manager due to an overdue response deadline. "
        f"Urgency: {urgency}. Your agripreneur coordinator will follow up shortly."
    )
    await _send(agripreneur_phone, body)


async def notify_blocker_resolved(
    agripreneur_phone: str | None,
    blocker_id: str,
    category: str,
    resolution_note: str,
) -> None:
    """Notify agripreneur when their blocker is resolved."""
    if not agripreneur_phone or not _is_real_phone(agripreneur_phone):
        return
    body = (
        f"✅ EKYAN Connect: Your {category} blocker ({blocker_id[:8]}…) has been resolved. "
        f"Note: {resolution_note[:120]}. "
        f"Please confirm with your agripreneur that the resolution was effective."
    )
    await _send(agripreneur_phone, body)


async def notify_supplier_commitment(
    agripreneur_phone: str | None,
    item: str,
    quantity: float,
    unit_price_kes: float,
    delivery_date: str,
) -> None:
    """Notify agripreneur when a supplier commits to their pooled demand."""
    if not agripreneur_phone or not _is_real_phone(agripreneur_phone):
        return
    body = (
        f"📦 EKYAN Connect: A supplier has committed to your pooled demand for {item}. "
        f"Quantity: {quantity:g} · Price: KES {unit_price_kes:,.0f}/unit · "
        f"Delivery: {delivery_date}. "
        f"Log in to EKYAN Connect to review and confirm."
    )
    await _send(agripreneur_phone, body)


async def notify_order_fulfilled(
    agripreneur_phone: str | None,
    item: str,
    quantity: float,
) -> None:
    """Notify agripreneur when their order is marked fulfilled."""
    if not agripreneur_phone or not _is_real_phone(agripreneur_phone):
        return
    body = (
        f"✅ EKYAN Connect: Your order for {quantity:g} units of {item} has been confirmed as fulfilled. "
        f"Please update your business book with the transaction."
    )
    await _send(agripreneur_phone, body)


async def notify_consent_granted(
    agripreneur_phone: str | None,
    lender_id: str,
    purpose: str,
    expires_at: str,
) -> None:
    """Confirm to agripreneur that consent was granted."""
    if not agripreneur_phone or not _is_real_phone(agripreneur_phone):
        return
    body = (
        f"🔒 EKYAN Connect: You have granted consent to {lender_id} "
        f"for purpose: {purpose.replace('_', ' ')}. "
        f"This consent expires on {expires_at[:10]}. "
        f"You can revoke it at any time in EKYAN Connect."
    )
    await _send(agripreneur_phone, body)


async def notify_consent_revoked(
    agripreneur_phone: str | None,
    lender_id: str,
) -> None:
    """Confirm to agripreneur that consent was revoked."""
    if not agripreneur_phone or not _is_real_phone(agripreneur_phone):
        return
    body = (
        f"🔒 EKYAN Connect: Your consent for {lender_id} has been revoked. "
        f"They can no longer access your finance profile."
    )
    await _send(agripreneur_phone, body)


async def notify_climate_nudge(
    agripreneur_phone: str | None,
    county: str,
    nudges: list[dict[str, Any]],
) -> None:
    """Send daily climate nudge to agripreneur."""
    if not agripreneur_phone or not _is_real_phone(agripreneur_phone):
        return
    if not nudges:
        return
    high = [n for n in nudges if n.get("severity") == "high"]
    top = high[0] if high else nudges[0]
    body = (
        f"🌤️ EKYAN Climate · {county}: {top.get('english', '')} "
        f"/ {top.get('swahili', '')} "
        f"{'⚠️ Action required.' if top.get('action_required') else ''}"
    )
    await _send(agripreneur_phone, body)
