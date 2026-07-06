"""Extract 2026 World Cup squad data from Wikipedia."""

import json
import re
import ssl
from pathlib import Path

import httpx
import truststore
from bs4 import BeautifulSoup, Tag

from worldcup.config import RAW_DIR

SQUADS_URL = "https://en.wikipedia.org/wiki/2026_FIFA_World_Cup_squads"
POSITION_MAP = {"GK": "Goalkeeper", "DF": "Defender", "MF": "Midfielder", "FW": "Forward"}


def fetch_squads_html() -> str:
    resp = httpx.get(
        SQUADS_URL,
        headers={"User-Agent": "WorldCup2026DataPipeline/0.1"},
        timeout=30,
        verify=truststore.SSLContext(ssl.PROTOCOL_TLS_CLIENT),
    )
    resp.raise_for_status()
    return resp.text


def parse_date(text: str) -> str:
    match = re.search(r"\((\d{4}-\d{2}-\d{2})\)", text)
    return match.group(1) if match else ""


FLAG_TO_COUNTRY: dict[str, str] = {
    "Flag_of_the_Netherlands": "Netherlands",
    "Flag_of_the_Czech_Republic": "Czech Republic",
    "Flag_of_Germany": "Germany",
    "Flag_of_England": "England",
    "Flag_of_Spain": "Spain",
    "Flag_of_France": "France",
    "Flag_of_Italy": "Italy",
    "Flag_of_Portugal": "Portugal",
    "Flag_of_Belgium": "Belgium",
    "Flag_of_Turkey": "Turkey",
    "Flag_of_Scotland": "Scotland",
    "Flag_of_Brazil": "Brazil",
    "Flag_of_Argentina": "Argentina",
    "Flag_of_Mexico": "Mexico",
    "Flag_of_the_United_States": "United States",
    "Flag_of_Japan": "Japan",
    "Flag_of_South_Korea": "South Korea",
    "Flag_of_Saudi_Arabia": "Saudi Arabia",
    "Flag_of_Qatar": "Qatar",
    "Flag_of_the_United_Arab_Emirates": "United Arab Emirates",
    "Flag_of_Australia": "Australia",
    "Flag_of_Canada": "Canada",
    "Flag_of_Russia": "Russia",
    "Flag_of_Ukraine": "Ukraine",
    "Flag_of_Poland": "Poland",
    "Flag_of_Austria": "Austria",
    "Flag_of_Switzerland": "Switzerland",
    "Flag_of_Denmark": "Denmark",
    "Flag_of_Sweden": "Sweden",
    "Flag_of_Norway": "Norway",
    "Flag_of_Greece": "Greece",
    "Flag_of_Croatia": "Croatia",
    "Flag_of_Serbia": "Serbia",
    "Flag_of_Romania": "Romania",
    "Flag_of_Hungary": "Hungary",
    "Flag_of_Colombia": "Colombia",
    "Flag_of_Uruguay": "Uruguay",
    "Flag_of_Chile": "Chile",
    "Flag_of_Ecuador": "Ecuador",
    "Flag_of_Paraguay": "Paraguay",
    "Flag_of_Morocco": "Morocco",
    "Flag_of_Egypt": "Egypt",
    "Flag_of_South_Africa": "South Africa",
    "Flag_of_Nigeria": "Nigeria",
    "Flag_of_Algeria": "Algeria",
    "Flag_of_Tunisia": "Tunisia",
    "Flag_of_Senegal": "Senegal",
    "Flag_of_Ghana": "Ghana",
    "Flag_of_Iran": "Iran",
    "Flag_of_Iraq": "Iraq",
    "Flag_of_China": "China",
    "Flag_of_Thailand": "Thailand",
    "Flag_of_Indonesia": "Indonesia",
    "Flag_of_Israel": "Israel",
    "Flag_of_New_Zealand": "New Zealand",
    "Flag_of_Wales": "Wales",
    "Flag_of_the_Republic_of_Ireland": "Ireland",
    "Flag_of_Finland": "Finland",
    "Flag_of_Iceland": "Iceland",
    "Flag_of_Cyprus": "Cyprus",
    "Flag_of_Bulgaria": "Bulgaria",
    "Flag_of_Slovenia": "Slovenia",
    "Flag_of_Slovakia": "Slovakia",
    "Flag_of_Peru": "Peru",
    "Flag_of_Bolivia": "Bolivia",
    "Flag_of_Venezuela": "Venezuela",
    "Flag_of_Costa_Rica": "Costa Rica",
    "Flag_of_Honduras": "Honduras",
    "Flag_of_Panama": "Panama",
    "Flag_of_Jamaica": "Jamaica",
    "Flag_of_Haiti": "Haiti",
    "Flag_of_Cameroon": "Cameroon",
    "Flag_of_the_Ivory_Coast": "Ivory Coast",
    "Flag_of_the_Democratic_Republic_of_the_Congo": "DR Congo",
    "Flag_of_Mali": "Mali",
    "Flag_of_Cape_Verde": "Cape Verde",
    "Flag_of_Jordan": "Jordan",
    "Flag_of_Uzbekistan": "Uzbekistan",
    "Flag_of_Bosnia_and_Herzegovina": "Bosnia and Herzegovina",
    "Flag_of_Curaçao": "Curaçao",
}


