from datetime import date, datetime, timedelta, timezone
import unittest

from fastapi import FastAPI
from fastapi.testclient import TestClient

from sqlalchemy import inspect, select

from src.ekyan_mvp.database import (
    initialize_database,
    make_engine,
    make_session_factory,
    upgrade_transaction_schema,
)
from src.ekyan_mvp.models import AuditLog
from src.ekyan_mvp.router import create_router


class EkyanMvpApiTests(unittest.TestCase):
    def setUp(self):
        self.engine = make_engine("sqlite://")
        self.factory = make_session_factory(self.engine)
        initialize_database(self.engine, self.factory)
        app = FastAPI()
        app.include_router(
            create_router(
                self.factory,
                auth_secret="test-secret-that-is-long-enough",
                demo_auth_enabled=True,
            )
        )
        self.client = TestClient(app)

    def tearDown(self):
        self.client.close()
        self.engine.dispose()

    def token(self, role):
        response = self.client.post("/api/v1/auth/demo-session", json={"role": role})
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()["accessToken"]

    def headers(self, role):
        return {"Authorization": f"Bearer {self.token(role)}"}

    def test_auth_and_synthetic_farmer_validation(self):
        self.assertEqual(self.client.get("/api/v1/me").status_code, 401)
        headers = self.headers("agripreneur")
        response = self.client.post(
            "/api/v1/farmers",
            headers=headers,
            json={
                "name": "A Real Farmer",
                "village": "Teso",
                "ward": "Teso South",
                "consentToRecord": True,
            },
        )
        self.assertEqual(response.status_code, 422)
        village_response = self.client.post(
            "/api/v1/farmers",
            headers=headers,
            json={
                "name": "Synthetic Farmer 011",
                "village": "Bumala",
                "ward": "Teso South",
                "consentToRecord": True,
            },
        )
        self.assertEqual(village_response.status_code, 422)

    def test_offline_sync_is_idempotent(self):
        headers = self.headers("agripreneur")
        request = {
            "entries": [
                {
                    "clientId": "client-farmer-001",
                    "kind": "farmer",
                    "payload": {
                        "name": "Synthetic Farmer 010",
                        "village": "Synthetic Village C",
                        "ward": "Teso South",
                        "consentToRecord": True,
                    },
                },
                {
                    "clientId": "client-order-001",
                    "kind": "order",
                    "onBehalfOf": "client-farmer-001",
                    "payload": {
                        "item": "Feed (bags)",
                        "quantity": 3,
                        "neededBy": "2027-01-15",
                        "ward": "Teso South",
                    },
                },
            ]
        }
        first = self.client.post("/api/v1/sync", headers=headers, json=request)
        second = self.client.post("/api/v1/sync", headers=headers, json=request)
        self.assertEqual(first.status_code, 200, first.text)
        self.assertEqual(second.status_code, 200, second.text)
        self.assertEqual([item["status"] for item in first.json()["results"]], ["created", "created"])
        self.assertEqual([item["status"] for item in second.json()["results"]], ["duplicate", "duplicate"])

    def test_supplier_sees_redacted_blockers_and_cannot_overcommit(self):
        agripreneur_headers = self.headers("agripreneur")
        blocker_response = self.client.post(
            "/api/v1/blockers",
            headers=agripreneur_headers,
            json={
                "farmerId": "synthetic-farmer-001",
                "category": "Inputs",
                "description": "Synthetic feed access needs follow-up.",
                "ward": "Teso South",
                "confirmedSuggestion": True,
            },
        )
        self.assertEqual(blocker_response.status_code, 201, blocker_response.text)

        supplier_headers = self.headers("supplier")
        blockers = self.client.get("/api/v1/blockers", headers=supplier_headers).json()["blockers"]
        created = next(item for item in blockers if item["id"] == blocker_response.json()["blocker"]["id"])
        self.assertIsNone(created["farmerId"])
        self.assertIsNone(created["description"])
        unassigned = self.client.patch(
            f"/api/v1/blockers/{created['id']}",
            headers=self.headers("extension_officer"),
            json={"status": "resolved", "resolutionNote": "Synthetic follow-up complete."},
        )
        self.assertEqual(unassigned.status_code, 403)
        unresolved = self.client.patch(
            f"/api/v1/blockers/{created['id']}",
            headers=supplier_headers,
            json={"status": "resolved", "resolutionNote": "Synthetic follow-up complete."},
        )
        self.assertEqual(unresolved.status_code, 422)
        resolved = self.client.patch(
            f"/api/v1/blockers/{created['id']}",
            headers=supplier_headers,
            json={
                "status": "resolved",
                "resolutionNote": "Synthetic follow-up complete.",
                "farmerConfirmed": True,
            },
        )
        self.assertEqual(resolved.status_code, 200, resolved.text)

        groups = self.client.get("/api/v1/demand-groups", headers=supplier_headers)
        self.assertEqual(groups.status_code, 200, groups.text)
        group = groups.json()["demandGroups"][0]
        excessive = self.client.post(
            f"/api/v1/demand-groups/{group['id']}/commitments",
            headers=supplier_headers,
            json={
                "quantity": group["totalQuantity"] + 1,
                "unitPriceKes": 100,
                "qualityEvidenceRef": "synthetic-evidence-001",
                "deliveryDate": (datetime.now(timezone.utc) + timedelta(days=7)).date().isoformat(),
            },
        )
        self.assertEqual(excessive.status_code, 422)

    def test_lender_profile_access_requires_active_consent(self):
        agripreneur_headers = self.headers("agripreneur")
        consent_response = self.client.post(
            "/api/v1/consents",
            headers=agripreneur_headers,
            json={
                "lenderId": "demo-lender-001",
                "purpose": "finance_readiness_review",
                "expiresAt": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
            },
        )
        self.assertEqual(consent_response.status_code, 201, consent_response.text)
        lender_headers = self.headers("lender")
        profile = self.client.get(
            "/api/v1/profiles/demo-agripreneur-001",
            headers=lender_headers,
        )
        self.assertEqual(profile.status_code, 200, profile.text)
        self.assertEqual(profile.json()["protected_characteristics_used"], [])

        consent_id = consent_response.json()["consent"]["id"]
        revoked = self.client.delete(f"/api/v1/consents/{consent_id}", headers=agripreneur_headers)
        self.assertEqual(revoked.status_code, 200, revoked.text)
        denied = self.client.get(
            "/api/v1/profiles/demo-agripreneur-001",
            headers=lender_headers,
        )
        self.assertEqual(denied.status_code, 403)

    def test_bookkeeping_records_update_and_profile_contains_no_credit_score(self):
        headers = self.headers("agripreneur")
        before_profile = self.client.get("/api/v1/profiles/me", headers=headers).json()
        before = before_profile["business"]
        today = date.today()
        before_current_month = next(
            month for month in before_profile["monthly_summary"] if month["month"] == today.strftime("%Y-%m")
        )
        sale = self.client.post(
            "/api/v1/transactions",
            headers=headers,
            json={
                "transactionType": "sale",
                "category": "sales",
                "amountKes": 12000,
                "transactionDate": today.isoformat(),
                "paymentStatus": "unpaid",
                "dueDate": (today + timedelta(days=7)).isoformat(),
                "counterparty": "synthetic-buyer-001",
                "notes": "Synthetic poultry sale",
            },
        )
        self.assertEqual(sale.status_code, 201, sale.text)
        sale_id = sale.json()["transaction"]["id"]
        expense = self.client.post(
            "/api/v1/transactions",
            headers=headers,
            json={
                "transactionType": "purchase",
                "category": "feed",
                "amountKes": 4000,
                "transactionDate": today.isoformat(),
                "paymentStatus": "unpaid",
            },
        )
        self.assertEqual(expense.status_code, 201, expense.text)

        unpaid_loan = self.client.post(
            "/api/v1/transactions",
            headers=headers,
            json={
                "transactionType": "loan_received",
                "category": "loan",
                "amountKes": 3000,
                "transactionDate": today.isoformat(),
                "paymentStatus": "unpaid",
                "dueDate": (today + timedelta(days=14)).isoformat(),
            },
        )
        self.assertEqual(unpaid_loan.status_code, 201, unpaid_loan.text)
        unpaid_savings = self.client.post(
            "/api/v1/transactions",
            headers=headers,
            json={
                "transactionType": "savings_deposit",
                "category": "savings",
                "amountKes": 500,
                "transactionDate": today.isoformat(),
                "paymentStatus": "unpaid",
                "dueDate": (today + timedelta(days=14)).isoformat(),
            },
        )
        self.assertEqual(unpaid_savings.status_code, 201, unpaid_savings.text)

        invalid = self.client.post(
            "/api/v1/transactions",
            headers=headers,
            json={
                "transactionType": "purchase",
                "category": "feed",
                "amountKes": 0,
                "transactionDate": today.isoformat(),
            },
        )
        self.assertEqual(invalid.status_code, 422)
        invalid_due_date = self.client.post(
            "/api/v1/transactions",
            headers=headers,
            json={
                "transactionType": "purchase",
                "category": "feed",
                "amountKes": 100,
                "transactionDate": today.isoformat(),
                "dueDate": (today - timedelta(days=1)).isoformat(),
            },
        )
        self.assertEqual(invalid_due_date.status_code, 422)
        rejected_real_counterparty = self.client.post(
            "/api/v1/transactions",
            headers=headers,
            json={
                "transactionType": "sale",
                "amountKes": 100,
                "transactionDate": today.isoformat(),
                "counterparty": "Real Customer",
            },
        )
        self.assertEqual(rejected_real_counterparty.status_code, 422)

        profile = self.client.get("/api/v1/profiles/me", headers=headers)
        self.assertEqual(profile.status_code, 200, profile.text)
        body = profile.json()
        self.assertNotIn("score", body)
        self.assertNotIn("readiness_band", body)
        self.assertEqual(body["business"]["revenue_kes"], before["revenue_kes"] + 12000)
        self.assertEqual(body["business"]["expenses_kes"], before["expenses_kes"] + 4000)
        self.assertEqual(body["business"]["unpaid_income_kes"], 12000)
        self.assertEqual(body["business"]["unpaid_expenses_kes"], 4000)
        self.assertEqual(body["record_coverage"]["unpaid_without_due_date"], 1)
        current_month = next(
            month for month in body["monthly_summary"] if month["month"] == today.strftime("%Y-%m")
        )
        self.assertEqual(current_month["loan_received_kes"], before_current_month["loan_received_kes"])
        self.assertEqual(current_month["savings_deposit_kes"], before_current_month["savings_deposit_kes"])

        invalid_due_date_update = self.client.patch(
            f"/api/v1/transactions/{sale_id}",
            headers=headers,
            json={"dueDate": (today - timedelta(days=1)).isoformat()},
        )
        self.assertEqual(invalid_due_date_update.status_code, 422)
        updated = self.client.patch(
            f"/api/v1/transactions/{sale_id}",
            headers=headers,
            json={"amountKes": 12500, "paymentStatus": "paid"},
        )
        self.assertEqual(updated.status_code, 200, updated.text)
        self.assertEqual(updated.json()["transaction"]["amountKes"], 12500)
        self.assertEqual(updated.json()["transaction"]["paymentStatus"], "paid")
        for transaction in (unpaid_loan, unpaid_savings):
            marked_paid = self.client.patch(
                f"/api/v1/transactions/{transaction.json()['transaction']['id']}",
                headers=headers,
                json={"paymentStatus": "paid"},
            )
            self.assertEqual(marked_paid.status_code, 200, marked_paid.text)
        refreshed = self.client.get("/api/v1/profiles/me", headers=headers).json()
        self.assertEqual(refreshed["business"]["revenue_kes"], before["revenue_kes"] + 12500)
        self.assertEqual(refreshed["business"]["unpaid_income_kes"], 0)
        refreshed_month = next(
            month for month in refreshed["monthly_summary"] if month["month"] == today.strftime("%Y-%m")
        )
        self.assertEqual(
            refreshed_month["loan_received_kes"], before_current_month["loan_received_kes"] + 3000
        )
        self.assertEqual(
            refreshed_month["savings_deposit_kes"], before_current_month["savings_deposit_kes"] + 500
        )

        denied = self.client.get("/api/v1/transactions", headers=self.headers("lender"))
        self.assertEqual(denied.status_code, 403)

    def test_application_pack_is_audited_and_transaction_rows_are_opt_in(self):
        headers = self.headers("agripreneur")
        self.client.post(
            "/api/v1/transactions",
            headers=headers,
            json={
                "transactionType": "sale",
                "category": "sales",
                "amountKes": 2500,
                "transactionDate": date.today().isoformat(),
            },
        )
        payload = {
            "purpose": "inputs",
            "requestedAmountKes": 15000,
            "termMonths": 3,
        }
        summary = self.client.post(
            "/api/v1/profiles/me/application-pack",
            headers=headers,
            json=payload,
        )
        self.assertEqual(summary.status_code, 200, summary.text)
        self.assertIn("text/csv", summary.headers["content-type"])
        self.assertIn("not sent to any lender", summary.text)
        self.assertNotIn("Record type,Category", summary.text)

        detailed = self.client.post(
            "/api/v1/profiles/me/application-pack",
            headers=headers,
            json={**payload, "includeTransactions": True},
        )
        self.assertEqual(detailed.status_code, 200, detailed.text)
        self.assertIn("Record type,Category,Amount", detailed.text)
        self.assertIn("sale,sales,2500.0", detailed.text)

        denied = self.client.post(
            "/api/v1/profiles/me/application-pack",
            headers=self.headers("lender"),
            json=payload,
        )
        self.assertEqual(denied.status_code, 403)
        with self.factory() as session:
            exports = session.scalars(
                select(AuditLog).where(AuditLog.entity == "finance_application_pack")
            ).all()
        self.assertEqual(len(exports), 2)

    def test_existing_transaction_table_gets_new_bookkeeping_columns(self):
        engine = make_engine("sqlite://")
        try:
            with engine.begin() as connection:
                connection.exec_driver_sql(
                    "CREATE TABLE mvp_transactions (id VARCHAR(80) PRIMARY KEY, transaction_type VARCHAR(16))"
                )
            upgrade_transaction_schema(engine)
            columns = {column["name"] for column in inspect(engine).get_columns("mvp_transactions")}
            self.assertTrue({"category", "payment_status", "due_date", "notes"}.issubset(columns))
            upgrade_transaction_schema(engine)
        finally:
            engine.dispose()

    def test_kpi_access_is_role_scoped_and_gender_demand_breakdown_is_unavailable(self):
        supplier_headers = self.headers("supplier")
        denied = self.client.get("/api/v1/kpi", headers=supplier_headers)
        self.assertEqual(denied.status_code, 403)

        manager_headers = self.headers("programme_manager")
        response = self.client.get("/api/v1/kpi?gender=woman", headers=manager_headers)
        self.assertEqual(response.status_code, 200, response.text)
        demand_commitment_rate = response.json()["values"]["K5"]
        self.assertIsNone(demand_commitment_rate["value"])
        self.assertIn("gender-disaggregated", demand_commitment_rate["unavailableReason"])

    def test_adoption_intention_sync_updates_k6_as_a_service_action_proxy(self):
        agripreneur_headers = self.headers("agripreneur")
        manager_headers = self.headers("programme_manager")
        before_quality = self.client.get("/api/v1/data-quality", headers=manager_headers)
        self.assertEqual(before_quality.status_code, 200, before_quality.text)
        synced = self.client.post(
            "/api/v1/sync",
            headers=agripreneur_headers,
            json={
                "entries": [
                    {
                        "clientId": "offline-intention-001",
                        "kind": "intention",
                        "onBehalfOf": "synthetic-farmer-001",
                        "payload": {
                            "practice": "Synthetic vaccination plan",
                            "ward": "Teso South",
                            "targetDate": (datetime.now(timezone.utc) + timedelta(days=14)).date().isoformat(),
                        },
                    },
                    {
                        "clientId": "offline-intention-002",
                        "kind": "intention",
                        "onBehalfOf": "synthetic-farmer-001",
                        "payload": {
                            "practice": "Vaccination plan",
                            "targetDate": (datetime.now(timezone.utc) + timedelta(days=14)).date().isoformat(),
                        },
                    },
                ]
            },
        )
        self.assertEqual(synced.status_code, 200, synced.text)
        self.assertEqual(
            [entry["status"] for entry in synced.json()["results"]],
            ["created", "rejected"],
            synced.text,
        )
        self.assertIn("Synthetic or Demo", synced.json()["results"][1]["reason"])

        after_quality = self.client.get("/api/v1/data-quality", headers=manager_headers)
        self.assertEqual(
            after_quality.json()["summary"]["checked"],
            before_quality.json()["summary"]["checked"] + 1,
        )
        before_action = self.client.get("/api/v1/kpi", headers=manager_headers).json()["values"]["K6"]
        self.assertEqual(before_action["value"], 0)
        self.assertEqual(before_action["denominator"], 1)

        supplier_headers = self.headers("supplier")
        groups = self.client.get("/api/v1/demand-groups", headers=supplier_headers).json()["demandGroups"]
        group = groups[0]
        commitment = self.client.post(
            f"/api/v1/demand-groups/{group['id']}/commitments",
            headers=supplier_headers,
            json={
                "quantity": group["totalQuantity"],
                "unitPriceKes": 100,
                "qualityEvidenceRef": "synthetic-evidence-k6",
                "deliveryDate": (datetime.now(timezone.utc) + timedelta(days=7)).date().isoformat(),
            },
        )
        self.assertEqual(commitment.status_code, 201, commitment.text)
        orders = self.client.get("/api/v1/orders", headers=agripreneur_headers).json()["orders"]
        farmer_order = next(item for item in orders if item["farmerId"] == "synthetic-farmer-001")
        fulfilled = self.client.post(
            f"/api/v1/orders/{farmer_order['id']}/fulfil",
            headers=agripreneur_headers,
        )
        self.assertEqual(fulfilled.status_code, 200, fulfilled.text)

        after_action = self.client.get("/api/v1/kpi", headers=manager_headers).json()["values"]["K6"]
        self.assertEqual(after_action["value"], 100)
        self.assertEqual(after_action["numerator"], 1)
        self.assertEqual(after_action["denominator"], 1)
        self.assertIn("does not verify", after_action["interpretationNote"])
        self.assertEqual(
            after_action["funnel"],
            {
                "intentionFarmers": 1,
                "orderedFarmers": 1,
                "fulfilledFarmers": 1,
                "adoptionVerified": None,
            },
        )


if __name__ == "__main__":
    unittest.main()
