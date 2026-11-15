"""
EKYAN Connect — Hyperlocal Climate & Regenerative Advisory Engine
Pulls live Open Meteo forecasts + NDVI health → generates Swahili/English nudges.
BRS problem: P05 — advisory too slow, too generic, wrong language.
Rule table from Module 3 spec implemented exactly.
"""

import os
import httpx
from dataclasses import dataclass
from typing import Optional
from dotenv import load_dotenv

load_dotenv()

OPEN_METEO_BASE = "https://api.open-meteo.com/v1/forecast"

# Kenya county → approximate coordinates
COUNTY_COORDS = {
    "busia":     (-0.461, 34.111),
    "kirinyaga": (-0.559, 37.283),
    "kisumu":    (-0.091, 34.768),
    "samburu":   (1.215,  36.955),
    "nairobi":   (-1.286, 36.817),
    "mombasa":   (-4.043, 39.668),
    "nakuru":    (-0.303, 36.080),
    "kakamega":  (0.282,  34.752),
}
DEFAULT_COORDS = (-0.023, 37.906)  # Kenya centroid


@dataclass
class ClimateNudge:
    county: str
    trigger: str
    message_swahili: str
    message_english: str
    severity: str   # info / warning / critical
    action_required: bool


async def fetch_forecast(lat: float, lon: float) -> dict:
    """Fetch 24h forecast from Open Meteo — free, no key required."""
    params = {
        "latitude": lat,
        "longitude": lon,
        "hourly": "precipitation,relative_humidity_2m,temperature_2m,soil_moisture_0_to_1cm",
        "forecast_days": 2,
        "timezone": "Africa/Nairobi",
    }
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(OPEN_METEO_BASE, params=params)
        resp.raise_for_status()
        return resp.json()


def parse_forecast(data: dict) -> dict:
    """Extract max/avg values from the next 24h of hourly data."""
    hourly = data.get("hourly", {})
    precip = hourly.get("precipitation", [0] * 24)[:24]
    humidity = hourly.get("relative_humidity_2m", [50] * 24)[:24]
    temp = hourly.get("temperature_2m", [25] * 24)[:24]
    soil = hourly.get("soil_moisture_0_to_1cm", [0.2] * 24)[:24]

    return {
        "total_precip_mm":  sum(precip),
        "max_humidity_pct": max(humidity),
        "max_temp_c":       max(temp),
        "avg_temp_c":       sum(temp) / len(temp),
        "avg_soil_moisture": sum(soil) / len(soil) if soil else 0.2,
    }


def ndvi_health_label(ndvi: float) -> str:
    if ndvi < 0.20:
        return "critical"
    if ndvi < 0.50:
        return "moderate"
    return "healthy"


def generate_nudges(county: str, forecast: dict, ndvi: Optional[float] = None) -> list[ClimateNudge]:
    """
    Apply the rule table from Module 3 spec.
    Returns list of nudges to send to the farmer.
    """
    nudges = []
    precip   = forecast["total_precip_mm"]
    humidity = forecast["max_humidity_pct"]
    temp     = forecast["max_temp_c"]
    soil     = forecast["avg_soil_moisture"]

    # Rule 1: Heavy rain imminent (≥15mm in 24h)
    if precip >= 15:
        nudges.append(ClimateNudge(
            county=county,
            trigger=f"rain_{precip:.0f}mm",
            message_swahili=(
                f"Mvua kubwa inatarajiwa leo ({precip:.0f}mm). "
                "Usinyunyizie maji leo wala kuweka mbolea ya majani kuzuia isisafishwe na mvua."
            ),
            message_english=(
                f"Heavy rain expected today ({precip:.0f}mm). "
                "Avoid irrigating or applying foliar fertilizer — nutrients will wash away."
            ),
            severity="warning",
            action_required=True,
        ))

    # Rule 2: High heat + low soil moisture
    if temp > 32 and soil < 0.18:
        nudges.append(ClimateNudge(
            county=county,
            trigger=f"heat_{temp:.0f}c_soil_{soil:.2f}",
            message_swahili=(
                f"Kuna joto kali ({temp:.0f}°C) na unyevu wa udongo ni mdogo. "
                "Funika mashina ya mimea na nyasi kavu (mulching) ili kuzuia unyevu kupotea."
            ),
            message_english=(
                f"Extreme heat ({temp:.0f}°C) with low soil moisture. "
                "Apply dry organic mulching around crop roots to preserve moisture."
            ),
            severity="critical",
            action_required=True,
        ))

    # Rule 3: High humidity + moderate temp → blight risk
    if humidity > 85 and 18 <= forecast["avg_temp_c"] <= 24:
        nudges.append(ClimateNudge(
            county=county,
            trigger=f"humidity_{humidity:.0f}pct",
            message_swahili=(
                f"Hali ya hewa ({humidity:.0f}% unyevu) inachochea ugonjwa wa ukungu kwenye nyanya. "
                "Kagua sehemu za chini za majani na uweke dawa ya asili ya majivu au mwarobaini mapema."
            ),
            message_english=(
                f"High humidity ({humidity:.0f}%) favours blight on tomatoes. "
                "Inspect lower leaves and apply preventative neem/wood-ash organic extract early."
            ),
            severity="warning",
            action_required=True,
        ))

    # Rule 4: NDVI health alert
    if ndvi is not None and ndvi < 0.20:
        nudges.append(ClimateNudge(
            county=county,
            trigger=f"ndvi_{ndvi:.2f}",
            message_swahili=(
                f"Afya ya mazao yako ni mbaya (NDVI={ndvi:.2f}). "
                "Hii inaweza kuwa dalili ya ukame, wadudu, au udongo duni. "
                "Wasiliana na mshauri wako wa EKYAN haraka."
            ),
            message_english=(
                f"Your crop health is critical (NDVI={ndvi:.2f}). "
                "This may indicate drought stress, pest damage, or poor soil. "
                "Contact your EKYAN agripreneur coordinator urgently."
            ),
            severity="critical",
            action_required=True,
        ))

    # Default: all clear
    if not nudges:
        nudges.append(ClimateNudge(
            county=county,
            trigger="all_clear",
            message_swahili="Hali ya hewa ni nzuri leo. Endelea na kazi yako ya shamba. Jaza maji ya umwagiliaji asubuhi mapema.",
            message_english="Weather conditions are favourable today. Continue normal farm activities. Water crops early morning.",
            severity="info",
            action_required=False,
        ))

    return nudges


async def get_advisory(county: str, ndvi: Optional[float] = None) -> list[ClimateNudge]:
    """Main entry point — fetch forecast and return nudges for a county."""
    county_lower = county.lower()
    lat, lon = COUNTY_COORDS.get(county_lower, DEFAULT_COORDS)

    data = await fetch_forecast(lat, lon)
    forecast = parse_forecast(data)
    return generate_nudges(county, forecast, ndvi)


if __name__ == "__main__":
    import asyncio, json

    async def demo():
        nudges = await get_advisory("Kirinyaga", ndvi=0.18)
        for n in nudges:
            print(f"\n[{n.severity.upper()}] {n.trigger}")
            print(f"SW: {n.message_swahili}")
            print(f"EN: {n.message_english}")

    asyncio.run(demo())
