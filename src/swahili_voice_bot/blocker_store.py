"""
Blocker Store — EKYAN Connect
Sends farmer blocker events to SQS (async) instead of Supabase REST.
BRS problems: P01–P05
"""

import json
import os
from datetime import datetime, timezone
from typing import Optional
from aws_clients import get_sqs, BLOCKER_QUEUE

BLOCKER_CATEGORIES = {
    "inputs":   "P02",
    "finance":  "P03",
    "market":   "P04",
    "advisory": "P05",
    "climate":  "P03",
    "other":    "P01",
}

BLOCKER_KEYWORDS = {
    "inputs":  ["mbegu", "seed", "fertilizer", "mbolea", "drip", "input", "dawa", "pesticide"],
    "finance": ["pesa", "loan", "mkopo", "credit", "benki", "bank", "fedha", "capital"],
    "market":  ["buyer", "mnunuzi", "price", "bei", "broker", "dalali", "sell", "uza", "soko"],
    "climate": ["drought", "ukame", "flood", "mafuriko", "rain", "mvua", "heat", "joto"],
}


def detect_blocker_category(text: str) -> Optional[str]:
    text_lower = text.lower()
    for category, keywords in BLOCKER_KEYWORDS.items():
        if any(kw in text_lower for kw in keywords):
            return category
    return None


async def save_blocker(
    farmer_phone: str,
    message: str,
    county: str,
    language: str,
    category: Optional[str] = None,
) -> bool:
    if not BLOCKER_QUEUE:
        return False

    category = category or detect_blocker_category(message) or "other"
    record = {
        "farmer_phone": farmer_phone,
        "message": message,
        "county": county,
        "language": language,
        "category": category,
        "brs_problem_id": BLOCKER_CATEGORIES.get(category, "P01"),
        "status": "open",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    try:
        get_sqs().send_message(
            QueueUrl=BLOCKER_QUEUE,
            MessageBody=json.dumps(record),
            MessageAttributes={
                "category": {"StringValue": category, "DataType": "String"},
                "county":   {"StringValue": county,   "DataType": "String"},
            },
        )
        return True
    except Exception:
        return False
