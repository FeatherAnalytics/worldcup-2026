# Clubs View Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Clubs" view that lets users select a professional club and see which World Cup players belong to it, with arcs from club city to each national team's country.

**Architecture:** Two workstreams — (1) extend Python pipeline to fetch club coordinates from Wikidata and add them to player records, (2) build frontend with grouped tab bar, search combobox, player list, and arc layer. No git operations until all work complete.

**Tech Stack:** Python 3.13+ / httpx / polars (pipeline), Next.js 16 / React 19 / deck.gl 9 / Tailwind 4 / vitest (web)

---

## File Map

### Pipeline (Python)

| File | Action | Responsibility |
|------|--------|---------------|
| `pipeline/src/worldcup/extract/wikidata.py` | Modify | Add `enrich_club_coords()` — search Wikidata for club entities, fetch P625 coordinates, cache results |
| `pipeline/src/worldcup/transform/build_dataset.py` | Modify | Add `club_lat`/`club_lon` to player records; add `club_lat`/`club_lon`/`club_country` to `top_clubs` summary |
| `pipeline/src/worldcup/run_pipeline.py` | Modify | Add Step 2.5 for club coordinate enrichment |
| `pipeline/tests/test_wikidata_clubs.py` | Create | Tests for club coordinate enrichment |

### Web (TypeScript/React)

| File | Action | Responsibility |
|------|--------|---------------|
| `web/src/lib/types.ts` | Modify | Add `club_lat`/`club_lon` to Player, update ClubSummary, add `"clubs"` to ViewMode |
| `web/src/lib/data.ts` | Modify | Add `uniqueClubs()` helper |
| `web/src/components/ViewSwitcher.tsx` | Modify | Grouped tabs: "Players" + "Tournament" |
| `web/src/components/ClubCombobox.tsx` | Create | Search-first combobox for club selection |
| `web/src/components/ClubDetail.tsx` | Create | Player list grouped by national team |
| `web/src/components/ClubLayer.tsx` | Create | deck.gl arc + scatter layers for clubs view |
| `web/src/app/page.tsx` | Modify | Wire up clubs view state, panel, layers, hover |
| `web/tests/lib/data.test.ts` | Create | Tests for `uniqueClubs()` |

---

## Task 1: Pipeline — Club Coordinate Enrichment

**Files:**
- Modify: `pipeline/src/worldcup/extract/wikidata.py`
- Create: `pipeline/tests/test_wikidata_clubs.py`

- [ ] **Step 1: Write test for `enrich_club_coords`**

Create `pipeline/tests/test_wikidata_clubs.py`:

```python
import json
from unittest.mock import MagicMock, patch
from worldcup.extract.wikidata import enrich_club_coords


def test_enrich_club_coords_returns_coords_for_known_club():
    """enrich_club_coords returns lat/lon for clubs found in Wikidata."""
    mock_search_response = {
        "search": [{"id": "Q50602", "label": "Manchester City F.C."}]
    }
    mock_entity_response = {
        "entities": {
            "Q50602": {
                "claims": {
                    "P625": [{
                        "mainsnak": {
                            "datavalue": {
                                "value": {
                                    "latitude": 53.4831,
                                    "longitude": -2.2004,
                                }
                            }
                        }
                    }]
                }
            }
        }
    }

    with patch("worldcup.extract.wikidata._search_club_entity") as mock_search, \
         patch("worldcup.extract.wikidata._fetch_entities") as mock_fetch:
        mock_search.return_value = {"Manchester City": "Q50602"}
        mock_fetch.return_value = mock_entity_response["entities"]

        result = enrich_club_coords(["Manchester City"], cache_path=None)

    assert result["Manchester City"]["club_lat"] == 53.4831
    assert result["Manchester City"]["club_lon"] == -2.2004


def test_enrich_club_coords_returns_none_for_unknown_club():
    """Clubs not found in Wikidata get None coordinates."""
    with patch("worldcup.extract.wikidata._search_club_entity") as mock_search, \
         patch("worldcup.extract.wikidata._fetch_entities") as mock_fetch:
        mock_search.return_value = {}
        mock_fetch.return_value = {}

        result = enrich_club_coords(["Nonexistent FC"], cache_path=None)

    assert result["Nonexistent FC"]["club_lat"] is None
    assert result["Nonexistent FC"]["club_lon"] is None


def test_enrich_club_coords_uses_cache(tmp_path):
    """Cached clubs are not re-fetched."""
    cache_path = tmp_path / "club_cache.json"
    cached = {"PSV Eindhoven": {"club_lat": 51.44, "club_lon": 5.47}}
    cache_path.write_text(json.dumps(cached))

    result = enrich_club_coords(["PSV Eindhoven"], cache_path=cache_path)

    assert result["PSV Eindhoven"]["club_lat"] == 51.44
    assert result["PSV Eindhoven"]["club_lon"] == 5.47
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd pipeline && uv run pytest tests/test_wikidata_clubs.py -v`
Expected: FAIL with `ImportError: cannot import name 'enrich_club_coords'`

