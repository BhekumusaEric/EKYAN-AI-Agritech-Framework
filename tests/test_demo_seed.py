import unittest

from sqlalchemy import func, select

from src.ekyan_mvp.database import initialize_database, make_engine, make_session_factory
from src.ekyan_mvp.demo_seed import seed_synthetic_demo
from src.ekyan_mvp.models import (
    AdoptionIntention,
    Blocker,
    BusinessTransaction,
    Farmer,
    FieldOrder,
    ProgrammeCost,
    SavingsRecord,
    User,
)


class SyntheticDemoSeedTests(unittest.TestCase):
    def setUp(self):
        self.engine = make_engine("sqlite://")
        self.factory = make_session_factory(self.engine)
        initialize_database(self.engine, self.factory)

    def tearDown(self):
        self.engine.dispose()

    def test_seed_is_synthetic_idempotent_and_populates_the_pilot_dataset(self):
        result = seed_synthetic_demo(self.factory)

        self.assertFalse(result["alreadySeeded"])
        self.assertEqual(result["farmersAdded"], 1498)
        self.assertEqual(result["ordersAdded"], 1998)
        self.assertEqual(result["blockersAdded"], 299)
        self.assertEqual(result["intentionsAdded"], 600)
        self.assertEqual(result["transactionsAdded"], 898)

        with self.factory() as session:
            self.assertEqual(session.scalar(select(func.count()).select_from(Farmer)), 1500)
            self.assertEqual(session.scalar(select(func.count()).select_from(FieldOrder)), 2000)
            self.assertEqual(session.scalar(select(func.count()).select_from(Blocker)), 300)
            self.assertEqual(session.scalar(select(func.count()).select_from(AdoptionIntention)), 600)
            self.assertEqual(session.scalar(select(func.count()).select_from(BusinessTransaction)), 900)
            self.assertEqual(session.scalar(select(func.count()).select_from(SavingsRecord)), 91)
            self.assertEqual(session.scalar(select(func.count()).select_from(ProgrammeCost)), 6)
            self.assertEqual(
                session.scalar(
                    select(func.count()).select_from(User).where(User.role == "agripreneur")
                ),
                15,
            )
            self.assertEqual(
                session.scalar(
                    select(func.count()).select_from(User).where(
                        User.role == "agripreneur",
                        User.gender == "woman",
                    )
                ),
                8,
            )
            self.assertIsNone(session.scalar(select(Farmer.id).where(Farmer.synthetic.is_(False))))
            self.assertIsNone(session.scalar(select(FieldOrder.id).where(FieldOrder.synthetic.is_(False))))
            self.assertIsNone(session.scalar(select(Blocker.id).where(Blocker.synthetic.is_(False))))
            self.assertIsNone(session.scalar(select(AdoptionIntention.id).where(AdoptionIntention.synthetic.is_(False))))
            self.assertIsNone(session.scalar(select(BusinessTransaction.id).where(BusinessTransaction.synthetic.is_(False))))
            inconsistent_transaction = session.scalar(
                select(BusinessTransaction.id)
                .join(Farmer, BusinessTransaction.farmer_id == Farmer.id)
                .where(BusinessTransaction.agripreneur_id != Farmer.agripreneur_id)
                .limit(1)
            )
            self.assertIsNone(inconsistent_transaction)

        self.assertEqual(seed_synthetic_demo(self.factory), {"alreadySeeded": True})

    def test_seed_refuses_a_database_with_non_synthetic_people(self):
        with self.factory.begin() as session:
            user = session.get(User, "demo-agripreneur-001")
            self.assertIsNotNone(user)
            user.synthetic = False

        with self.assertRaisesRegex(RuntimeError, "contains non-synthetic data"):
            seed_synthetic_demo(self.factory)


if __name__ == "__main__":
    unittest.main()
