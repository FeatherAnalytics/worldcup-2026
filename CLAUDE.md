# World Cup 2026 — Project Rules

## Overview

2026 FIFA World Cup player data visualization: Python ETL pipeline + web frontend.
Shows player birthplaces vs teams represented, with multiple data slicing dimensions.

## Tech Stack

- **Pipeline:** Python 3.13+, uv, polars, httpx, beautifulsoup4
- **Web:** TBD (Next.js + deck.gl planned, inspired by urbanstack)
- **Data:** Wikipedia scrape → Wikidata enrichment → JSON/CSV output

## Data Pipeline

- Extract: `pipeline/src/worldcup/extract/` (wikipedia.py, wikidata.py)
- Contracts: `pipeline/src/worldcup/contracts/` (pydantic models)
- Transform: `pipeline/src/worldcup/transform/` (build_dataset.py)
- Output: `data/output/` (players.json, players.csv, summary.json)
- Run full pipeline: `cd pipeline && uv run python -m worldcup.run_pipeline`

## Git

- Use `/ship-it` skill for all git operations (FeatherAnalytics account)
- Conventional commits: `feat:`, `fix:`, `data:`, `docs:`, `refactor:`
- Feature branches — no direct commits to main
- Data output files are tracked (private repo)

## Learnings

### Wikidata: prefer REST API over SPARQL for entity lookups
Wikidata SPARQL endpoint rate-limits aggressively (429 after one batch of 50). The
`wbgetentities` REST API has no such limit and is faster for batch entity lookups.
Use SPARQL only for complex graph queries that can't be expressed as entity lookups.
<sub>added 2026-07-06 · source: initial data pipeline build</sub>

### Python 3.14 strict SSL requires `truststore`
Python 3.14 enforces RFC 5280 CA Basic Constraints strictly — many sites' cert chains
fail with `CERTIFICATE_VERIFY_FAILED`. Fix: add `truststore` to deps, use
`truststore.SSLContext(ssl.PROTOCOL_TLS_CLIENT)` as `verify=` param in httpx. Delegates
to OS cert store (macOS Keychain) which is more permissive.
<sub>added 2026-07-06 · source: initial data pipeline build</sub>

### Wikipedia removed `mw-headline` spans from headings
As of mid-2026, Wikipedia no longer wraps heading text in `<span class="mw-headline">`.
The `id` attribute now lives directly on the `<h2>`/`<h3>` tag. Any scraper looking for
`soup.find('span', class_='mw-headline')` will find zero results.
<sub>added 2026-07-06 · source: initial data pipeline build</sub>
