"""
Alternative ML Credit Scoring Pipeline for Youth Agripreneurs
EKYAN AI & Agritech Framework | UNICEF Kenya
"""

import json
from dataclasses import dataclass
from typing import Dict, Any


@dataclass
class AgripreneurProfile:
    youth_id: str
    county: str
    modules_completed_pct: float     # e.g., 0.85 = 85% of EKYAN courses finished
    quiz_average_score: float        # e.g., 0.90 = 90% score
    mpesa_monthly_inflow_kes: float  # Monthly mobile money inflows (KES)
    savings_consistency_months: int  # Consecutive months saving in village Chama
    satellite_ndvi_mean: float       # Satellite crop health index (0.0 to 1.0)
    peer_endorsements_count: int     # Positive peer reviews in local youth co-op
    past_delivery_adherence_pct: float # Contract fulfillment rate (0.0 to 1.0)


class AlternativeCreditScorer:
    """
    ML Rule-Weighted & Gradient Boosted Simulator scoring unbanked youth.
    Outputs: Score (300 - 850), Tier (A, B, C), and Max Approved Microloan (KES).
    """

    def calculate_score(self, profile: AgripreneurProfile) -> Dict[str, Any]:
        score = 300.0  # Base score

        # 1. Educational Commitment (Max 150 points)
        edu_score = (profile.modules_completed_pct * 80.0) + (profile.quiz_average_score * 70.0)
        score += edu_score

        # 2. Financial Discipline & M-Pesa Inflow (Max 150 points)
        # Cap inflow calculation at KES 30,000/month
        normalized_inflow = min(profile.mpesa_monthly_inflow_kes / 30000.0, 1.0)
        savings_factor = min(profile.savings_consistency_months / 6.0, 1.0)
        fin_score = (normalized_inflow * 80.0) + (savings_factor * 70.0)
        score += fin_score

        # 3. Satellite Earth Observation Proof of Farming (Max 120 points)
        # Healthy active canopy NDVI is typically 0.35 - 0.75
        normalized_ndvi = min(max(profile.satellite_ndvi_mean - 0.20, 0.0) / 0.55, 1.0)
        sat_score = normalized_ndvi * 120.0
        score += sat_score

        # 4. Social Capital & Peer Trust (Max 60 points)
        peer_score = min(profile.peer_endorsements_count / 5.0, 1.0) * 60.0
        score += peer_score

        # 5. Contract Fulfillment History (Max 70 points)
        delivery_score = profile.past_delivery_adherence_pct * 70.0
        score += delivery_score

        final_score = int(round(score))

        # Risk Classification & Loan Limit
        if final_score >= 700:
            tier = "Tier A (Low Risk - Highly Bankable)"
            max_loan_kes = 35000.0   # ~$270 USD
            recommendation = "Approved for solar drip-irrigation kit and certified seeds."
        elif final_score >= 580:
            tier = "Tier B (Moderate Risk - Eligible with Co-op Guarantee)"
            max_loan_kes = 15000.0   # ~$115 USD
            recommendation = "Approved for bio-fertilizer and nursery seed starter pack."
        else:
            tier = "Tier C (Building Credit Capacity)"
            max_loan_kes = 5000.0    # ~$38 USD
            recommendation = "Recommend completing 2 more EKYAN modules and 60 days of Chama savings."

        return {
            "youth_id": profile.youth_id,
            "county": profile.county,
            "credit_score": final_score,
            "risk_tier": tier,
            "max_loan_limit_kes": max_loan_kes,
            "recommendation": recommendation,
            "score_breakdown": {
                "education_commitment": round(edu_score, 1),
                "financial_discipline": round(fin_score, 1),
                "satellite_farming_proof": round(sat_score, 1),
                "social_trust": round(peer_score, 1),
                "delivery_reliability": round(delivery_score, 1)
            }
        }


if __name__ == "__main__":
    scorer = AlternativeCreditScorer()

    sample_applicant = AgripreneurProfile(
        youth_id="EKYAN-KEN-2026-0842",
        county="Kirinyaga",
        modules_completed_pct=0.92,
        quiz_average_score=0.88,
        mpesa_monthly_inflow_kes=18500.0,
        savings_consistency_months=5,
        satellite_ndvi_mean=0.58,
        peer_endorsements_count=6,
        past_delivery_adherence_pct=0.95
    )

    result = scorer.calculate_score(sample_applicant)
    print(json.dumps(result, indent=2))

