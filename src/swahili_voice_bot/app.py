"""
FastAPI Conversational Agronomist Microservice
Supporting Voice & Text via WhatsApp Cloud API / SMS Gateway
EKYAN AI & Agritech Framework | UNICEF Kenya
"""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional, List


app = FastAPI(
    title="EKYAN AI Agronomist API",
    description="Multilingual (Swahili/English) Conversational Assistant for Youth Farmers in Kenya",
    version="1.0.0"
)


class FarmerQuery(BaseModel):
    farmer_id: str
    county: str
    language: str = "swahili"  # "swahili" or "english"
    query_text: str
    crop: Optional[str] = "General"


class AgronomistResponse(BaseModel):
    status: str
    language: str
    response_text: str
    recommended_practices: List[str]
    nutrition_tip: str


@app.post("/api/v1/chat", response_model=AgronomistResponse)
async def chat_agronomist(query: FarmerQuery):
    """
    Handles conversational farmer inquiries, adhering to climate-smart guardrails.
    """
    user_msg = query.query_text.lower()

    if "nyanya" in user_msg or "tomato" in user_msg:
        if query.language.lower() == "swahili":
            reply = (
                "Habari mkulima hodari wa EKYAN! Kwa tatizo la ukungu au madoa kwenye nyanya zako, "
                "kagua sehemu za chini za majani. Tumia majivu ya jikoni au mafuta ya mwarobaini "
                "ili kutibu bila kutumia kemikali zenye sumu."
            )
            practices = [
                "Ondoa majani yaliyogusana na ardhi kuzuia maambukizi.",
                "Weka matandazo ya nyasi (mulching) ili kuhifadhi unyevu.",
                "Epuka kumwagia maji juu ya majani wakati wa mchana."
            ]
            nutrition = "Nyanya zina vitamini C na Lycopene inayokinga mwili dhidi ya magonjwa."
        else:
            reply = (
                "Hello EKYAN agripreneur! For blight or dark spots on your tomatoes, check the lower leaves first. "
                "Use an organic solution of kitchen wood-ash or neem oil to treat without toxic chemicals."
            )
            practices = [
                "Prune lower leaves that touch the ground to stop soil-borne pathogens.",
                "Apply organic grass mulching to retain soil moisture.",
                "Avoid overhead watering during hot daylight hours."
            ]
            nutrition = "Tomatoes provide essential Vitamin C and Lycopene for immune health."

    else:
        # Default supportive response
        if query.language.lower() == "swahili":
            reply = (
                f"Habari! Nimepokea swali lako kutoka kaunti ya {query.county}. "
                "Kama mkulima kijana, tunakuhimiza kutumia mbinu endelevu za kilimo hai ili kulinda ardhi yako."
            )
            practices = [
                "Zungusha mazao (crop rotation) kuboresha rutuba ya mchanga.",
                "Tumia mboji ya asili badala ya kemikali za viwandani."
            ]
            nutrition = "Kula mboga za kienyeji kama mchicha na managu ili kuboresha afya ya familia."
        else:
            reply = (
                f"Greetings! We have received your inquiry from {query.county} County. "
                "As an EKYAN youth agripreneur, we encourage regenerative practices to boost yield and soil longevity."
            )
            practices = [
                "Rotate your crops to break pest cycles and replenish nitrogen.",
                "Incorporate compost and bio-fertilizers into your seedbeds."
            ]
            nutrition = "Grow indigenous leafy vegetables (Managu, Terere) to combat micronutrient deficiencies."

    return AgronomistResponse(
        status="success",
        language=query.language,
        response_text=reply,
        recommended_practices=practices,
        nutrition_tip=nutrition
    )


@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "EKYAN AI Agronomist API"}

