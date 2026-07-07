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

    print("\n=== Step 2.5: Enrich with Wikidata club coordinates ===")
    squads_path_2 = RAW_DIR / "squads_raw.json"
    teams_2 = json.loads(squads_path_2.read_text(encoding="utf-8"))
    club_names = list({p["club"] for t in teams_2 for p in t["players"] if p.get("club")})
    print(f"  Found {len(club_names)} unique clubs")
    from worldcup.extract.wikidata import enrich_club_coords
    club_cache_path = RAW_DIR / "club_coords_cache.json"
    club_coords = enrich_club_coords(club_names, cache_path=club_cache_path)
    found = sum(1 for v in club_coords.values() if v.get("club_lat") is not None)
    print(f"  Club coordinate coverage: {found}/{len(club_names)}")

    print("\n=== Step 3: Build final dataset ===")
    build_dataset.run()

    print("\n=== Pipeline complete ===")


if __name__ == "__main__":
    main()
