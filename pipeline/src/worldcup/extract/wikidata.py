"""Enrich player data with birthplace via Wikipedia API (not SPARQL)."""

import json
import ssl
import time
import urllib.parse
from pathlib import Path

import httpx
import truststore

from worldcup.config import RAW_DIR

WIKI_API = "https://en.wikipedia.org/w/api.php"
WIKIDATA_API = "https://www.wikidata.org/w/api.php"
USER_AGENT = "WorldCup2026DataPipeline/0.1 (https://github.com/featheranalytics)"
BATCH_SIZE = 50


def fetch_wikidata_ids(client: httpx.Client, titles: list[str]) -> dict[str, str]:
    """Map Wikipedia article titles to Wikidata QIDs."""
    title_str = "|".join(titles)
    resp = client.get(WIKI_API, params={
        "action": "query",
        "titles": title_str,
        "prop": "pageprops",
        "ppprop": "wikibase_item",
        "format": "json",
        "redirects": "1",
    })
    resp.raise_for_status()
    data = resp.json()

    title_to_qid: dict[str, str] = {}
    pages = data.get("query", {}).get("pages", {})

    redirects = {}
    for r in data.get("query", {}).get("redirects", []):
        redirects[r["to"]] = r["from"]

    normalized = {}
    for n in data.get("query", {}).get("normalized", []):
        normalized[n["to"]] = n["from"]

    for page in pages.values():
        page_title = page.get("title", "")
        qid = page.get("pageprops", {}).get("wikibase_item", "")
        if qid:
            original = redirects.get(page_title, page_title)
            original = normalized.get(original, original)
            title_to_qid[original] = qid

    return title_to_qid


def _claim_entity_id(claims: dict, prop: str) -> str:
    """Extract the entity ID from the first claim of a property."""
    entries = claims.get(prop, [])
    if not entries:
        return ""
    return entries[0].get("mainsnak", {}).get("datavalue", {}).get("value", {}).get("id", "")


def _claim_coords(claims: dict) -> tuple[float, float] | None:
    """Extract (lon, lat) from P625 coordinate claim."""
    entries = claims.get("P625", [])
    if not entries:
        return None
    val = entries[0].get("mainsnak", {}).get("datavalue", {}).get("value", {})
    if not val:
        return None
    return (val.get("longitude", 0), val.get("latitude", 0))


def _fetch_entities(
    client: httpx.Client, ids: list[str], props: str, languages: str = ""
) -> dict:
    """Fetch Wikidata entities in batches of 50."""
    all_entities: dict = {}
    for i in range(0, len(ids), 50):
        batch = ids[i : i + 50]
        params: dict = {
            "action": "wbgetentities",
            "ids": "|".join(batch),
            "props": props,
            "format": "json",
        }
        if languages:
            params["languages"] = languages
        resp = client.get(WIKIDATA_API, params=params)
        resp.raise_for_status()
        all_entities.update(resp.json().get("entities", {}))
        if i + 50 < len(ids):
            time.sleep(0.5)
    return all_entities


def fetch_birthplace_from_wikidata(
    client: httpx.Client, qids: list[str]
) -> dict[str, dict]:
    """Fetch birthplace data from Wikidata API for given QIDs."""
    entities = _fetch_entities(client, qids, "claims")

    results: dict[str, dict] = {}
    qid_to_place_id: dict[str, str] = {}

    for qid, entity in entities.items():
        claims = entity.get("claims", {})
        place_id = _claim_entity_id(claims, "P19")
        if place_id:
            qid_to_place_id[qid] = place_id
        results[qid] = {
            "coords": _claim_coords(claims),
            "place_id": place_id or None,
        }

    unique_place_ids = list(set(qid_to_place_id.values()))
    if not unique_place_ids:
        return results

    # Single fetch for place labels, coords, and country IDs
    place_entities = _fetch_entities(client, unique_place_ids, "labels|claims", languages="en")

    # Collect country entity IDs we need to resolve
    place_to_country_id: dict[str, str] = {}
    place_labels: dict[str, str] = {}
    place_coords: dict[str, tuple[float, float]] = {}

    for place_id, entity in place_entities.items():
        place_labels[place_id] = entity.get("labels", {}).get("en", {}).get("value", "")
        claims = entity.get("claims", {})
        country_id = _claim_entity_id(claims, "P17")
        if country_id:
            place_to_country_id[place_id] = country_id
        coords = _claim_coords(claims)
        if coords:
            place_coords[place_id] = coords

    # Resolve country IDs to labels
    country_labels: dict[str, str] = {}
    unique_country_ids = list(set(place_to_country_id.values()))
    if unique_country_ids:
        country_entities = _fetch_entities(client, unique_country_ids, "labels", languages="en")
        for cid, entity in country_entities.items():
            country_labels[cid] = entity.get("labels", {}).get("en", {}).get("value", "")

    # Assemble results
    for qid, info in results.items():
        place_id = info.get("place_id")
        if not place_id:
            continue
        results[qid]["birth_city"] = place_labels.get(place_id, "")
        country_id = place_to_country_id.get(place_id)
        results[qid]["birth_country"] = country_labels.get(country_id, "") if country_id else ""
        pc = place_coords.get(place_id)
        if pc:
            results[qid]["birth_lat"] = pc[1]
            results[qid]["birth_lon"] = pc[0]
        elif info.get("coords"):
            results[qid]["birth_lat"] = info["coords"][1]
            results[qid]["birth_lon"] = info["coords"][0]

    return results


