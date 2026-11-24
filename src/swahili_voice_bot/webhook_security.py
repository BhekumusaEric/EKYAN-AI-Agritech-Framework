import hashlib
import hmac


def verify_meta_webhook_signature(
    payload: bytes, signature_header: str, app_secret: str
) -> bool:
    if not app_secret or not signature_header.startswith("sha256="):
        return False
    expected = "sha256=" + hmac.new(
        app_secret.encode(),
        payload,
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(expected, signature_header)
