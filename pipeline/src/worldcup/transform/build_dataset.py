"""Combine roster + birthplace data into the final player dataset."""

import json
import urllib.parse
from pathlib import Path

import polars as pl

from worldcup.config import OUTPUT_DIR, RAW_DIR
from worldcup.contracts.player import get_confederation

COUNTRY_ALIASES: dict[str, set[str]] = {
    "England": {
        "United Kingdom", "England", "Isle of Man",
        "Northern Ireland", "Jersey", "Guernsey",
    },
    "Scotland": {"United Kingdom", "Scotland", "Isle of Man"},
    "Wales": {"United Kingdom", "Wales", "Isle of Man"},
    "United States": {"United States of America", "United States", "USA"},
    "South Korea": {"South Korea", "Korea, Republic of", "Republic of Korea"},
    "DR Congo": {"Democratic Republic of the Congo", "DR Congo", "Zaire"},
    "Ivory Coast": {"Ivory Coast", "Côte d'Ivoire"},
    "Czech Republic": {"Czech Republic", "Czechia", "Czechoslovakia"},
    "Bosnia and Herzegovina": {"Bosnia and Herzegovina"},
    "Turkey": {"Turkey", "Türkiye"},
    "Cape Verde": {"Cape Verde", "Cabo Verde"},
    "Curaçao": {"Curaçao", "Netherlands Antilles", "Kingdom of the Netherlands"},
}

HISTORICAL_TERRITORIES = {
    "Roman Empire", "Soviet Union", "USSR", "Yugoslavia",
    "Czechoslovakia", "East Germany", "West Germany",
    "Kingdom of France", "French colonial empire",
    "Duchy of Lorraine", "Margraviate of Brandenburg",
    "Portuguese Empire", "Tashkent Khanate",
    "Austria-Hungary", "Kingdom of the Netherlands",
    "Ottoman Empire", "Russian Empire",
    "Kingdom of Italy", "Kingdom of Spain",
    "Kingdom of Prussia", "Mandatory Palestine",
}


def is_home_born(team: str, birth_country: str) -> tuple[bool, bool]:
    """Return (is_home, birth_country_known)."""
    if not birth_country:
        return True, False
    if birth_country in HISTORICAL_TERRITORIES:
        return True, True
    if team in COUNTRY_ALIASES:
        return birth_country in COUNTRY_ALIASES[team], True
    return birth_country == team, True


def load_raw_data() -> tuple[list[dict], dict[str, dict], dict[str, dict]]:
    squads_path = RAW_DIR / "squads_raw.json"
    if not squads_path.exists():
        raise FileNotFoundError(
            f"Missing {squads_path} — run wikipedia extract first"
        )
    birthplace_path = RAW_DIR / "birthplace_raw.json"
    if not birthplace_path.exists():
        raise FileNotFoundError(
            f"Missing {birthplace_path} — run wikidata extract first"
        )
    squads = json.loads(squads_path.read_text(encoding="utf-8"))
    birthplace = json.loads(birthplace_path.read_text(encoding="utf-8"))

    club_coords_path = RAW_DIR / "club_coords_cache.json"
    club_coords: dict[str, dict] = {}
    if club_coords_path.exists():
        club_coords = json.loads(club_coords_path.read_text(encoding="utf-8"))

    return squads, birthplace, club_coords


def build_player_records(
    squads: list[dict],
    birthplace_map: dict[str, dict],
    club_coords_map: dict[str, dict],
) -> list[dict]:
    records = []

    for team_data in squads:
        team = team_data["team"]
        confederation = get_confederation(team)

        for player in team_data["players"]:
            wiki_title = urllib.parse.unquote(player.get("wiki_title", ""))
            bp = birthplace_map.get(wiki_title, {})

            birth_country = bp.get("birth_country", "")
            is_home, bc_known = is_home_born(team, birth_country)

            coords = club_coords_map.get(player["club"], {})

            records.append({
                "name": player["name"],
                "team_country": team,
                "team_confederation": confederation,
                "position": player["position"],
                "club": player["club"],
                "club_country": player["club_country"],
                "club_lat": coords.get("club_lat"),
                "club_lon": coords.get("club_lon"),
                "birth_date": player["birth_date"],
                "birth_city": bp.get("birth_city", ""),
                "birth_country": birth_country,
                "birth_lat": bp.get("birth_lat"),
                "birth_lon": bp.get("birth_lon"),
                "caps": player["caps"],
                "goals": player["goals"],
                "is_foreign_born": not is_home,
                "birth_country_known": bc_known,
            })

    return records


