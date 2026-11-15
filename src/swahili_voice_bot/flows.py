"""
EKYAN WhatsApp Flows — structured interaction definitions.

Three flows:
  1. credit_prequalification  → feeds score_farmer()
  2. blocker_report           → feeds save_blocker() with explicit user data
  3. harvest_registration     → feeds /api/v1/market/match

Flow JSON follows WhatsApp Flows spec v3.1.
Each flow is a single-screen form for simplicity (works on all devices).
"""

import json
import os
import logging
import httpx
from datetime import datetime, timezone
from typing import Any

from swahili_voice_bot.blocker_store import save_blocker, BLOCKER_CATEGORIES

log = logging.getLogger("ekyan.flows")

WHATSAPP_TOKEN    = os.getenv("WHATSAPP_ACCESS_TOKEN", "")
WHATSAPP_PHONE_ID = os.getenv("WHATSAPP_PHONE_NUMBER_ID", "")
WHATSAPP_API      = "https://graph.facebook.com/v19.0"

# ── Flow JSON definitions ─────────────────────────────────────────────────────

CREDIT_FLOW: dict = {
    "version": "6.0",
    "screens": [
        {
            "id": "CREDIT_FORM",
            "title": "EKYAN Credit Pre-Qualification",
            "terminal": True,
            "layout": {
                "type": "SingleColumnLayout",
                "children": [
                    {
                        "type": "TextHeading",
                        "text": "Ombi la Mkopo / Loan Application"
                    },
                    {
                        "type": "TextSubheading",
                        "text": "Jibu maswali haya ili tupime sifa yako ya mkopo."
                    },
                    {
                        "type": "TextInput",
                        "label": "Jina lako kamili / Full name",
                        "name": "full_name",
                        "input-type": "text",
                        "required": True
                    },
                    {
                        "type": "TextInput",
                        "label": "Kaunti / County",
                        "name": "county",
                        "input-type": "text",
                        "required": True
                    },
                    {
                        "type": "TextInput",
                        "label": "Ukubwa wa shamba (ekari) / Farm size (acres)",
                        "name": "farm_size_acres",
                        "input-type": "number",
                        "required": True
                    },
                    {
                        "type": "TextInput",
                        "label": "Mapato ya M-Pesa kwa mwezi (KES) / Monthly M-Pesa inflow",
                        "name": "mpesa_monthly_inflow_kes",
                        "input-type": "number",
                        "required": True
                    },
                    {
                        "type": "Dropdown",
                        "label": "Moduli za EKYAN zilizokamilika / EKYAN modules completed",
                        "name": "ekyan_modules_completed",
                        "data-source": [
                            {"id": "0", "title": "0"},
                            {"id": "1", "title": "1"},
                            {"id": "2", "title": "2"},
                            {"id": "3", "title": "3"},
                            {"id": "4", "title": "4"},
                            {"id": "5", "title": "5+"}
                        ],
                        "required": True
                    },
                    {
                        "type": "RadioButtonsGroup",
                        "label": "Je, una kikundi cha chama? / Do you have a chama/savings group?",
                        "name": "has_chama",
                        "data-source": [
                            {"id": "yes", "title": "Ndiyo / Yes"},
                            {"id": "no",  "title": "Hapana / No"}
                        ],
                        "required": True
                    },
                    {
                        "type": "RadioButtonsGroup",
                        "label": "Je, umewahi kulipa mkopo? / Have you repaid a loan before?",
                        "name": "previous_loan_repaid",
                        "data-source": [
                            {"id": "yes",   "title": "Ndiyo / Yes"},
                            {"id": "no",    "title": "Hapana / No"},
                            {"id": "never", "title": "Sijawahi kupata mkopo / Never had a loan"}
                        ],
                        "required": True
                    },
                    {
                        "type": "Footer",
                        "label": "Wasilisha / Submit",
                        "on-click-action": {
                            "name": "complete",
                            "payload": {
                                "flow_type": "credit_prequalification"
                            }
                        }
                    }
                ]
            }
        }
    ]
}

BLOCKER_FLOW: dict = {
    "version": "6.0",
    "screens": [
        {
            "id": "BLOCKER_FORM",
            "title": "Ripoti Tatizo / Report a Blocker",
            "terminal": True,
            "layout": {
                "type": "SingleColumnLayout",
                "children": [
                    {
                        "type": "TextHeading",
                        "text": "Saidia EKYAN kukusaidia vizuri zaidi"
                    },
                    {
                        "type": "TextSubheading",
                        "text": "Tueleze tatizo unalokabili shambani."
                    },
                    {
                        "type": "TextInput",
                        "label": "Kaunti / County",
                        "name": "county",
                        "input-type": "text",
                        "required": True
                    },
                    {
                        "type": "Dropdown",
                        "label": "Aina ya tatizo / Blocker type",
                        "name": "category",
                        "data-source": [
                            {"id": "inputs",  "title": "Mbegu/Mbolea/Dawa (Inputs)"},
                            {"id": "finance", "title": "Mkopo/Pesa (Finance/Credit)"},
                            {"id": "market",  "title": "Soko/Bei (Market/Price)"},
                            {"id": "climate", "title": "Hali ya Hewa (Climate/Weather)"},
                            {"id": "other",   "title": "Nyingine / Other"}
                        ],
                        "required": True
                    },
                    {
                        "type": "TextArea",
                        "label": "Elezea tatizo kwa undani / Describe the problem",
                        "name": "description",
                        "required": True
                    },
                    {
                        "type": "Footer",
                        "label": "Tuma / Send",
                        "on-click-action": {
                            "name": "complete",
                            "payload": {
                                "flow_type": "blocker_report"
                            }
                        }
                    }
                ]
            }
        }
    ]
}