def enrich_birthplace(wiki_titles: list[str]) -> dict[str, dict]:
    birthplace_map: dict[str, dict] = {}
    cache_path = RAW_DIR / "birthplace_cache.json"

    if cache_path.exists():
        cached = json.loads(cache_path.read_text(encoding="utf-8"))
        if cached:
            birthplace_map = cached
            print(f"  Loaded {len(birthplace_map)} cached results")

    remaining = [t for t in wiki_titles if t not in birthplace_map]
    if not remaining:
        print("  All players already cached")
        return birthplace_map

    batches = [remaining[i : i + BATCH_SIZE] for i in range(0, len(remaining), BATCH_SIZE)]
    print(f"  {len(remaining)} players to query in {len(batches)} batches...")

    with httpx.Client(
        headers={"User-Agent": USER_AGENT},
        timeout=30,
        verify=truststore.SSLContext(ssl.PROTOCOL_TLS_CLIENT),
    ) as client:
        for i, batch in enumerate(batches):
            print(f"  Batch {i + 1}/{len(batches)} ({len(batch)} players)...", flush=True)

            title_to_qid = fetch_wikidata_ids(client, [t.replace("_", " ") for t in batch])

            qid_to_title = {}
            for title in batch:
                clean = title.replace("_", " ")
                qid = title_to_qid.get(clean)
                if qid:
                    qid_to_title[qid] = title

            if not qid_to_title:
                print(f"    No QIDs found for this batch")
                continue

            qids = list(qid_to_title.keys())
            birthplace_data = fetch_birthplace_from_wikidata(client, qids)

            for qid, data in birthplace_data.items():
                title = qid_to_title.get(qid, "")
                if title:
                    birthplace_map[title] = {
                        "birth_city": data.get("birth_city", ""),
                        "birth_country": data.get("birth_country", ""),
                        "birth_lat": data.get("birth_lat"),
                        "birth_lon": data.get("birth_lon"),
                    }

            cache_path.write_text(
                json.dumps(birthplace_map, indent=2, ensure_ascii=False), encoding="utf-8"
            )
            matched = sum(1 for v in birthplace_map.values() if v.get("birth_country"))
            print(f"    Progress: {matched} with birthplace data", flush=True)

            if i < len(batches) - 1:
                time.sleep(1)

    return birthplace_map


def _search_club_entity(
    client: httpx.Client, club_names: list[str]
) -> dict[str, str]:
    """Search Wikidata for each club name, return {club_name: QID} for football clubs."""
    FOOTBALL_KEYWORDS = {"football", "soccer", "association football", "football club", "soccer club"}
    club_to_qid: dict[str, str] = {}

    for name in club_names:
        found = False
        search_terms = [name, f"{name} football club", f"{name} FC"]
        for term in search_terms:
            if found:
                break
            try:
                resp = client.get(WIKIDATA_API, params={
                    "action": "wbsearchentities",
                    "search": term,
                    "language": "en",
                    "type": "item",
                    "limit": "5",
                    "format": "json",
                })
                resp.raise_for_status()
                results = resp.json().get("search", [])

                for result in results:
                    desc = result.get("description", "").lower()
                    if any(kw in desc for kw in FOOTBALL_KEYWORDS):
                        club_to_qid[name] = result["id"]
                        found = True
                        break
            except httpx.HTTPError:
                pass
            time.sleep(0.15)

        if not found:
            print(f"  Warning: no Wikidata match for club '{name}'")

    return club_to_qid