def extract_club_country(cell: Tag) -> str:
    img = cell.find("img")
    if img:
        resource = img.get("resource", "") or img.get("src", "")
        for flag_key, country in FLAG_TO_COUNTRY.items():
            if flag_key in resource:
                return country
    return ""


def extract_club_name(cell: Tag) -> str:
    flagicon = cell.find("span", class_="flagicon")
    links = cell.find_all("a")
    for link in links:
        if flagicon and flagicon in link.parents:
            continue
        if link.find_parent("span", class_="flagicon"):
            continue
        text = link.get_text(strip=True)
        if text:
            return text
    return cell.get_text(strip=True).strip()


def extract_player_wiki_title(cell: Tag) -> str:
    link = cell.find("a")
    if link:
        href = link.get("href", "")
        if "/wiki/" in href:
            return href.split("/wiki/")[-1]
    return ""


SKIP_HEADINGS = {"References", "Notes", "Contents", "See also", "External links"}


def parse_squads(html: str) -> list[dict]:
    soup = BeautifulSoup(html, "lxml")
    teams: list[dict] = []

    for heading in soup.find_all("h3"):
        team_name = heading.get_text(strip=True)
        if not team_name or team_name in SKIP_HEADINGS:
            continue
        if team_name.startswith("Group") or team_name.startswith("["):
            continue

        table = heading.find_next("table", class_="wikitable")
        if not table:
            continue

        rows = table.find_all("tr")
        if len(rows) < 2:
            continue

        headers = [th.get_text(strip=True).lower() for th in rows[0].find_all("th")]
        if "player" not in headers and "name" not in headers:
            continue

        players = []
        skipped_count = 0

        for row in rows[1:]:
            cells = row.find_all(["td", "th"])
            if len(cells) < 5:
                continue

            try:
                number = cells[0].get_text(strip=True)
                pos_text = re.sub(r"\d", "", cells[1].get_text(strip=True))
                position = POSITION_MAP.get(pos_text, pos_text)
                player_cell = cells[2]
                player_name = player_cell.get_text(strip=True).replace("(captain)", "").strip()
                wiki_title = extract_player_wiki_title(player_cell)
                dob_text = cells[3].get_text(strip=True)
                birth_date = parse_date(dob_text)
                caps = int(re.sub(r"\D", "", cells[4].get_text(strip=True)) or "0")
                goals = int(re.sub(r"\D", "", cells[5].get_text(strip=True)) or "0")
                club_cell = cells[6] if len(cells) > 6 else cells[-1]
                club = extract_club_name(club_cell)
                club_country = extract_club_country(club_cell)
            except (IndexError, ValueError) as exc:
                row_text = row.get_text(strip=True)[:80]
                print(f"  WARNING: skipped row for {team_name}: {exc} — {row_text}")
                skipped_count += 1
                continue

            players.append({
                "number": number,
                "name": player_name,
                "position": position,
                "birth_date": birth_date,
                "caps": caps,
                "goals": goals,
                "club": club,
                "club_country": club_country,
                "wiki_title": wiki_title,
            })

        if skipped_count:
            print(f"  WARNING: {skipped_count} row(s) skipped for {team_name}")

        if players:
            teams.append({"team": team_name, "players": players})

    total_players = sum(len(t["players"]) for t in teams)
    if total_players == 0:
        raise RuntimeError(
            "Parsed 0 players from Wikipedia — check page structure at "
            f"{SQUADS_URL}"
        )

    return teams


def run() -> Path:
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    html = fetch_squads_html()

    html_path = RAW_DIR / "wikipedia_squads.html"
    html_path.write_text(html, encoding="utf-8")

    teams = parse_squads(html)
    output_path = RAW_DIR / "squads_raw.json"
    output_path.write_text(json.dumps(teams, indent=2, ensure_ascii=False), encoding="utf-8")

    total_players = sum(len(t["players"]) for t in teams)
    print(f"Extracted {total_players} players across {len(teams)} teams")
    return output_path


if __name__ == "__main__":
    run()
