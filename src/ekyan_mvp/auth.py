from __future__ import annotations

import base64
import hashlib
import hmac
import json
import secrets
import time
from typing import Any


class InvalidToken(ValueError):
    pass


def development_secret() -> str:
    return secrets.token_urlsafe(32)


def issue_token(
    *,
    subject: str,
    role: str,
    secret: str,
    expires_in_seconds: int = 3600,
    now: int | None = None,
) -> str:
    issued = int(time.time()) if now is None else now
    payload = {
        "sub": subject,
        "role": role,
        "iat": issued,
        "exp": issued + expires_in_seconds,
    }
    encoded = base64.urlsafe_b64encode(
        json.dumps(payload, separators=(",", ":"), sort_keys=True).encode("utf-8")
    ).rstrip(b"=").decode("ascii")
    signature = hmac.new(
        secret.encode("utf-8"), encoded.encode("ascii"), hashlib.sha256
    ).digest()
    signature_text = base64.urlsafe_b64encode(signature).rstrip(b"=").decode("ascii")
    return f"{encoded}.{signature_text}"


def verify_token(
    token: str,
    *,
    secret: str,
    now: int | None = None,
) -> dict[str, Any]:
    try:
        encoded, signature_text = token.split(".", maxsplit=1)
        signature = base64.urlsafe_b64decode(
            signature_text + "=" * (-len(signature_text) % 4)
        )
        expected = hmac.new(
            secret.encode("utf-8"), encoded.encode("ascii"), hashlib.sha256
        ).digest()
        if not hmac.compare_digest(signature, expected):
            raise InvalidToken("Token signature is invalid.")
        payload = json.loads(
            base64.urlsafe_b64decode(encoded + "=" * (-len(encoded) % 4))
        )
    except (ValueError, UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise InvalidToken("Token is malformed.") from exc

    current_time = int(time.time()) if now is None else now
    if not isinstance(payload, dict) or not isinstance(payload.get("sub"), str):
        raise InvalidToken("Token subject is invalid.")
    if not isinstance(payload.get("role"), str):
        raise InvalidToken("Token role is invalid.")
    if not isinstance(payload.get("exp"), int) or payload["exp"] <= current_time:
        raise InvalidToken("Token has expired.")
    return payload
