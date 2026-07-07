"""Scrape current World Cup 2026 match results from Wikipedia and update matches.json."""

import json
import re
import ssl
import sys
from datetime import date
from pathlib import Path

import httpx
import truststore
from bs4 import BeautifulSoup, Tag

OUTPUT_PATH = Path(__file__).resolve().parent.parent / "web" / "public" / "data" / "matches.json"

TOURNAMENT_END = date(2026, 7, 20)

GROUP_URLS = [
    f"https://en.wikipedia.org/wiki/2026_FIFA_World_Cup_Group_{letter}"
    for letter in "ABCDEFGHIJKL"
]
KNOCKOUT_URL = "https://en.wikipedia.org/wiki/2026_FIFA_World_Cup_knockout_stage"

HEADING_TO_ROUND: dict[str, str] = {
    "round_of_32": "Round of 32",
    "round_of_16": "Round of 16",
    "quarterfinals": "Quarter-finals",
    "quarter-finals": "Quarter-finals",
    "semifinals": "Semi-finals",
    "semi-finals": "Semi-finals",
    "third-place_match": "Third place",
    "third_place": "Third place",
    "final": "Final",
}


def _client() -> httpx.Client:
    return httpx.Client(
        headers={"User-Agent": "WorldCup2026MatchUpdater/0.1 (github.com/featheranalytics)"},
        timeout=30,
        verify=truststore.SSLContext(ssl.PROTOCOL_TLS_CLIENT),
    )


def parse_score(text: str) -> tuple[int | None, int | None, int | None, int | None]:
    text = text.strip().replace("–", "-").replace("—", "-")
    if not text or "v" in text.lower():
        return None, None, None, None

    pen_a, pen_b = None, None
    pen_match = re.search(r"\((\d+)-(\d+)", text)
    if pen_match:
        pen_a, pen_b = int(pen_match.group(1)), int(pen_match.group(2))

    score_match = re.match(r"(\d+)-(\d+)", text)
    if not score_match:
        return None, None, None, None

    return int(score_match.group(1)), int(score_match.group(2)), pen_a, pen_b


def determine_winner(
    team_a: str, team_b: str, score_a: int | None, score_b: int | None,
    pen_a: int | None, pen_b: int | None
) -> str | None:
    if score_a is None or score_b is None:
        return None
    if pen_a is not None and pen_b is not None:
        return team_a if pen_a > pen_b else team_b
    if score_a > score_b:
        return team_a
    if score_b > score_a:
        return team_b
    return None


def extract_match(table: Tag, round_name: str, stage: str) -> dict | None:
    fhome = table.find("th", class_="fhome")
    faway = table.find("th", class_="faway")
    fscore = table.find("th", class_="fscore")
    if not fhome or not faway or not fscore:
        return None

    team_a = fhome.get_text(strip=True)
    team_b = faway.get_text(strip=True)
    score_text = fscore.get_text(strip=True)

    bday = table.find_previous("span", class_="bday")
    match_date = bday.get_text(strip=True) if bday else ""

    score_a, score_b, pen_a, pen_b = parse_score(score_text)

    if pen_a is None and "a.e.t" in score_text.lower():
        full_text = table.get_text()
        pen_match = re.search(r"Penalties.*?(\d)\s*[–-]\s*(\d)", full_text, re.DOTALL)
        if pen_match:
            pen_a, pen_b = int(pen_match.group(1)), int(pen_match.group(2))

    winner = determine_winner(team_a, team_b, score_a, score_b, pen_a, pen_b)

    match: dict = {
        "round": round_name,
        "stage": stage,
        "date": match_date,
        "team_a": team_a,
        "team_b": team_b,
        "score_a": score_a,
        "score_b": score_b,
        "winner": winner,
    }
    if pen_a is not None:
        match["penalties_a"] = pen_a
        match["penalties_b"] = pen_b
    return match


def scrape_group_matches(client: httpx.Client) -> list[dict]:
    matches = []
    for url in GROUP_URLS:
        letter = url.split("_")[-1]
        group_name = f"Group {letter}"
        print(f"  {group_name}...", end=" ", flush=True)

        try:
            resp = client.get(url)
            resp.raise_for_status()
        except httpx.HTTPError as e:
            print(f"FAILED ({e})")
            continue

        soup = BeautifulSoup(resp.text, "lxml")
        count = 0
        for table in soup.find_all("table", class_="fevent"):
            match = extract_match(table, group_name, "group")
            if match:
                matches.append(match)
                count += 1

        print(f"{count} matches")

    return matches


def scrape_knockout_matches(client: httpx.Client) -> list[dict]:
    print("  Knockout stage...", end=" ", flush=True)
    matches = []

    try:
        resp = client.get(KNOCKOUT_URL)
        resp.raise_for_status()
    except httpx.HTTPError as e:
        print(f"FAILED ({e})")
        return matches

    soup = BeautifulSoup(resp.text, "lxml")

    for table in soup.find_all("table", class_="fevent"):
        prev_h2 = table.find_previous("h2")
        hid = (prev_h2.get("id") or "").lower().replace(" ", "_").replace("-", "_") if prev_h2 else ""

        round_name = "Round of 32"
        for key, normalized in HEADING_TO_ROUND.items():
            if key.replace("-", "_") in hid:
                round_name = normalized
                break

        match = extract_match(table, round_name, "knockout")
        if match:
            matches.append(match)

    print(f"{len(matches)} matches")
    return matches


def main() -> None:
    if date.today() > TOURNAMENT_END:
        print("Tournament has ended. Skipping update.")
        sys.exit(0)

    print("Updating match data from Wikipedia...\n")

    with _client() as client:
        group_matches = scrape_group_matches(client)
        print()
        knockout_matches = scrape_knockout_matches(client)

    all_matches = group_matches + knockout_matches
    completed = sum(1 for m in all_matches if m["score_a"] is not None)

    print(f"\nTotal: {len(all_matches)} matches ({completed} completed, {len(all_matches) - completed} upcoming)")

    existing = []
    if OUTPUT_PATH.exists():
        existing = json.loads(OUTPUT_PATH.read_text(encoding="utf-8"))

    if len(all_matches) == 0 and len(existing) > 0:
        print("ERROR: Scraper returned 0 matches but existing data has matches. Aborting to avoid data loss.")
        sys.exit(1)

    if len(all_matches) < len(existing) * 0.5:
        print(f"WARNING: Scraper returned {len(all_matches)} matches vs {len(existing)} existing. Aborting to avoid data loss.")
        sys.exit(1)

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(
        json.dumps(all_matches, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )

    old_completed = sum(1 for m in existing if m.get("score_a") is not None)
    if len(all_matches) != len(existing) or completed != old_completed:
        print(f"Data changed — {len(all_matches)} matches ({completed} completed) written.")
    else:
        print("No changes detected.")


if __name__ == "__main__":
    main()