- [ ] **Step 3: Implement `enrich_club_coords` in wikidata.py**

Add these functions to `pipeline/src/worldcup/extract/wikidata.py`:

```python
def _search_club_entity(
    client: httpx.Client, club_names: list[str]
) -> dict[str, str]:
    """Search Wikidata for club entities, return {club_name: QID}."""
    results: dict[str, str] = {}
    for name in club_names:
        resp = client.get(WIKIDATA_API, params={
            "action": "wbsearchentities",
            "search": name,
            "language": "en",
            "type": "item",
            "limit": "5",
            "format": "json",
        })
        resp.raise_for_status()
        matches = resp.json().get("search", [])
        for match in matches:
            desc = (match.get("description") or "").lower()
            if any(kw in desc for kw in ("football", "soccer", "association")):
                results[name] = match["id"]
                break
        if name not in results and matches:
            results[name] = matches[0]["id"]
        time.sleep(0.2)
    return results


def enrich_club_coords(
    club_names: list[str],
    cache_path: Path | None = None,
) -> dict[str, dict]:
    """Fetch club coordinates from Wikidata. Returns {club_name: {club_lat, club_lon}}."""
    coord_map: dict[str, dict] = {}

    if cache_path and cache_path.exists():
        cached = json.loads(cache_path.read_text(encoding="utf-8"))
        coord_map = cached
        print(f"  Loaded {len(coord_map)} cached club coordinates")

    remaining = [c for c in club_names if c not in coord_map]
    if not remaining:
        print("  All clubs already cached")
        return coord_map

    print(f"  {len(remaining)} clubs to query...")

    with httpx.Client(
        headers={"User-Agent": USER_AGENT},
        timeout=30,
        verify=truststore.SSLContext(ssl.PROTOCOL_TLS_CLIENT),
    ) as client:
        name_to_qid = _search_club_entity(client, remaining)

        qids = list(set(name_to_qid.values()))
        if qids:
            entities = _fetch_entities(client, qids, "claims")
        else:
            entities = {}

        qid_to_coords: dict[str, tuple[float, float] | None] = {}
        for qid, entity in entities.items():
            claims = entity.get("claims", {})
            qid_to_coords[qid] = _claim_coords(claims)

        for name in remaining:
            qid = name_to_qid.get(name)
            coords = qid_to_coords.get(qid) if qid else None
            if coords:
                coord_map[name] = {"club_lat": coords[1], "club_lon": coords[0]}
            else:
                coord_map[name] = {"club_lat": None, "club_lon": None}
                print(f"    Warning: no coordinates for club '{name}'")

    if cache_path:
        cache_path.write_text(
            json.dumps(coord_map, indent=2, ensure_ascii=False), encoding="utf-8"
        )
        found = sum(1 for v in coord_map.values() if v.get("club_lat") is not None)
        print(f"  Found coordinates for {found}/{len(coord_map)} clubs")

    return coord_map
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd pipeline && uv run pytest tests/test_wikidata_clubs.py -v`
Expected: 3 tests PASS

