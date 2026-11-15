"""
EKYAN Connect — AI Pocket Agronomist
WhatsApp Cloud API webhook + Gemini Flash "Daktari wa Mimea" bot.
Solves BRS P01 (blockers), P05 (advisory).
"""

import os
import hmac
import hashlib
import logging
from typing import Optional

import httpx
from google import genai
from google.genai import types
from fastapi import FastAPI, Request, HTTPException, BackgroundTasks
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel
from dotenv import load_dotenv

from swahili_voice_bot.blocker_store import detect_blocker_category, save_blocker

load_dotenv()

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("ekyan.agronomist")

# ── Config ────────────────────────────────────────────────────────────────────
WHATSAPP_TOKEN      = os.getenv("WHATSAPP_ACCESS_TOKEN", "")
WHATSAPP_PHONE_ID   = os.getenv("WHATSAPP_PHONE_NUMBER_ID", "")
WHATSAPP_VERIFY_TOKEN = os.getenv("WHATSAPP_VERIFY_TOKEN", "ekyan_verify")
GEMINI_API_KEY      = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY", "")

gemini_client = genai.Client(api_key=GEMINI_API_KEY) if GEMINI_API_KEY else None

# ── System prompt (straight from Module 1 spec) ───────────────────────────────
SYSTEM_PROMPT = """You are "Daktari wa Mimea" (Plant Doctor), an expert agronomist assistant \
for youth farmers in Kenya under the UNICEF EKYAN programme.

Rules you must always follow:
1. Respond in clear, friendly Swahili by default. Switch to English only if the farmer writes in English.
2. Prioritize low-cost, organic, regenerative solutions accessible to rural smallholders: \
wood ash, neem extract, crop rotation, composting, companion planting.
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


# ── WhatsApp helpers ──────────────────────────────────────────────────────────

async def send_whatsapp_message(to: str, text: str) -> None:
    if not WHATSAPP_TOKEN or not WHATSAPP_PHONE_ID:
        log.warning("WhatsApp credentials not set — skipping send")
        return
    async with httpx.AsyncClient(timeout=10.0) as client:
        await client.post(
            f"{WHATSAPP_API}/{WHATSAPP_PHONE_ID}/messages",
            headers={"Authorization": f"Bearer {WHATSAPP_TOKEN}"},
            json={
                "messaging_product": "whatsapp",
                "to": to,
                "type": "text",
                "text": {"body": text},
            },
        )


def detect_language(text: str) -> str:
    swahili_markers = ["habari", "shamba", "mimea", "mkulima", "mbegu", "mvua",
                       "ugonjwa", "dawa", "bei", "soko", "mkopo", "pesa", "nina",
                       "nataka", "sijui", "tafadhali", "asante", "karibu"]
    text_lower = text.lower()
    hits = sum(1 for w in swahili_markers if w in text_lower)
    return "swahili" if hits >= 1 else "english"


async def handle_farmer_message(
    farmer_phone: str,
    message_text: str,
    county: str = "Unknown",
) -> None:
    language = detect_language(message_text)

    # 1. Detect and log blocker (BRS P01-P04)
    blocker_category = detect_blocker_category(message_text)
    if blocker_category:
        saved = await save_blocker(
            farmer_phone=farmer_phone,
            message=message_text,
            county=county,
            language=language,
            category=blocker_category,
        )
        log.info(f"Blocker logged: {blocker_category} | saved={saved} | phone={farmer_phone[-4:]}")

    # 2. Call Gemini with agronomist system prompt
    try:
        prompt = f"{SYSTEM_PROMPT}\n\nFarmer message: {message_text}"
        response = gemini_client.models.generate_content(
            model="gemini-2.0-flash",
            contents=prompt,
        )
        reply = response.text.strip()
    except Exception as e:
        log.error(f"Gemini error: {e}")
        reply = (
            "Samahani, kuna tatizo la mfumo kwa sasa. Tafadhali jaribu tena baadaye. "
            "Sorry, there is a system issue. Please try again shortly."
        )

    # 3. Send reply back via WhatsApp
    await send_whatsapp_message(farmer_phone, reply)
    log.info(f"Reply sent to {farmer_phone[-4:]} | lang={language} | blocker={blocker_category}")


# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/webhook")
async def verify_webhook(request: Request):
    """WhatsApp Cloud API webhook verification handshake."""
    params = request.query_params
    if (
        params.get("hub.mode") == "subscribe"
        and params.get("hub.verify_token") == WHATSAPP_VERIFY_TOKEN
    ):
        return PlainTextResponse(params.get("hub.challenge", ""))
    raise HTTPException(status_code=403, detail="Verification failed")


@app.post("/webhook")
async def receive_webhook(request: Request, background: BackgroundTasks):
    """Receive incoming WhatsApp messages."""
    body = await request.json()

    try:
        entry = body["entry"][0]["changes"][0]["value"]
        message = entry["messages"][0]
        farmer_phone = message["from"]
        message_text = message.get("text", {}).get("body", "")

        # Extract county from profile metadata if available
        contacts = entry.get("contacts", [{}])
        county = contacts[0].get("profile", {}).get("name", "Unknown")

        if message_text:
            background.add_task(handle_farmer_message, farmer_phone, message_text, county)

    except (KeyError, IndexError):
        # Not a text message (image, audio, etc.) — ignore for now
        pass

    # WhatsApp requires 200 OK immediately
    return {"status": "ok"}


# ── Direct API (for testing without WhatsApp) ─────────────────────────────────

class QueryRequest(BaseModel):
    farmer_phone: str
    message: str
    county: str = "Unknown"


class QueryResponse(BaseModel):
    reply: str
    language: str
    blocker_detected: Optional[str]
    blocker_logged: bool


@app.post("/api/v1/chat", response_model=QueryResponse)
async def chat_direct(req: QueryRequest):
    """Direct chat endpoint for testing and non-WhatsApp integrations (USSD, SMS)."""
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
        response = gemini_client.models.generate_content(
            model="gemini-2.0-flash",
            contents=prompt,
        )
        reply = response.text.strip()
    except Exception as e:
        log.error(f"Gemini error: {e}")
        reply = "Samahani, kuna tatizo la mfumo. / System error, please retry."

    return QueryResponse(
        reply=reply,
        language=language,
        blocker_detected=blocker_category,
        blocker_logged=blocker_logged,
    )


@app.get("/health")
def health():
    return {
        "status": "healthy",
        "service": "EKYAN Daktari wa Mimea",
        "whatsapp_configured": bool(WHATSAPP_TOKEN and WHATSAPP_PHONE_ID),
        "llm_configured": bool(GEMINI_API_KEY),
    }