HARVEST_FLOW: dict = {
    "version": "6.0",
    "screens": [
        {
            "id": "HARVEST_FORM",
            "title": "Sajili Mavuno / Register Harvest",
            "terminal": True,
            "layout": {
                "type": "SingleColumnLayout",
                "children": [
                    {
                        "type": "TextHeading",
                        "text": "Pata Mnunuzi wa Moja kwa Moja"
                    },
                    {
                        "type": "TextSubheading",
                        "text": "Sajili mavuno yako ili tupate mnunuzi bora."
                    },
                    {
                        "type": "TextInput",
                        "label": "Kaunti / County",
                        "name": "county",
                        "input-type": "text",
                        "required": True
                    },
                    {
                        "type": "Dropdown",
                        "label": "Zao / Commodity",
                        "name": "commodity",
                        "data-source": [
                            {"id": "tomatoes",  "title": "Nyanya / Tomatoes"},
                            {"id": "maize",     "title": "Mahindi / Maize"},
                            {"id": "beans",     "title": "Maharagwe / Beans"},
                            {"id": "kale",      "title": "Sukuma Wiki / Kale"},
                            {"id": "potatoes",  "title": "Viazi / Potatoes"},
                            {"id": "onions",    "title": "Vitunguu / Onions"},
                            {"id": "avocado",   "title": "Parachichi / Avocado"},
                            {"id": "other",     "title": "Nyingine / Other"}
                        ],
                        "required": True
                    },
                    {
                        "type": "TextInput",
                        "label": "Uzito wa mavuno (kg) / Harvest volume (kg)",
                        "name": "volume_kg",
                        "input-type": "number",
                        "required": True
                    },
                    {
                        "type": "DatePicker",
                        "label": "Tarehe ya mavuno / Harvest date",
                        "name": "harvest_date",
                        "required": True
                    },
                    {
                        "type": "RadioButtonsGroup",
                        "label": "Daraja la ubora / Quality grade",
                        "name": "quality_grade",
                        "data-source": [
                            {"id": "A", "title": "A — Bora sana / Excellent"},
                            {"id": "B", "title": "B — Nzuri / Good"},
                            {"id": "C", "title": "C — Wastani / Average"}
                        ],
                        "required": True
                    },
                    {
                        "type": "Footer",
                        "label": "Sajili / Register",
                        "on-click-action": {
                            "name": "complete",
                            "payload": {
                                "flow_type": "harvest_registration"
                            }
                        }
                    }
                ]
            }
        }
    ]
}

FLOWS = {
    "credit_prequalification": CREDIT_FLOW,
    "blocker_report":          BLOCKER_FLOW,
    "harvest_registration":    HARVEST_FLOW,
}

# ── Send a Flow trigger message ───────────────────────────────────────────────

async def send_flow_message(to: str, flow_id: str, flow_type: str, header: str, body: str) -> None:
    """Send a WhatsApp Flow CTA message to open a structured form."""
    if not WHATSAPP_TOKEN or not WHATSAPP_PHONE_ID:
        log.warning("WhatsApp credentials not set — skipping flow send")
        return

    payload = {
        "messaging_product": "whatsapp",
        "to": to,
        "type": "interactive",
        "interactive": {
            "type": "flow",
            "header": {"type": "text", "text": header},
            "body":   {"text": body},
            "footer": {"text": "EKYAN Connect — UNICEF Kenya"},
            "action": {
                "name": "flow",
                "parameters": {
                    "flow_message_version": "3",
                    "flow_token": f"ekyan_{flow_type}_{to[-6:]}",
                    "flow_id": flow_id,
                    "flow_cta": "Fungua Fomu / Open Form",
                    "flow_action": "navigate",
                    "flow_action_payload": {
                        "screen": list(FLOWS[flow_type]["screens"][0]["id"].split())[0]
                    }
                }
            }
        }
    }

    async with httpx.AsyncClient(timeout=10.0) as client:
        r = await client.post(
            f"{WHATSAPP_API}/{WHATSAPP_PHONE_ID}/messages",
            headers={"Authorization": f"Bearer {WHATSAPP_TOKEN}"},
            json=payload,
        )
        if r.status_code >= 400:
            log.error(f"Flow send failed {r.status_code}: {r.text}")
        else:
            log.info(f"Flow '{flow_type}' sent to ...{to[-4:]}")