---

## Task 2: Pipeline — Wire Club Coords into Dataset Build

**Files:**
- Modify: `pipeline/src/worldcup/transform/build_dataset.py`
- Modify: `pipeline/src/worldcup/run_pipeline.py`

- [ ] **Step 1: Update `build_player_records` to include club coordinates**

In `pipeline/src/worldcup/transform/build_dataset.py`, modify `load_raw_data` to also load club coords, and update `build_player_records`:

Change `load_raw_data` signature and body:

```python
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
    club_coords_path = RAW_DIR / "club_coords_cache.json"
    club_coords: dict[str, dict] = {}
    if club_coords_path.exists():
        club_coords = json.loads(club_coords_path.read_text(encoding="utf-8"))

    squads = json.loads(squads_path.read_text(encoding="utf-8"))
    birthplace = json.loads(birthplace_path.read_text(encoding="utf-8"))
    return squads, birthplace, club_coords
```

Update `build_player_records` signature to accept `club_coords_map`:

```python
def build_player_records(
    squads: list[dict], birthplace_map: dict[str, dict], club_coords_map: dict[str, dict]
) -> list[dict]:
```

Add `club_lat`/`club_lon` to each record inside the loop:

```python
            club_coords = club_coords_map.get(player["club"], {})

            records.append({
                # ... existing fields ...
                "club_lat": club_coords.get("club_lat"),
                "club_lon": club_coords.get("club_lon"),
                # ... rest of existing fields ...
            })
```

- [ ] **Step 2: Update `build_summary` to include club coordinates in `top_clubs`**

In `build_summary`, change the clubs aggregation to include `club_country` and first non-null lat/lon:

```python
    clubs = df.filter(pl.col("club") != "").group_by("club").agg(
        pl.len().alias("player_count"),
        pl.col("team_country").n_unique().alias("teams_represented"),
        pl.col("club_country").first().alias("club_country"),
        pl.col("club_lat").drop_nulls().first().alias("club_lat"),
        pl.col("club_lon").drop_nulls().first().alias("club_lon"),
    ).sort("player_count", descending=True).head(50)
```

- [ ] **Step 3: Update `run()` to unpack the new return value**

```python
def run() -> Path:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    squads, birthplace_map, club_coords_map = load_raw_data()
    records = build_player_records(squads, birthplace_map, club_coords_map)
    # ... rest unchanged ...
```

- [ ] **Step 4: Add club enrichment step to `run_pipeline.py`**

In `pipeline/src/worldcup/run_pipeline.py`, add between Step 2 and Step 3:

```python
    print("\n=== Step 2.5: Enrich with Wikidata club coordinates ===")
    squads_path = RAW_DIR / "squads_raw.json"
    teams = json.loads(squads_path.read_text(encoding="utf-8"))
    club_names = list({p["club"] for t in teams for p in t["players"] if p.get("club")})
    print(f"  Found {len(club_names)} unique clubs")
    from worldcup.extract.wikidata import enrich_club_coords
    club_cache_path = RAW_DIR / "club_coords_cache.json"
    club_coords = enrich_club_coords(club_names, cache_path=club_cache_path)
    found = sum(1 for v in club_coords.values() if v.get("club_lat") is not None)
    print(f"  Club coordinate coverage: {found}/{len(club_names)}")
```

- [ ] **Step 5: Run the pipeline to generate updated data**

Run: `cd pipeline && uv run python -m worldcup.run_pipeline`
Expected: Pipeline completes, `data/output/players.json` now has `club_lat`/`club_lon` fields, `data/output/summary.json` top_clubs have coordinates.

- [ ] **Step 6: Verify output data**

Run: `python3 -c "import json; d=json.load(open('data/output/players.json')); p=d[0]; print(p.get('club'), p.get('club_lat'), p.get('club_lon'))"`
Expected: Shows club name with lat/lon values (or null for rare clubs).

