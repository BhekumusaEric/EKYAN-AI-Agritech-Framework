"""
EKYAN Connect — B2B Farm-to-Fork Marketplace & Price Forecaster
BRS problem: P04 — predatory middlemen, no market visibility, distress selling.

Capabilities:
  1. Harvest registration — youth registers expected produce + volume + date
  2. Demand aggregation — clusters nearby farms to meet bulk buyer minimums
  3. Price forecasting — seasonal + transport-adjusted fair price band (KES/kg)
  4. Buyer matching — matches aggregated supply to institutional buyer orders
  5. Contract lock + M-Pesa escrow trigger
"""

import os
import math
from dataclasses import dataclass, field
from datetime import date, timedelta
from typing import Optional
from dotenv import load_dotenv

load_dotenv()

# ── Kenya wholesale market baseline prices (KES/kg) ──────────────────────────
# Source: KNBS / Ministry of Agriculture averages — updated manually each season
MARKET_BASELINES: dict[str, dict] = {
    "tomato":   {"low": 28,  "mid": 45,  "high": 72,  "unit": "kg"},
    "maize":    {"low": 32,  "mid": 42,  "high": 58,  "unit": "kg"},
    "kale":     {"low": 18,  "mid": 28,  "high": 40,  "unit": "kg"},
    "cassava":  {"low": 15,  "mid": 22,  "high": 35,  "unit": "kg"},
    "beans":    {"low": 80,  "mid": 110, "high": 145, "unit": "kg"},
    "potato":   {"low": 20,  "mid": 32,  "high": 50,  "unit": "kg"},
    "chicken":  {"low": 380, "mid": 480, "high": 600, "unit": "bird"},
    "eggs":     {"low": 12,  "mid": 16,  "high": 22,  "unit": "tray"},
}

# Seasonal multipliers — Kenya long rains (Mar–May) and short rains (Oct–Dec)
# Prices spike in dry months (Jun–Sep, Jan–Feb) due to scarcity
SEASONAL_MULTIPLIERS: dict[int, float] = {
    1: 1.15, 2: 1.10,  # Jan–Feb: dry, prices high
    3: 0.95, 4: 0.90, 5: 0.88,  # Long rains: supply glut
    6: 1.05, 7: 1.10, 8: 1.12, 9: 1.08,  # Dry: prices recover
    10: 0.92, 11: 0.88, 12: 0.90,  # Short rains: supply glut
}

# Broker markup that EKYAN eliminates (BRS P04 — 40–65% exploitation)
BROKER_MARKUP = 0.52  # 52% average markup eliminated by direct B2B


# ── Data models ───────────────────────────────────────────────────────────────

@dataclass
class HarvestRegistration:
    farmer_id: str
    county: str
    commodity: str          # e.g. "tomato", "maize"
    volume_kg: float        # expected harvest volume
    harvest_date: date      # expected ready date
    lat: float = -0.023
    lon: float = 37.906
    quality_grade: str = "A"  # A / B / C


@dataclass
class BuyerOrder:
    buyer_id: str
    buyer_name: str
    buyer_type: str         # school / hospital / supermarket / distributor
    commodity: str
    volume_kg_needed: float
    delivery_date: date
    county: str
    max_price_kes_per_kg: float


@dataclass
class PriceForecast:
    commodity: str
    forecast_date: date
    fair_price_kes: float       # what farmer should receive
    market_price_kes: float     # what buyer pays at wholesale
    broker_price_kes: float     # what broker would have paid farmer (exploitative)
    farmer_gain_kes: float      # gain per kg vs broker
    confidence: str             # high / medium / low


@dataclass
class MarketMatch:
    buyer: BuyerOrder
    farmers: list[HarvestRegistration]
    total_supply_kg: float
    shortfall_kg: float
    fair_price_kes: float
    total_contract_value_kes: float
    farmer_gain_vs_broker_kes: float
    logistics_note: str
    escrow_trigger: bool = False


# ── Price forecasting ─────────────────────────────────────────────────────────

def forecast_price(commodity: str, target_date: date) -> PriceForecast:
    """
    Seasonal price forecast — fair farmgate price band.
    Eliminates broker markup to give farmer the real market price.
    """
    commodity = commodity.lower()
    baseline = MARKET_BASELINES.get(commodity)
    if not baseline:
        # Unknown commodity — use conservative mid estimate
        baseline = {"low": 30, "mid": 50, "high": 80, "unit": "kg"}

    seasonal = SEASONAL_MULTIPLIERS.get(target_date.month, 1.0)
    market_price = round(baseline["mid"] * seasonal, 1)

    # Fair farmgate = market price minus logistics (15%) not broker markup (52%)
    fair_price = round(market_price * 0.85, 1)
    broker_price = round(market_price * (1 - BROKER_MARKUP), 1)
    farmer_gain = round(fair_price - broker_price, 1)

    # Confidence based on how far ahead the forecast is
    days_ahead = (target_date - date.today()).days
    confidence = "high" if days_ahead <= 14 else "medium" if days_ahead <= 30 else "low"

    return PriceForecast(
        commodity=commodity,
        forecast_date=target_date,
        fair_price_kes=fair_price,
        market_price_kes=market_price,
        broker_price_kes=broker_price,
        farmer_gain_kes=farmer_gain,
        confidence=confidence,
    )


