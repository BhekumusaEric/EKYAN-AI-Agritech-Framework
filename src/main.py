"""
EKYAN Connect — Unified Backend API
Mounts all modules: Agronomist Bot, Credit Scoring, Climate Advisory.
Run: uvicorn main:app --reload --port 8000
"""

import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from dotenv import load_dotenv

load_dotenv()

# Module imports
from swahili_voice_bot.app import app as agronomist_app
from credit_scoring.model import FarmerCreditProfile, score_farmer
from climate_engine.advisory import get_advisory
from marketplace.engine import (
    HarvestRegistration, BuyerOrder, forecast_price,
    match_buyer_to_farmers, MARKET_BASELINES
)
from datetime import date

app = FastAPI(
    title="EKYAN Connect API",
    description="Digital operating layer for UNICEF EKYAN youth agripreneurs — Kenya",
    version="1.0.0",
    docs_url="/docs",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Mount agronomist bot ──────────────────────────────────────────────────────
app.mount("/agronomist", agronomist_app)


# ── Credit scoring endpoint ───────────────────────────────────────────────────

class CreditRequest(BaseModel):
    farmer_id: str
    ekyan_modules_completed: int = 0
    quiz_avg_score: float = 0.0
    demo_days_attended: int = 0
    mpesa_monthly_inflow_kes: float = 0.0
    mpesa_consistency_score: float = 0.0
    chama_savings_months: int = 0
    ndvi_season1: float = 0.3
    ndvi_season2: float = 0.3
    farm_size_acres: float = 1.0
    peer_endorsements: int = 0
    cooperative_standing: float = 0.5
    mentor_verified: bool = False
    deliveries_completed: int = 0
    delivery_adherence_rate: float = 0.0
    previous_loan_repaid: Optional[bool] = None


@app.post("/api/v1/credit/score")
def credit_score(req: CreditRequest) -> dict:
    profile = FarmerCreditProfile(**req.model_dump())
    decision = score_farmer(profile)
    return {
        "farmer_id": decision.farmer_id,
        "aci_score": decision.aci_score,
        "risk_tier": decision.risk_tier,
        "approved": decision.approved,
        "recommended_loan_usd": decision.recommended_loan_usd,
        "score_breakdown": decision.score_breakdown,
        "improvement_actions": decision.improvement_actions,
    }


# ── Climate advisory endpoint ─────────────────────────────────────────────────

@app.get("/api/v1/climate/advisory")
async def climate_advisory(county: str, ndvi: Optional[float] = None):
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

class HarvestRequest(BaseModel):
    farmer_id: str
    county: str
    commodity: str
    volume_kg: float
    harvest_date: str   # ISO date YYYY-MM-DD
    lat: float = -0.023
    lon: float = 37.906
    quality_grade: str = "A"


class BuyerOrderRequest(BaseModel):
    buyer_id: str
    buyer_name: str
    buyer_type: str
    commodity: str
    volume_kg_needed: float
    delivery_date: str  # ISO date YYYY-MM-DD
    county: str
    max_price_kes_per_kg: float
    farms: list[HarvestRequest]


@app.get("/api/v1/market/price")
def market_price(commodity: str, days_ahead: int = 14):
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


@app.post("/api/v1/market/match")
def market_match(req: BuyerOrderRequest):
    buyer = BuyerOrder(
        buyer_id=req.buyer_id,
        buyer_name=req.buyer_name,
        buyer_type=req.buyer_type,
        commodity=req.commodity,
        volume_kg_needed=req.volume_kg_needed,
        delivery_date=date.fromisoformat(req.delivery_date),
        county=req.county,
        max_price_kes_per_kg=req.max_price_kes_per_kg,
    )
    farms = [
        HarvestRegistration(
            farmer_id=f.farmer_id, county=f.county, commodity=f.commodity,
            volume_kg=f.volume_kg, harvest_date=date.fromisoformat(f.harvest_date),
            lat=f.lat, lon=f.lon, quality_grade=f.quality_grade,
        )
        for f in req.farms
    ]
    match = match_buyer_to_farmers(buyer, farms)
    return {
        "buyer": match.buyer.buyer_name,
        "matched_farmers": len(match.farmers),
        "total_supply_kg": match.total_supply_kg,
        "shortfall_kg": match.shortfall_kg,
        "fair_price_kes": match.fair_price_kes,
        "contract_value_kes": match.total_contract_value_kes,
        "farmer_gain_vs_broker_kes": match.farmer_gain_vs_broker_kes,
        "escrow_ready": match.escrow_trigger,
        "logistics": match.logistics_note,
    }


@app.get("/api/v1/market/commodities")
def list_commodities():
    return {"commodities": list(MARKET_BASELINES.keys())}


# ── Health ────────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "healthy", "service": "EKYAN Connect API", "version": "1.0.0"}