---

## Task 3: Frontend — Types and Data Helpers

**Files:**
- Modify: `web/src/lib/types.ts`
- Modify: `web/src/lib/data.ts`
- Create: `web/tests/lib/data.test.ts`

- [ ] **Step 1: Write test for `uniqueClubs`**

Create `web/tests/lib/data.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { uniqueClubs } from "@/lib/data";
import type { Player } from "@/lib/types";

const makePlayer = (overrides: Partial<Player>): Player => ({
  name: "Test",
  team_country: "England",
  team_confederation: "UEFA",
  position: "Forward",
  club: "Test FC",
  club_country: "England",
  birth_date: "2000-01-01",
  birth_city: "London",
  birth_country: "England",
  birth_lat: 51.5,
  birth_lon: -0.1,
  club_lat: null,
  club_lon: null,
  caps: 10,
  goals: 5,
  is_foreign_born: false,
  birth_country_known: true,
  ...overrides,
});

describe("uniqueClubs", () => {
  it("groups players by club and counts teams", () => {
    const players = [
      makePlayer({ name: "A", club: "Man City", team_country: "England" }),
      makePlayer({ name: "B", club: "Man City", team_country: "Belgium" }),
      makePlayer({ name: "C", club: "Arsenal", team_country: "England" }),
    ];
    const result = uniqueClubs(players);
    expect(result[0]).toEqual({ club: "Man City", count: 2, teams: 2 });
    expect(result[1]).toEqual({ club: "Arsenal", count: 1, teams: 1 });
  });

  it("sorts by player count descending", () => {
    const players = [
      makePlayer({ club: "Small FC" }),
      makePlayer({ club: "Big FC" }),
      makePlayer({ club: "Big FC" }),
      makePlayer({ club: "Big FC" }),
    ];
    const result = uniqueClubs(players);
    expect(result[0].club).toBe("Big FC");
    expect(result[1].club).toBe("Small FC");
  });

  it("excludes empty club names", () => {
    const players = [
      makePlayer({ club: "" }),
      makePlayer({ club: "Real FC" }),
    ];
    const result = uniqueClubs(players);
    expect(result).toHaveLength(1);
    expect(result[0].club).toBe("Real FC");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd web && npx vitest run tests/lib/data.test.ts`
Expected: FAIL — `uniqueClubs` not exported, `club_lat`/`club_lon` not on Player type

- [ ] **Step 3: Update types**

In `web/src/lib/types.ts`:

Add to `Player` interface after `club_country`:
```typescript
  club_lat: number | null;
  club_lon: number | null;
```

Add to `ClubSummary` interface:
```typescript
  club_country: string;
  club_lat: number | null;
  club_lon: number | null;
```

Change `ViewMode`:
```typescript
export type ViewMode = "diaspora" | "squad" | "factories" | "bracket" | "clubs";
```

- [ ] **Step 4: Add `uniqueClubs` to data.ts**

In `web/src/lib/data.ts`, add:

```typescript
export function uniqueClubs(
  players: Player[]
): { club: string; count: number; teams: number }[] {
  const map = new Map<string, { count: number; teams: Set<string> }>();
  for (const p of players) {
    if (!p.club) continue;
    const entry = map.get(p.club) ?? { count: 0, teams: new Set<string>() };
    entry.count++;
    entry.teams.add(p.team_country);
    map.set(p.club, entry);
  }
  return [...map.entries()]
    .map(([club, { count, teams }]) => ({ club, count, teams: teams.size }))
    .sort((a, b) => b.count - a.count);
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd web && npx vitest run tests/lib/data.test.ts`
Expected: 3 tests PASS

---

## Task 4: Frontend — Grouped ViewSwitcher

**Files:**
- Modify: `web/src/components/ViewSwitcher.tsx`

- [ ] **Step 1: Replace flat tab list with grouped layout**

