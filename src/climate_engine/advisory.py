"""
Precision Climate Advisory & NDVI Engine
EKYAN AI & Agritech Framework | UNICEF Kenya
"""

import json
from dataclasses import dataclass
from typing import Dict, Any


@dataclass
class ClimateObservation:
    county: str
    sub_county: str
    rain_probability_24h_pct: int
    expected_rainfall_mm: float
    max_temperature_c: float
    humidity_pct: int
    satellite_ndvi: float


class ClimateAdvisoryEngine:
    """
    Evaluates meteorological triggers and Sentinel-2 vegetation indices
    to generate targeted, automated SMS/WhatsApp advisories.
    """

    def generate_advisory(self, obs: ClimateObservation) -> Dict[str, Any]:
        actions = []
        alerts_swahili = []
        alerts_english = []

        # 1. Rain & Irrigation Optimization
        if obs.expected_rainfall_mm >= 12.0 or obs.rain_probability_24h_pct >= 75:
            alerts_swahili.append(
                f"Mvua inayotarajiwa ({obs.expected_rainfall_mm}mm): Usinyunyizie maji mashambani "
                "leo ili kuokoa gharama za nishati na kuzuia mmomonyoko wa udongo."
            )
            alerts_english.append(
                f"Forecasted rainfall ({obs.expected_rainfall_mm}mm): Hold off on irrigation today "
                "to conserve water/pumping costs and prevent soil saturation."
            )
            actions.append("HALT_IRRIGATION")

        # 2. Disease Trigger: High Humidity + Warm Temperature (Blight favorable)
        if obs.humidity_pct >= 80 and 18.0 <= obs.max_temperature_c <= 27.0:
            alerts_swahili.append(
                "Tahadhari ya Ugonjwa wa Ukungu: Unyevu mwingi angani unaweza kusababisha ukungu wa majani. "
                "Kagua mimea yako na kuweka dawa asili ya mwarobaini au majivu."
            )
            alerts_english.append(
                "Blight Alert: High ambient humidity favors fungal pathogens. "
                "Inspect lower foliage and apply preventative organic neem/ash extract."
            )
            actions.append("APPLY_ORGANIC_FUNGICIDE")

        # 3. Extreme Heat & Soil Stress
        if obs.max_temperature_c >= 31.0:
            alerts_swahili.append(
                f"Joto kali ({obs.max_temperature_c}°C): Weka matandazo ya nyasi kavu (mulching) "
                "kwenye misingi ya mimea ili kuzuia unyevu kuyeyuka."
            )
            alerts_english.append(
                f"High temperature alert ({obs.max_temperature_c}°C): Apply dry grass mulching "
                "around plant root zones to reduce soil evapotranspiration."
            )
            actions.append("APPLY_MULCHING")

        # Fallback if conditions are stable
        if not alerts_swahili:
            alerts_swahili.append(
                "Hali ya anga ni shwari leo. Endelea na ratiba yako ya kawaida ya kilimo hai."
            )
            alerts_english.append(
                "Weather conditions are stable today. Continue with your scheduled regenerative farm routine."
            )
            actions.append("ROUTINE_MONITORING")

        return {
            "county": obs.county,
            "sub_county": obs.sub_county,
            "vegetation_health_ndvi": round(obs.satellite_ndvi, 2),
            "triggered_actions": actions,
            "sms_advisories": {
                "swahili": " | ".join(alerts_swahili),
                "english": " | ".join(alerts_english)
            }
        }


if __name__ == "__main__":
    engine = ClimateAdvisoryEngine()

    obs = ClimateObservation(
        county="Busia",
        sub_county="Matayos",
        rain_probability_24h_pct=85,
        expected_rainfall_mm=18.5,
        max_temperature_c=28.0,
        humidity_pct=88,
        satellite_ndvi=0.62
    )

    advisory = engine.generate_advisory(obs)
    print(json.dumps(advisory, indent=2))

