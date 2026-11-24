from typing import Literal, TypedDict


class CreditReviewResponse(TypedDict):
    farmer_id: str
    aci_score: int
    readiness_band: str
    review_status: Literal["requires_human_review"]
    decision_notice: str
    score_breakdown: dict[str, float]
    improvement_actions: list[str]


def credit_review_response(
    *,
    farmer_id: str,
    aci_score: int,
    readiness_band: str,
    score_breakdown: dict[str, float],
    improvement_actions: list[str],
) -> CreditReviewResponse:
    return {
        "farmer_id": farmer_id,
        "aci_score": aci_score,
        "readiness_band": readiness_band,
        "review_status": "requires_human_review",
        "decision_notice": "Decision support only; this is not a loan approval.",
        "score_breakdown": score_breakdown,
        "improvement_actions": improvement_actions,
    }