Replace the entire contents of `web/src/components/ViewSwitcher.tsx`:

```tsx
import type { ViewMode } from "@/lib/types";

const GROUPS: { label: string; tabs: { key: ViewMode; label: string }[] }[] = [
  {
    label: "Players",
    tabs: [
      { key: "diaspora", label: "Diaspora" },
      { key: "squad", label: "Squads" },
      { key: "clubs", label: "Clubs" },
    ],
  },
  {
    label: "Tournament",
    tabs: [
      { key: "factories", label: "Origins" },
      { key: "bracket", label: "Bracket" },
    ],
  },
];

interface ViewSwitcherProps {
  active: ViewMode;
  onChange: (view: ViewMode) => void;
}

export function ViewSwitcher({ active, onChange }: ViewSwitcherProps) {
  return (
    <div className="flex flex-col gap-2.5">
      {GROUPS.map((group) => (
        <div key={group.label}>
          <div className="mb-1.5 text-[9px] font-bold uppercase tracking-[1.5px] text-stone-400">
            {group.label}
          </div>
          <div className="flex gap-0.5 rounded-[10px] bg-stone-100 p-[3px]">
            {group.tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => onChange(tab.key)}
                className={`flex-1 rounded-lg px-3 py-2 text-center text-xs font-medium transition-all ${
                  active === tab.key
                    ? "bg-white font-semibold text-stone-900 shadow-sm"
                    : "text-stone-500 hover:text-stone-700"
                }`}
                aria-pressed={active === tab.key}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `cd web && npx next build`
Expected: Build succeeds (may warn about unused "clubs" view — that's expected until page.tsx is updated)

---

## Task 5: Frontend — ClubCombobox Component

**Files:**
- Create: `web/src/components/ClubCombobox.tsx`

- [ ] **Step 1: Create ClubCombobox**

Create `web/src/components/ClubCombobox.tsx`:

```tsx
import { useMemo, useRef, useState } from "react";

interface ClubInfo {
  club: string;
  count: number;
  teams: number;
}

interface ClubComboboxProps {
  clubs: ClubInfo[];
  selected: string;
  onChange: (club: string) => void;
}

