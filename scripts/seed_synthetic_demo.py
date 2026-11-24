from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from src.ekyan_mvp.database import (
    database_url_from_environment,
    initialize_database,
    make_engine,
    make_session_factory,
)
from src.ekyan_mvp.demo_seed import seed_synthetic_demo


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Add a deterministic, synthetic Busia poultry demo dataset to a local SQLite database."
    )
    parser.add_argument(
        "--database-url",
        help="SQLite URL to seed; defaults to EKYAN_DATABASE_URL or the local demo database.",
    )
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Write the synthetic data. Without this flag, the script only reports the target.",
    )
    args = parser.parse_args()
    database_url = args.database_url or database_url_from_environment()
    if not database_url.startswith("sqlite"):
        parser.error("Synthetic demo seeding is restricted to SQLite databases.")
    if not args.apply:
        print("Dry run: no data written. Re-run with --apply to add synthetic records.")
        return

    engine = make_engine(database_url)
    try:
        factory = make_session_factory(engine)
        initialize_database(engine, factory)
        result = seed_synthetic_demo(factory)
        if result.get("alreadySeeded"):
            print("Synthetic dataset already exists; no records were added.")
        else:
            for label, count in result.items():
                if label != "alreadySeeded":
                    print(f"{label}: {count}")
    finally:
        engine.dispose()


if __name__ == "__main__":
    main()
