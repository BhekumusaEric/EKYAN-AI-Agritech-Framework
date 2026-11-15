"""
EKYAN Connect — Shared AWS clients
All modules import from here to share a single boto3 session.
"""

import os
import boto3
from functools import lru_cache

AWS_REGION = os.getenv("AWS_REGION", "af-south-1")


@lru_cache(maxsize=1)
def get_dynamodb():
    return boto3.resource("dynamodb", region_name=AWS_REGION)


@lru_cache(maxsize=1)
def get_sqs():
    return boto3.client("sqs", region_name=AWS_REGION)


@lru_cache(maxsize=1)
def get_s3():
    return boto3.client("s3", region_name=AWS_REGION)


SESSIONS_TABLE = os.getenv("EKYAN_SESSIONS_TABLE", "EkyanStack-EkyanSessions")
CREDIT_TABLE   = os.getenv("EKYAN_CREDIT_TABLE",   "EkyanStack-EkyanCreditDecisions")
NUDGE_QUEUE    = os.getenv("EKYAN_NUDGE_QUEUE_URL", "")
BLOCKER_QUEUE  = os.getenv("EKYAN_BLOCKER_QUEUE_URL", "")
DATA_BUCKET    = os.getenv("EKYAN_DATA_BUCKET", f"ekyan-data-774525420097")