def _resolve_club_coords(
    client: httpx.Client, entities: dict
) -> dict[str, tuple[float, float]]:
    """Extract coordinates from club entities, falling back to home venue (P115) or HQ (P159)."""
    qid_to_coords: dict[str, tuple[float, float]] = {}
    venue_qids: dict[str, list[str]] = {}

    for qid, entity in entities.items():
        claims = entity.get("claims", {})
        coords = _claim_coords(claims)
        if coords:
            qid_to_coords[qid] = coords
            continue
        venue_id = _claim_entity_id(claims, "P115")
        if not venue_id:
            venue_id = _claim_entity_id(claims, "P159")
        if venue_id:
            venue_qids.setdefault(venue_id, []).append(qid)

    if venue_qids:
        venue_entities = _fetch_entities(client, list(venue_qids.keys()), "claims")
        for venue_qid, venue_entity in venue_entities.items():
            coords = _claim_coords(venue_entity.get("claims", {}))
            if coords:
                for club_qid in venue_qids.get(venue_qid, []):
                    if club_qid not in qid_to_coords:
                        qid_to_coords[club_qid] = coords

    return qid_to_coords


def enrich_club_coords(
    club_names: list[str], cache_path: Path | None = None
) -> dict[str, dict]:
    """Enrich club names with Wikidata coordinates.

    Returns {club_name: {"club_lat": float|None, "club_lon": float|None}}.
    Loads/saves cache at *cache_path* (defaults to RAW_DIR / "club_coords_cache.json").
    """
    if cache_path is None:
        cache_path = RAW_DIR / "club_coords_cache.json"

    club_map: dict[str, dict] = {}
    if cache_path.exists():
        cached = json.loads(cache_path.read_text(encoding="utf-8"))
        if cached:
            club_map = cached
            print(f"  Loaded {len(club_map)} cached club coordinates")

    remaining = [n for n in club_names if n not in club_map]
    if not remaining:
        print("  All clubs already cached")
        return club_map

    print(f"  {len(remaining)} clubs to query...")

    with httpx.Client(
        headers={"User-Agent": USER_AGENT},
        timeout=30,
        verify=truststore.SSLContext(ssl.PROTOCOL_TLS_CLIENT),
    ) as client:
        club_to_qid = _search_club_entity(client, remaining)
        print(f"  Found QIDs for {len(club_to_qid)}/{len(remaining)} clubs")

        if club_to_qid:
            qids = list(set(club_to_qid.values()))
            entities = _fetch_entities(client, qids, "claims")
            qid_to_coords = _resolve_club_coords(client, entities)

            qid_to_name = {qid: name for name, qid in club_to_qid.items()}
            for name, qid in club_to_qid.items():
                coords = qid_to_coords.get(qid)
                if coords:
                    club_map[name] = {"club_lat": coords[1], "club_lon": coords[0]}
                else:
                    club_map[name] = {"club_lat": None, "club_lon": None}

        for name in remaining:
            if name not in club_map:
                club_map[name] = {"club_lat": None, "club_lon": None}

    cache_path.write_text(
        json.dumps(club_map, indent=2, ensure_ascii=False), encoding="utf-8"
    )
    matched = sum(1 for v in club_map.values() if v.get("club_lat") is not None)
    print(f"  {matched}/{len(club_map)} clubs with coordinates")

    return club_map


def run() -> Path:
    squads_path = RAW_DIR / "squads_raw.json"
    if not squads_path.exists():
        raise FileNotFoundError(f"Run wikipedia extract first: {squads_path}")

    teams = json.loads(squads_path.read_text(encoding="utf-8"))
    wiki_titles = []
    for team in teams:
        for player in team["players"]:
            if player.get("wiki_title"):
                wiki_titles.append(urllib.parse.unquote(player["wiki_title"]))

    print(f"Enriching {len(wiki_titles)} players with birthplace data...", flush=True)
    birthplace_map = enrich_birthplace(wiki_titles)

    output_path = RAW_DIR / "birthplace_raw.json"
    output_path.write_text(
        json.dumps(birthplace_map, indent=2, ensure_ascii=False), encoding="utf-8"
    )

    matched = sum(1 for v in birthplace_map.values() if v.get("birth_country"))
    print(f"Found birthplace data for {matched}/{len(wiki_titles)} players")
    return output_path


if __name__ == "__main__":
    run()