def run() -> Path:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    squads, birthplace_map, club_coords_map = load_raw_data()
    records = build_player_records(squads, birthplace_map, club_coords_map)

    df = pl.DataFrame(records)

    json_path = OUTPUT_DIR / "players.json"
    json_path.write_text(
        json.dumps(records, indent=2, ensure_ascii=False), encoding="utf-8"
    )

    csv_path = OUTPUT_DIR / "players.csv"
    df.write_csv(csv_path)

    total = len(records)
    known = df.filter(pl.col("birth_country_known")).height
    foreign_born = df.filter(pl.col("is_foreign_born") & pl.col("birth_country_known")).height

    print(f"Dataset: {total} players, {known} with known birthplace, {foreign_born} foreign-born")
    print(f"Output: {json_path}")
    print(f"Output: {csv_path}")

    summary = build_summary(df)
    summary_path = OUTPUT_DIR / "summary.json"
    summary_path.write_text(json.dumps(summary, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Output: {summary_path}")

    return json_path


def build_summary(df: pl.DataFrame) -> dict:
    if df.height == 0:
        return {
            "total_players": 0,
            "total_teams": 0,
            "birth_country_known_count": 0,
            "foreign_born_count": 0,
            "foreign_born_pct": 0.0,
            "teams": [],
            "birth_countries": [],
            "confederations": [],
            "top_clubs": [],
        }

    known_df = df.filter(pl.col("birth_country_known"))

    teams = df.group_by("team_country").agg(
        pl.len().alias("squad_size"),
        pl.col("is_foreign_born").sum().alias("foreign_born_count"),
        pl.col("birth_country_known").sum().alias("birth_country_known_count"),
        pl.col("birth_country").n_unique().alias("birth_countries"),
    ).sort("team_country")

    birth_countries = df.filter(pl.col("birth_country") != "").group_by("birth_country").agg(
        pl.len().alias("player_count"),
        pl.col("team_country").n_unique().alias("teams_represented"),
    ).sort("player_count", descending=True)

    confederations = df.group_by("team_confederation").agg(
        pl.len().alias("player_count"),
        pl.col("team_country").n_unique().alias("team_count"),
        pl.col("is_foreign_born").sum().alias("foreign_born_count"),
        pl.col("birth_country_known").sum().alias("birth_country_known_count"),
    ).sort("team_confederation")

    clubs = df.filter(pl.col("club") != "").group_by("club").agg(
        pl.len().alias("player_count"),
        pl.col("team_country").n_unique().alias("teams_represented"),
        pl.col("club_country").first().alias("club_country"),
        pl.col("club_lat").drop_nulls().first().alias("club_lat"),
        pl.col("club_lon").drop_nulls().first().alias("club_lon"),
    ).sort("player_count", descending=True).head(50)

    foreign_born_total = known_df.filter(pl.col("is_foreign_born")).height
    known_total = known_df.height

    return {
        "total_players": df.height,
        "total_teams": df["team_country"].n_unique(),
        "birth_country_known_count": known_total,
        "foreign_born_count": foreign_born_total,
        "foreign_born_pct": round(
            foreign_born_total / known_total * 100, 1
        ) if known_total > 0 else 0.0,
        "teams": teams.to_dicts(),
        "birth_countries": birth_countries.to_dicts(),
        "confederations": confederations.to_dicts(),
        "top_clubs": clubs.to_dicts(),
    }


if __name__ == "__main__":
    run()