# ── Harvest aggregation ───────────────────────────────────────────────────────

def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Distance in km between two GPS points."""
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon/2)**2
    return R * 2 * math.asin(math.sqrt(a))


def aggregate_harvests(
    registrations: list[HarvestRegistration],
    commodity: str,
    target_date: date,
    radius_km: float = 25.0,
) -> list[list[HarvestRegistration]]:
    """
    Cluster nearby farms with the same commodity into pickup groups.
    Each cluster can be served by one logistics run.
    """
    eligible = [
        r for r in registrations
        if r.commodity.lower() == commodity.lower()
        and abs((r.harvest_date - target_date).days) <= 7
    ]

    clusters: list[list[HarvestRegistration]] = []
    assigned = set()

    for i, anchor in enumerate(eligible):
        if i in assigned:
            continue
        cluster = [anchor]
        assigned.add(i)
        for j, other in enumerate(eligible):
            if j in assigned:
                continue
            dist = _haversine_km(anchor.lat, anchor.lon, other.lat, other.lon)
            if dist <= radius_km:
                cluster.append(other)
                assigned.add(j)
        clusters.append(cluster)

    return clusters


# ── Buyer matching ────────────────────────────────────────────────────────────

def match_buyer_to_farmers(
    buyer: BuyerOrder,
    registrations: list[HarvestRegistration],
) -> MarketMatch:
    """
    Match an institutional buyer order to the best aggregated farmer cluster.
    Returns a binding contract proposal with fair price and escrow trigger.
    """
    clusters = aggregate_harvests(registrations, buyer.commodity, buyer.delivery_date)

    # Pick the cluster with the most supply closest to buyer's volume need
    best_cluster: list[HarvestRegistration] = []
    best_supply = 0.0

    for cluster in clusters:
        supply = sum(r.volume_kg for r in cluster)
        if supply > best_supply:
            best_supply = supply
            best_cluster = cluster

    forecast = forecast_price(buyer.commodity, buyer.delivery_date)
    fair_price = min(forecast.fair_price_kes, buyer.max_price_kes_per_kg)

    matched_volume = min(best_supply, buyer.volume_kg_needed)
    shortfall = max(0.0, buyer.volume_kg_needed - best_supply)
    contract_value = round(matched_volume * fair_price, 2)
    broker_value = round(matched_volume * forecast.broker_price_kes, 2)
    farmer_gain = round(contract_value - broker_value, 2)

    farm_count = len(best_cluster)
    logistics = (
        f"{farm_count} farm(s) within 25km radius — single pickup run feasible."
        if farm_count <= 8
        else f"{farm_count} farms — split into 2 logistics runs recommended."
    )

    return MarketMatch(
        buyer=buyer,
        farmers=best_cluster,
        total_supply_kg=round(best_supply, 1),
        shortfall_kg=round(shortfall, 1),
        fair_price_kes=fair_price,
        total_contract_value_kes=contract_value,
        farmer_gain_vs_broker_kes=farmer_gain,
        logistics_note=logistics,
        escrow_trigger=(shortfall == 0),  # only trigger escrow if fully matched
    )


if __name__ == "__main__":
    import json

    # Demo: school feeding programme needs 500kg tomatoes in Kirinyaga
    buyer = BuyerOrder(
        buyer_id="SCH-KIR-001",
        buyer_name="Kerugoya Secondary School",
        buyer_type="school",
        commodity="tomato",
        volume_kg_needed=500,
        delivery_date=date.today() + timedelta(days=14),
        county="Kirinyaga",
        max_price_kes_per_kg=50,
    )

    farms = [
        HarvestRegistration("F001", "Kirinyaga", "tomato", 120, date.today() + timedelta(days=12), -0.50, 37.25),
        HarvestRegistration("F002", "Kirinyaga", "tomato", 180, date.today() + timedelta(days=14), -0.52, 37.28),
        HarvestRegistration("F003", "Kirinyaga", "tomato", 95,  date.today() + timedelta(days=13), -0.55, 37.30),
        HarvestRegistration("F004", "Kirinyaga", "tomato", 210, date.today() + timedelta(days=15), -0.48, 37.22),
    ]

    match = match_buyer_to_farmers(buyer, farms)
    price = forecast_price("tomato", buyer.delivery_date)

    print(json.dumps({
        "buyer": match.buyer.buyer_name,
        "commodity": buyer.commodity,
        "supply_kg": match.total_supply_kg,
        "shortfall_kg": match.shortfall_kg,
        "fair_price_kes_per_kg": match.fair_price_kes,
        "contract_value_kes": match.total_contract_value_kes,
        "farmer_gain_vs_broker_kes": match.farmer_gain_vs_broker_kes,
        "escrow_ready": match.escrow_trigger,
        "logistics": match.logistics_note,
        "price_forecast": {
            "market_price": price.market_price_kes,
            "fair_farmgate": price.fair_price_kes,
            "broker_wouldve_paid": price.broker_price_kes,
            "gain_per_kg": price.farmer_gain_kes,
            "confidence": price.confidence,
        },
    }, indent=2))