export function ClubCombobox({ clubs, selected, onChange }: ClubComboboxProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    if (!query) return clubs.slice(0, 10);
    const q = query.toLowerCase();
    return clubs.filter((c) => c.club.toLowerCase().includes(q)).slice(0, 20);
  }, [clubs, query]);

  if (selected) {
    const info = clubs.find((c) => c.club === selected);
    return (
      <div>
        <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-stone-400">
          Club
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-stone-200 bg-stone-50 px-3 py-2">
          <span className="flex-1 text-[13px] text-stone-700">{selected}</span>
          {info && (
            <span className="rounded-full bg-stone-200 px-2 py-0.5 text-[10px] text-stone-500">
              {info.count}
            </span>
          )}
          <button
            onClick={() => { onChange(""); setQuery(""); }}
            className="text-stone-400 hover:text-stone-600"
            aria-label="Clear club selection"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-stone-400">
        Club
      </div>
      <div className={`flex items-center gap-2 rounded-lg border bg-stone-50 px-3 py-2 transition-colors ${open ? "border-[#4A7FB5] ring-1 ring-[#4A7FB5]/10" : "border-stone-200"}`}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a8a29e" strokeWidth="2" strokeLinecap="round">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Search clubs..."
          className="flex-1 bg-transparent text-[13px] text-stone-700 outline-none placeholder:text-stone-400"
        />
      </div>
      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-60 overflow-y-auto rounded-lg border border-stone-200 bg-white shadow-lg">
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-[12px] text-stone-400">No clubs found</div>
          ) : (
            filtered.map((c) => (
              <button
                key={c.club}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => { onChange(c.club); setQuery(""); setOpen(false); }}
                className="flex w-full items-center justify-between px-3 py-2 text-left text-[13px] text-stone-700 hover:bg-stone-50"
              >
                <span>{c.club}</span>
                <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] text-stone-500">
                  {c.count} players
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
```

---

## Task 6: Frontend — ClubDetail Component

**Files:**
- Create: `web/src/components/ClubDetail.tsx`

- [ ] **Step 1: Create ClubDetail**

Create `web/src/components/ClubDetail.tsx`:

```tsx
import type { Player } from "@/lib/types";

const POSITION_ORDER: Record<string, number> = {
  Goalkeeper: 0,
  Defender: 1,
  Midfielder: 2,
  Forward: 3,
};

const POSITION_ABBR: Record<string, string> = {
  Goalkeeper: "GK",
  Defender: "DEF",
  Midfielder: "MID",
  Forward: "FWD",
};

interface ClubDetailProps {
  club: string;
  players: Player[];
}

export function ClubDetail({ club, players }: ClubDetailProps) {
  const teams = new Set(players.map((p) => p.team_country));

  const grouped = new Map<string, Player[]>();
  for (const p of players) {
    const list = grouped.get(p.team_country) ?? [];
    list.push(p);
    grouped.set(p.team_country, list);
  }
  for (const list of grouped.values()) {
    list.sort((a, b) => (POSITION_ORDER[a.position] ?? 9) - (POSITION_ORDER[b.position] ?? 9));
  }
  const sortedTeams = [...grouped.entries()].sort((a, b) => a[0].localeCompare(b[0]));

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-r-lg border-l-[3px] border-[#4A7FB5] bg-stone-50 px-3.5 py-3">
        <p className="font-display text-sm italic text-stone-600 leading-relaxed">
          <span className="not-italic font-bold text-stone-900">{club}</span> sends{" "}
          <span className="not-italic font-bold text-stone-900">{players.length}</span>{" "}
          {players.length === 1 ? "player" : "players"} to{" "}
          <span className="not-italic font-bold text-stone-900">{teams.size}</span>{" "}
          {teams.size === 1 ? "national team" : "national teams"}
        </p>
      </div>

      <div>
        <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-stone-400">
          Players by National Team
        </div>
        <div className="flex flex-col gap-3">
          {sortedTeams.map(([team, teamPlayers]) => (
            <div key={team}>
              <div className="mb-1 flex items-center gap-1.5 text-[12px] font-semibold text-stone-900">
                {team}
                <span className="text-[10px] font-normal text-stone-400">
                  ({teamPlayers.length})
                </span>
              </div>
              <div className="flex flex-col gap-0.5 pl-1">
                {teamPlayers.map((p) => (
                  <div
                    key={p.name}
                    className="flex items-center justify-between py-0.5 text-[11px]"
                  >
                    <span className="text-stone-600">{p.name}</span>
                    <span className="text-[10px] text-stone-400">
                      {POSITION_ABBR[p.position] ?? p.position}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

---

## Task 7: Frontend — ClubLayer (deck.gl)

**Files:**
- Create: `web/src/components/ClubLayer.tsx`

- [ ] **Step 1: Create ClubLayer**

Create `web/src/components/ClubLayer.tsx`:

```tsx
import { ArcLayer, ScatterplotLayer } from "deck.gl";
import type { Layer } from "deck.gl";
import type { Player } from "@/lib/types";
import { confederationColor } from "@/lib/colors";

interface ClubArcData {
  teamCountry: string;
  confederation: string;
  playerCount: number;
  sourcePosition: [number, number];
  targetPosition: [number, number];
}

export function createClubLayers(
  players: Player[],
  centroids: Map<string, { lon: number; lat: number }>
): Layer[] {
  if (players.length === 0) return [];

  const firstWithCoords = players.find((p) => p.club_lat != null && p.club_lon != null);
  let clubPosition: [number, number];

  if (firstWithCoords) {
    clubPosition = [firstWithCoords.club_lon!, firstWithCoords.club_lat!];
  } else {
    const clubCountry = players[0].club_country;
    const centroid = centroids.get(clubCountry);
    if (!centroid) return [];
    clubPosition = [centroid.lon, centroid.lat];
  }

  const teamMap = new Map<string, { count: number; confederation: string }>();
  for (const p of players) {
    const entry = teamMap.get(p.team_country) ?? { count: 0, confederation: p.team_confederation };
    entry.count++;
    teamMap.set(p.team_country, entry);
  }

  const arcData: ClubArcData[] = [];
  for (const [team, { count, confederation }] of teamMap) {
    const target = centroids.get(team);
    if (!target) continue;
    arcData.push({
      teamCountry: team,
      confederation,
      playerCount: count,
      sourcePosition: clubPosition,
      targetPosition: [target.lon, target.lat],
    });
  }

  const arcs = new ArcLayer<ClubArcData>({
    id: "club-arcs",
    data: arcData,
    getSourcePosition: (d) => d.sourcePosition,
    getTargetPosition: (d) => d.targetPosition,
    getSourceColor: [74, 127, 181, 200],
    getTargetColor: (d) => [...confederationColor(d.confederation), 200] as [number, number, number, number],
    getWidth: (d) => Math.min(1 + d.playerCount, 4),
    getHeight: 0.5,
    greatCircle: true,
    pickable: true,
    autoHighlight: true,
    highlightColor: [255, 255, 255, 100],
  });

  const clubDot = new ScatterplotLayer({
    id: "club-source-dot",
    data: [{ position: clubPosition }],
    getPosition: (d) => d.position,
    getFillColor: [74, 127, 181, 255],
    getRadius: 8,
    radiusUnits: "pixels" as const,
    stroked: true,
    getLineColor: [255, 255, 255, 220],
    getLineWidth: 2,
    lineWidthUnits: "pixels" as const,
    pickable: false,
  });

  const destDots = new ScatterplotLayer<ClubArcData>({
    id: "club-dest-dots",
    data: arcData,
    getPosition: (d) => d.targetPosition,
    getFillColor: (d) => [...confederationColor(d.confederation), 240] as [number, number, number, number],
    getRadius: 5,
    radiusUnits: "pixels" as const,
    stroked: true,
    getLineColor: [255, 255, 255, 200],
    getLineWidth: 1,
    lineWidthUnits: "pixels" as const,
    pickable: false,
  });

  return [arcs, clubDot, destDots];
}
```

---

## Task 8: Frontend — Page Integration

**Files:**
- Modify: `web/src/app/page.tsx`

- [ ] **Step 1: Add imports**

Add to the imports at the top of `web/src/app/page.tsx`:

```typescript
import { ClubCombobox } from "@/components/ClubCombobox";
import { ClubDetail } from "@/components/ClubDetail";
import { createClubLayers } from "@/components/ClubLayer";
```

Update the data import to include `uniqueClubs`:

```typescript
import {
  loadPlayers,
  loadSummary,
  loadMatches,
  uniqueTeams,
  uniqueConfederations,
  uniqueBirthCountries,
  uniqueClubs,
} from "@/lib/data";
```

- [ ] **Step 2: Add clubs state**

Add after the bracket state block (`const [bracketTeam, setBracketTeam] = ...`):

```typescript
  /* Clubs state */
  const [filterClub, setFilterClub] = useState("");
```

- [ ] **Step 3: Add derived data**

Add after `allBirthCountries` memo:

```typescript
  const allClubs = useMemo(() => uniqueClubs(players), [players]);

  const clubPlayers = useMemo(
    () => filterClub ? players.filter((p) => p.club === filterClub) : [],
    [players, filterClub]
  );
```

- [ ] **Step 4: Reset club filter on view change**

In `handleViewChange`, add `setFilterClub("")` alongside the other resets:

```typescript
  const handleViewChange = useCallback(
    (v: ViewMode) => {
      setActiveView(v);
      setTooltip(null);
      setSelectedPlayer(null);
      setSelectedCountry(null);
      setBracketTeam(null);
      setFilterClub("");
      if (v === "squad" && selectedTeam === "" && allTeams.length > 0) {
        setSelectedTeam(allTeams[0]);
      }
    },
    [selectedTeam, allTeams]
  );
```

- [ ] **Step 5: Add clubs case to layers memo**

In the `layers` useMemo, add before the `return []` fallback:

```typescript
    if (activeView === "clubs" && clubPlayers.length > 0 && centroids.size > 0) {
      return createClubLayers(clubPlayers, centroids);
    }
```

Add `clubPlayers` to the dependency array.

- [ ] **Step 6: Add clubs case to hover handler**

In `handleHover`, add a new `else if` block after the factories case:

```typescript
      } else if (activeView === "clubs") {
        const arc = info.object as { teamCountry?: string; playerCount?: number };
        if (arc.teamCountry) {
          const teamPlayers = clubPlayers.filter((p) => p.team_country === arc.teamCountry);
          setTooltip({
            x: info.x,
            y: info.y,
            content: (
              <div>
                <p className="font-medium">{arc.teamCountry}</p>
                <p className="text-stone-500">{arc.playerCount} {arc.playerCount === 1 ? "player" : "players"}</p>
                <p className="text-xs text-stone-400">{teamPlayers.map((p) => p.name).join(", ")}</p>
              </div>
            ),
          });
        } else {
          setTooltip(null);
        }
```

Add `clubPlayers` to the `handleHover` dependency array.

- [ ] **Step 7: Add clubs case to PanelContent**

In `PanelContent`, add before the `return null` fallback:

```typescript
    if (activeView === "clubs") {
      return (
        <div className="flex flex-col gap-4">
          <ClubCombobox clubs={allClubs} selected={filterClub} onChange={setFilterClub} />
          {filterClub && clubPlayers.length > 0 && (
            <ClubDetail club={filterClub} players={clubPlayers} />
          )}
          {!filterClub && (
            <div className="rounded-r-lg border-l-[3px] border-[#4A7FB5] bg-stone-50 px-3.5 py-3">
              <p className="font-display text-sm italic text-stone-600 leading-relaxed">
                Search for a club to see which national teams its players represent.
              </p>
            </div>
          )}
        </div>
      );
    }
```

- [ ] **Step 8: Build and verify**

Run: `cd web && npx next build`
Expected: Build succeeds with no type errors.

---

## Task 9: Copy Updated Data to Web Public Dir

**Files:**
- Copy: `data/output/players.json` → `web/public/data/players.json`
- Copy: `data/output/summary.json` → `web/public/data/summary.json`

- [ ] **Step 1: Copy updated data files**

```bash
cp data/output/players.json web/public/data/players.json
cp data/output/summary.json web/public/data/summary.json
```

- [ ] **Step 2: Start dev server and verify**

Run: `cd web && npm run dev`
Open browser to localhost:3000. Switch to "Clubs" tab, search for "Manchester City", verify arcs appear on map and player list shows in panel.

---

## Task 10: Visual QA with Chrome DevTools

- [ ] **Step 1: Open app in browser**

Navigate to the running dev server URL.

- [ ] **Step 2: Test grouped tab bar**

Verify "Players" group shows Diaspora/Squads/Clubs tabs, "Tournament" group shows Origins/Bracket tabs. Click each tab to confirm view switching works.

- [ ] **Step 3: Test club search**

Click "Clubs" tab. Verify search combobox shows top 10 clubs. Type "Bar" — verify "Barcelona" appears. Select it — verify arcs and player list render.

- [ ] **Step 4: Test clear and re-select**

Click ✕ to clear selection. Verify combobox returns to search state. Select "Manchester City" — verify 19 players shown.

- [ ] **Step 5: Test hover tooltips**

Hover over arcs on the map. Verify tooltip shows national team name, player count, and player names.

- [ ] **Step 6: Test mobile bottom sheet**

Resize browser to mobile width. Verify grouped tabs and club combobox work in bottom sheet.
