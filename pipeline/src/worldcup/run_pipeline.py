"""Run the full data pipeline: extract → enrich → transform."""

import json

from worldcup.config import RAW_DIR
from worldcup.extract import wikipedia, wikidata
from worldcup.transform import build_dataset


def main() -> None:
    print("=== Step 1: Extract squads from Wikipedia ===")
    wikipedia.run()

    squads_path = RAW_DIR / "squads_raw.json"
    teams = json.loads(squads_path.read_text(encoding="utf-8"))
    if len(teams) == 0:
        raise RuntimeError(
            "Wikipedia extract produced 0 teams — check page structure at "
            f"{wikipedia.SQUADS_URL}"
        )
    print(f"  Validated: {len(teams)} teams in squads_raw.json")

    print("\n=== Step 2: Enrich with Wikidata birthplace data ===")
    wikidata.run()

    birthplace_path = RAW_DIR / "birthplace_raw.json"
    bp_data = json.loads(birthplace_path.read_text(encoding="utf-8"))
    total_players = sum(len(t["players"]) for t in teams)
    coverage = len(bp_data) / total_players * 100 if total_players else 0
    print(f"  Birthplace coverage: {len(bp_data)}/{total_players} ({coverage:.0f}%)")

    print("\n=== Step 3: Build final dataset ===")
    build_dataset.run()

    print("\n=== Pipeline complete ===")


if __name__ == "__main__":
    main()
