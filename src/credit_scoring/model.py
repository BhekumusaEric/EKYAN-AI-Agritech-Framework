"""
EKYAN Connect — Alternative ML Credit Scoring Engine
Agri-Creditworthiness Index (ACI): 300–850
BRS problem: P03 — youth locked out of finance due to no land title / CRB history.
Feature weights per spec:
  25% Commitment & Knowledge (EKYAN modules)
  25% Financial Discipline (M-Pesa velocity)
  20% Physical Cultivation Proof (NDVI)
  15% Social Capital (peer endorsements)
  15% Market Discipline (delivery history)
"""

import os
import numpy as np
import pandas as pd
from dataclasses import dataclass, field
from typing import Optional
from dotenv import load_dotenv

load_dotenv()

# ── Feature schema ────────────────────────────────────────────────────────────

@dataclass
class FarmerCreditProfile:
    farmer_id: str

    # 25% — Commitment & Knowledge
    ekyan_modules_completed: int        # 0–20
    quiz_avg_score: float               # 0.0–1.0
    demo_days_attended: int             # 0–10

    # 25% — Financial Discipline (M-Pesa)
    mpesa_monthly_inflow_kes: float     # avg monthly inflow KES
    mpesa_consistency_score: float      # 0.0–1.0 (regularity of transactions)
    chama_savings_months: int           # months of consistent chama savings

    # 20% — Physical Cultivation Proof (Satellite NDVI)
    ndvi_season1: float                 # 0.0–1.0
    ndvi_season2: float                 # 0.0–1.0
    farm_size_acres: float              # verified plot size

    # 15% — Social Capital
    peer_endorsements: int              # 0–5
    cooperative_standing: float         # 0.0–1.0 (good=1, suspended=0)
    mentor_verified: bool

    # 15% — Market Discipline
    deliveries_completed: int           # fulfilled produce contracts
    delivery_adherence_rate: float      # 0.0–1.0
    previous_loan_repaid: Optional[bool] = None  # None = no prior loan


# ── Feature engineering ───────────────────────────────────────────────────────

FEATURE_WEIGHTS = {
    "knowledge_score":    0.25,
    "financial_score":    0.25,
    "cultivation_score":  0.20,
    "social_score":       0.15,
    "market_score":       0.15,
}

def engineer_features(p: FarmerCreditProfile) -> pd.DataFrame:
    knowledge_score = (
        min(p.ekyan_modules_completed / 20, 1.0) * 0.5 +
        p.quiz_avg_score * 0.3 +
        min(p.demo_days_attended / 10, 1.0) * 0.2
    )

    # Normalise M-Pesa inflow: KES 5,000/month = baseline 0.5
    mpesa_norm = min(p.mpesa_monthly_inflow_kes / 10_000, 1.0)
    financial_score = (
        mpesa_norm * 0.5 +
        p.mpesa_consistency_score * 0.3 +
        min(p.chama_savings_months / 12, 1.0) * 0.2
    )

    ndvi_avg = (p.ndvi_season1 + p.ndvi_season2) / 2
    cultivation_score = (
        ndvi_avg * 0.6 +
        min(p.farm_size_acres / 5, 1.0) * 0.4
    )

    social_score = (
        min(p.peer_endorsements / 5, 1.0) * 0.4 +
        p.cooperative_standing * 0.4 +
        (0.2 if p.mentor_verified else 0.0)
    )

    market_score = (
        min(p.deliveries_completed / 10, 1.0) * 0.5 +
        p.delivery_adherence_rate * 0.5
    )

    # Repayment history bonus/penalty
    repayment_bonus = 0.0
    if p.previous_loan_repaid is True:
        repayment_bonus = 0.05
    elif p.previous_loan_repaid is False:
        repayment_bonus = -0.10

    return pd.DataFrame([{
        "knowledge_score":   knowledge_score,
        "financial_score":   financial_score,
        "cultivation_score": cultivation_score,
        "social_score":      social_score,
        "market_score":      market_score,
        "repayment_bonus":   repayment_bonus,
    }])


# ── Scoring ───────────────────────────────────────────────────────────────────

@dataclass
class CreditDecision:
    farmer_id: str
    aci_score: int              # 300–850
    readiness_band: str         # A / B / C / D; decision support only
    review_status: str
    score_breakdown: dict[str, float]
    improvement_actions: list[str] = field(default_factory=list)


def score_farmer(profile: FarmerCreditProfile) -> CreditDecision:
    features = engineer_features(profile)

    # Weighted composite (0.0–1.0)
    composite = (
        features["knowledge_score"].iloc[0]   * FEATURE_WEIGHTS["knowledge_score"] +
        features["financial_score"].iloc[0]   * FEATURE_WEIGHTS["financial_score"] +
        features["cultivation_score"].iloc[0] * FEATURE_WEIGHTS["cultivation_score"] +
        features["social_score"].iloc[0]      * FEATURE_WEIGHTS["social_score"] +
        features["market_score"].iloc[0]      * FEATURE_WEIGHTS["market_score"] +
        features["repayment_bonus"].iloc[0]
    )
    composite = float(np.clip(composite, 0.0, 1.0))

    # Map 0–1 → ACI 300–850
    aci = int(300 + composite * 550)

    # Readiness bands do not represent a lending decision.
    if aci >= 720:
        readiness_band = "A"
    elif aci >= 620:
        readiness_band = "B"
    elif aci >= 520:
        readiness_band = "C"
    else:
        readiness_band = "D"

    # Actionable improvement advice (BRS explainability requirement)
    actions = []
    row = features.iloc[0]
    if row["knowledge_score"] < 0.6:
        actions.append("Complete at least 5 more EKYAN regenerative agriculture modules to boost your score.")
    if row["financial_score"] < 0.5:
        actions.append("Maintain consistent weekly M-Pesa savings or chama contributions for 30 more days.")
    if row["cultivation_score"] < 0.5:
        actions.append("Your satellite crop health (NDVI) is low — apply mulching and irrigation to improve canopy cover.")
    if row["social_score"] < 0.5:
        actions.append("Get 2 more peer endorsements from your cooperative members or a verified EKYAN mentor.")
    if row["market_score"] < 0.5:
        actions.append("Complete 3 more produce delivery contracts through EKYAN Connect marketplace.")

    return CreditDecision(
        farmer_id=profile.farmer_id,
        aci_score=aci,
        readiness_band=readiness_band,
        review_status="requires_human_review",
        score_breakdown={
            "knowledge":   round(row["knowledge_score"], 3),
            "financial":   round(row["financial_score"], 3),
            "cultivation": round(row["cultivation_score"], 3),
            "social":      round(row["social_score"], 3),
            "market":      round(row["market_score"], 3),
            "composite":   round(composite, 3),
        },
        improvement_actions=actions,
    )


if __name__ == "__main__":
    import json

    sample = FarmerCreditProfile(
        farmer_id="EKYAN-BUS-0042",
        ekyan_modules_completed=12,
        quiz_avg_score=0.74,
        demo_days_attended=4,
        mpesa_monthly_inflow_kes=4200,
        mpesa_consistency_score=0.68,
        chama_savings_months=7,
        ndvi_season1=0.52,
        ndvi_season2=0.61,
        farm_size_acres=1.5,
        peer_endorsements=3,
        cooperative_standing=0.9,
        mentor_verified=True,
        deliveries_completed=4,
        delivery_adherence_rate=0.80,
        previous_loan_repaid=None,
    )

    decision = score_farmer(sample)
    print(json.dumps(decision.__dict__, indent=2))