# ── Handle completed flow submission (nfm_reply) ──────────────────────────────

async def handle_flow_response(farmer_phone: str, flow_token: str, response_json: dict) -> dict:
    """
    Process a completed WhatsApp Flow submission.
    Returns a dict with action taken and any result data.
    """
    flow_type = response_json.get("flow_type", "")
    data: dict[str, Any] = response_json  # all form fields are top-level

    if flow_type == "credit_prequalification":
        return await _handle_credit_flow(farmer_phone, data)

    if flow_type == "blocker_report":
        return await _handle_blocker_flow(farmer_phone, data)

    if flow_type == "harvest_registration":
        return await _handle_harvest_flow(farmer_phone, data)

    log.warning(f"Unknown flow_type '{flow_type}' from ...{farmer_phone[-4:]}")
    return {"action": "unknown", "flow_type": flow_type}


async def _handle_credit_flow(farmer_phone: str, data: dict) -> dict:
    """Forward credit flow data to the scoring engine and return result."""
    import httpx as _httpx
    api_base = os.getenv("INTERNAL_API_URL", "http://localhost:8000")

    previous_loan_repaid = None
    raw = data.get("previous_loan_repaid", "never")
    if raw == "yes":
        previous_loan_repaid = True
    elif raw == "no":
        previous_loan_repaid = False

    modules_raw = data.get("ekyan_modules_completed", "0")
    try:
        modules = int(modules_raw) if modules_raw != "5+" else 5
    except ValueError:
        modules = 0

    payload = {
        "farmer_id": farmer_phone,
        "ekyan_modules_completed": modules,
        "mpesa_monthly_inflow_kes": float(data.get("mpesa_monthly_inflow_kes", 0)),
        "mpesa_consistency_score": 0.6,   # default; enriched later via M-Pesa API
        "chama_savings_months": 6 if data.get("has_chama") == "yes" else 0,
        "farm_size_acres": float(data.get("farm_size_acres", 1.0)),
        "previous_loan_repaid": previous_loan_repaid,
        "peer_endorsements": 0,
        "cooperative_standing": 0.5,
        "mentor_verified": False,
        "deliveries_completed": 0,
        "delivery_adherence_rate": 0.0,
        "ndvi_season1": 0.35,
        "ndvi_season2": 0.35,
        "quiz_avg_score": 0.0,
        "demo_days_attended": 0,
    }

    try:
        async with _httpx.AsyncClient(timeout=10.0) as client:
            r = await client.post(f"{api_base}/api/v1/credit/score", json=payload)
            result = r.json()
    except Exception as e:
        log.error(f"Credit scoring call failed: {e}")
        result = {"error": str(e)}

    log.info(f"Credit flow processed for ...{farmer_phone[-4:]}: {result.get('risk_tier', 'error')}")
    return {"action": "credit_scored", "result": result}


async def _handle_blocker_flow(farmer_phone: str, data: dict) -> dict:
    """Save structured blocker from flow form to SQS."""
    category = data.get("category", "other")
    county   = data.get("county", "Unknown")
    message  = data.get("description", "")

    saved = await save_blocker(
        farmer_phone=farmer_phone,
        message=message,
        county=county,
        language="swahili",   # form is bilingual; default to swahili for M&E
        category=category,
    )
    log.info(f"Blocker flow saved={saved} cat={category} county={county}")
    return {"action": "blocker_saved", "category": category, "saved": saved}


async def _handle_harvest_flow(farmer_phone: str, data: dict) -> dict:
    """Store harvest registration in SQS for async buyer matching."""
    import json as _json
    from aws_clients import get_sqs, NUDGE_QUEUE

    record = {
        "farmer_id": farmer_phone,
        "county":        data.get("county", "Unknown"),
        "commodity":     data.get("commodity", "other"),
        "volume_kg":     float(data.get("volume_kg", 0)),
        "harvest_date":  data.get("harvest_date", datetime.now(timezone.utc).date().isoformat()),
        "quality_grade": data.get("quality_grade", "B"),
        "source":        "whatsapp_flow",
        "created_at":    datetime.now(timezone.utc).isoformat(),
    }

    try:
        get_sqs().send_message(
            QueueUrl=NUDGE_QUEUE,
            MessageBody=_json.dumps(record),
            MessageAttributes={
                "type":      {"StringValue": "harvest_registration", "DataType": "String"},
                "commodity": {"StringValue": record["commodity"],    "DataType": "String"},
            },
        )
        saved = True
    except Exception as e:
        log.error(f"Harvest SQS send failed: {e}")
        saved = False

    log.info(f"Harvest flow saved={saved} {record['commodity']} {record['volume_kg']}kg")
    return {"action": "harvest_registered", "commodity": record["commodity"], "saved": saved}
