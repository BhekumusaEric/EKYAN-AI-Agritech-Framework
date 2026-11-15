"""
EKYAN Connect — AI Pocket Agronomist
WhatsApp Cloud API webhook + Gemini Flash "Daktari wa Mimea" bot.
"""

import os
import json
import hmac
import hashlib
import logging
from typing import Optional

import httpx
from google import genai
from fastapi import FastAPI, Request, HTTPException, BackgroundTasks
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel
from dotenv import load_dotenv

from swahili_voice_bot.blocker_store import detect_blocker_category, save_blocker
from swahili_voice_bot.flows import handle_flow_response, send_flow_message, FLOWS

load_dotenv()

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("ekyan.agronomist")

WHATSAPP_TOKEN        = os.getenv("WHATSAPP_ACCESS_TOKEN", "")
WHATSAPP_PHONE_ID     = os.getenv("WHATSAPP_PHONE_NUMBER_ID", "")
WHATSAPP_VERIFY_TOKEN = os.getenv("WHATSAPP_VERIFY_TOKEN", "ekyan_verify")
WHATSAPP_APP_SECRET   = os.getenv("WHATSAPP_APP_SECRET", "")   # Meta app secret for sig verification
GEMINI_API_KEY        = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY", "")

gemini_client = genai.Client(api_key=GEMINI_API_KEY) if GEMINI_API_KEY else None

SYSTEM_PROMPT = """You are "Daktari wa Mimea" (Plant Doctor), an expert agronomist assistant \
for youth farmers in Kenya under the UNICEF EKYAN programme.

Rules you must always follow:
1. Respond in clear, friendly Swahili by default. Switch to English only if the farmer writes in English.
2. Prioritize low-cost, organic, regenerative solutions: wood ash, neem extract, crop rotation, composting, companion planting.
3. NEVER recommend synthetic pesticides or expensive chemical inputs.
4. Keep answers to 3 concise bullet points maximum.
5. If the farmer mentions they cannot get inputs, seeds, fertilizer, credit, loans, buyers, \
or is facing drought/flood — acknowledge the blocker and tell them EKYAN Connect has logged it \
for follow-up by their agripreneur coordinator.
6. Include one preventative tip at the end.
7. Always end with an encouraging phrase in Swahili."""

WHATSAPP_API = "https://graph.facebook.com/v19.0"

app = FastAPI(
    title="EKYAN Daktari wa Mimea",
    description="WhatsApp AI Agronomist for EKYAN Youth Farmers — UNICEF Kenya",
    version="1.0.0",
)


# ── Security: verify Meta webhook signature ───────────────────────────────────

