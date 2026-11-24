import hashlib
import hmac
import unittest

from src.credit_scoring.presentation import credit_review_response
from src.swahili_voice_bot.webhook_security import verify_meta_webhook_signature


class CreditReviewResponseTests(unittest.TestCase):
    def test_response_requires_human_review_and_exposes_no_approval(self):
        response = credit_review_response(
            farmer_id="synthetic-farmer",
            aci_score=680,
            readiness_band="B",
            score_breakdown={"knowledge": 0.7},
            improvement_actions=["Complete the training module."],
        )

        self.assertEqual(response["review_status"], "requires_human_review")
        self.assertIn("not a loan approval", response["decision_notice"])
        self.assertNotIn("approved", response)
        self.assertNotIn("recommended_loan_usd", response)


class WebhookSignatureTests(unittest.TestCase):
    def test_missing_secret_fails_closed_even_for_valid_signature(self):
        payload = b'{"entry":[]}'
        signature = "sha256=" + hmac.new(
            b"configured-secret", payload, hashlib.sha256
        ).hexdigest()

        self.assertFalse(verify_meta_webhook_signature(payload, signature, ""))

    def test_valid_signature_is_accepted_and_tampered_signature_rejected(self):
        payload = b'{"entry":[]}'
        secret = "configured-secret"
        signature = "sha256=" + hmac.new(
            secret.encode(), payload, hashlib.sha256
        ).hexdigest()

        self.assertTrue(verify_meta_webhook_signature(payload, signature, secret))
        self.assertFalse(
            verify_meta_webhook_signature(payload + b" ", signature, secret)
        )

    def test_malformed_signature_is_rejected(self):
        self.assertFalse(
            verify_meta_webhook_signature(b"payload", "invalid", "configured-secret")
        )


if __name__ == "__main__":
    unittest.main()