def verify_whatsapp_signature(payload: bytes, signature_header: str) -> bool:
    """Verify X-Hub-Signature-256 from Meta to prevent spoofed webhooks."""
    if not WHATSAPP_APP_SECRET:
        return True  # skip in dev when secret not set
    if not signature_header.startswith("sha256="):
        return False
    expected = hmac.new(
        WHATSAPP_APP_SECRET.encode(),
        payload,
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(expected, signature_header[7:])


# ── WhatsApp send helper ──────────────────────────────────────────────────────

async def send_whatsapp_message(to: str, text: str) -> None:
    if not WHATSAPP_TOKEN or not WHATSAPP_PHONE_ID:
        log.warning("WhatsApp credentials not set — skipping send")
        return
    async with httpx.AsyncClient(timeout=10.0) as client:
        r = await client.post(
            f"{WHATSAPP_API}/{WHATSAPP_PHONE_ID}/messages",
            headers={"Authorization": f"Bearer {WHATSAPP_TOKEN}"},
            json={
                "messaging_product": "whatsapp",
                "to": to,
                "type": "text",
                "text": {"body": text},
            },
        )
        if r.status_code >= 400:
            log.error(f"WhatsApp send failed {r.status_code}: {r.text}")


def detect_language(text: str) -> str:
    swahili_markers = ["habari", "shamba", "mimea", "mkulima", "mbegu", "mvua",
                       "ugonjwa", "dawa", "bei", "soko", "mkopo", "pesa", "nina",
                       "nataka", "sijui", "tafadhali", "asante", "karibu"]
    hits = sum(1 for w in swahili_markers if w in text.lower())
    return "swahili" if hits >= 1 else "english"


async def handle_farmer_message(farmer_phone: str, message_text: str, county: str = "Unknown") -> None:
    language = detect_language(message_text)

    blocker_category = detect_blocker_category(message_text)
    if blocker_category:
        saved = await save_blocker(
            farmer_phone=farmer_phone,
            message=message_text,
            county=county,
            language=language,
            category=blocker_category,
        )
        log.info(f"Blocker logged: {blocker_category} | saved={saved} | phone=...{farmer_phone[-4:]}")

    try:
        prompt = f"{SYSTEM_PROMPT}\n\nFarmer message: {message_text}"
        response = gemini_client.models.generate_content(model="gemini-2.0-flash", contents=prompt)
        reply = response.text.strip()
    except Exception as e:
        log.error(f"Gemini error: {e}")
        reply = (
            "Samahani, kuna tatizo la mfumo kwa sasa. Tafadhali jaribu tena baadaye. "
            "Sorry, there is a system issue. Please try again shortly."
        )

    await send_whatsapp_message(farmer_phone, reply)
    log.info(f"Reply sent to ...{farmer_phone[-4:]} | lang={language} | blocker={blocker_category}")


# ── Webhook routes ────────────────────────────────────────────────────────────

@app.get("/webhook")
async def verify_webhook(request: Request):
    params = request.query_params
    if (
        params.get("hub.mode") == "subscribe"
        and params.get("hub.verify_token") == WHATSAPP_VERIFY_TOKEN
    ):
        return PlainTextResponse(params.get("hub.challenge", ""))
    raise HTTPException(status_code=403, detail="Verification failed")


@app.post("/webhook")
async def receive_webhook(request: Request, background: BackgroundTasks):
    raw_body = await request.body()

    # Verify signature if app secret is configured
    sig = request.headers.get("X-Hub-Signature-256", "")
    if not verify_whatsapp_signature(raw_body, sig):
        raise HTTPException(status_code=401, detail="Invalid signature")

    try:
        body = await request.json()
    except Exception:
        body = {}

    try:
        entry = body["entry"][0]["changes"][0]["value"]
        message = entry["messages"][0]
        farmer_phone = message["from"]
        message_text = message.get("text", {}).get("body", "")
        contacts = entry.get("contacts", [{}])
        county = contacts[0].get("profile", {}).get("name", "Unknown")

        if message_text:
            background.add_task(handle_farmer_message, farmer_phone, message_text, county)

        # Handle completed WhatsApp Flow submission (nfm_reply)
        elif message.get("type") == "interactive":
            interactive = message.get("interactive", {})
            if interactive.get("type") == "nfm_reply":
                flow_response = interactive.get("nfm_reply", {})
                response_json = json.loads(flow_response.get("response_json", "{}"))
                flow_token    = flow_response.get("flow_token", "")
                background.add_task(
                    _process_flow_and_reply,
                    farmer_phone, flow_token, response_json
                )
    except (KeyError, IndexError):
        pass

    return {"status": "ok"}


async def _process_flow_and_reply(farmer_phone: str, flow_token: str, response_json: dict) -> None:
    """Background task: process flow submission and send confirmation message."""
    result = await handle_flow_response(farmer_phone, flow_token, response_json)
    flow_type = response_json.get("flow_type", "")

    if flow_type == "credit_prequalification":
        r = result.get("result", {})
        approved = r.get("approved", False)
        msg = (
            f"✅ Ombi lako la mkopo limepokewa!\n"
            f"Alama yako: {r.get('aci_score', 'N/A')}/100 ({r.get('risk_tier', '')})\n"
            f"{'✅ Umeidhinishwa!' if approved else '⚠️ Endelea kukuza alama yako.'}"
        )
    elif flow_type == "blocker_report":
        msg = (
            "✅ Tatizo lako limeandikwa. Mratibu wako wa EKYAN atawasiliana nawe hivi karibuni. "
            "Asante kwa kuripoti!"
        )
    elif flow_type == "harvest_registration":
        msg = (
            "✅ Mavuno yako yamesajiliwa! Tutakutafutia mnunuzi wa moja kwa moja. "
            "Utapata ujumbe ndani ya masaa 24. Hongera!"
        )
    else:
        msg = "✅ Fomu yako imepokewa. Asante!"

    await send_whatsapp_message(farmer_phone, msg)


# ── Direct chat API (testing + USSD/SMS fallback) ────────────────────────────

class ChatRequest(BaseModel):
    farmer_phone: str
    message: str
    county: str = "Unknown"


class ChatResponse(BaseModel):
    reply: str
    language: str
    blocker_detected: Optional[str]
    blocker_logged: bool


@app.post("/api/v1/chat", response_model=ChatResponse)
async def chat_direct(req: ChatRequest):
    language = detect_language(req.message)
    blocker_category = detect_blocker_category(req.message)

    blocker_logged = False
    if blocker_category:
        blocker_logged = await save_blocker(
            farmer_phone=req.farmer_phone,
            message=req.message,
            county=req.county,
            language=language,
            category=blocker_category,
        )

    try:
        prompt = f"{SYSTEM_PROMPT}\n\nFarmer message: {req.message}"
        response = gemini_client.models.generate_content(model="gemini-2.0-flash", contents=prompt)
        reply = response.text.strip()
    except Exception as e:
        log.error(f"Gemini error: {e}")
        reply = "Samahani, kuna tatizo la mfumo. / System error, please retry."

    return ChatResponse(
        reply=reply,
        language=language,
        blocker_detected=blocker_category,
        blocker_logged=blocker_logged,
    )


# ── Flow trigger endpoint ─────────────────────────────────────────────────────

FLOW_META = {
    "credit_prequalification": {
        "header": "💳 Ombi la Mkopo / Loan Application",
        "body":   "Jaza fomu hii ili tupime sifa yako ya mkopo bila dhamana. / Fill this form to check your loan eligibility without collateral.",
    },
    "blocker_report": {
        "header": "🚨 Ripoti Tatizo / Report a Problem",
        "body":   "Tueleze tatizo unalokabili shambani ili EKYAN ikuandikie suluhisho. / Tell us what's blocking you so EKYAN can help.",
    },
    "harvest_registration": {
        "header": "🌽 Sajili Mavuno / Register Your Harvest",
        "body":   "Pata mnunuzi wa moja kwa moja — bila dalali. / Get a direct buyer — no broker.",
    },
}


class FlowTriggerRequest(BaseModel):
    farmer_phone: str
    flow_type: str          # credit_prequalification | blocker_report | harvest_registration
    flow_id: str            # Meta-assigned Flow ID from the Flows Manager


@app.post("/api/v1/flows/send")
async def trigger_flow(req: FlowTriggerRequest):
    if req.flow_type not in FLOWS:
        raise HTTPException(status_code=400, detail=f"Unknown flow_type '{req.flow_type}'")
    meta = FLOW_META[req.flow_type]
    await send_flow_message(
        to=req.farmer_phone,
        flow_id=req.flow_id,
        flow_type=req.flow_type,
        header=meta["header"],
        body=meta["body"],
    )
    return {"status": "sent", "flow_type": req.flow_type, "to": req.farmer_phone}


@app.get("/api/v1/flows/definitions")
def list_flow_definitions():
    """Returns the Flow JSON for all 3 flows — upload these to Meta Flows Manager."""
    return {flow_type: flow_json for flow_type, flow_json in FLOWS.items()}


@app.get("/health")
def health():
    return {
        "status": "healthy",
        "service": "EKYAN Daktari wa Mimea",
        "whatsapp_configured": bool(WHATSAPP_TOKEN and WHATSAPP_PHONE_ID),
        "signature_verification": bool(WHATSAPP_APP_SECRET),
        "llm_configured": bool(GEMINI_API_KEY),
        "flows_available": list(FLOWS.keys()),
    }
