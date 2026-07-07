# Clubs View — Design Spec

A dedicated view for exploring World Cup players by professional club. Shows which
national teams a club's players represent, with arc visualization from club city to
team countries.

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| View placement | New "Clubs" tab in a 5th view | Dedicated space, not crammed into existing filters |
| Tab bar clutter | Grouped tabs: "Players" + "Tournament" | Scales to 5 tabs without feeling crowded |
| Map visualization | Arcs from club city → national team centroids | Tells the "one club, many flags" story |
| Club selector | Search-first combobox with type-ahead | Handles 451 clubs; defaults show top clubs by player count |
| Club coordinates | Wikidata pipeline enrichment | Precise city-level arcs, fits existing pipeline pattern |
| Player list format | Grouped by national team with position | Reinforces the cross-national angle |

## Architecture

### Data Pipeline Changes

Extend `pipeline/src/worldcup/extract/wikidata.py` to fetch club coordinates:

1. Collect unique club names from scraped squad data
2. Search Wikidata for each club entity (Q-ID) via `wbsearchentities`
3. Fetch coordinate location (P625) from club entity via `wbgetentities`
4. Store as `club_lat`, `club_lon` on each player record
5. Cache results in `data/raw/club_coords_cache.json` (same pattern as birthplace cache)

Fallback: if a club has no Wikidata coordinates, use `club_country` centroid from
the existing geojson. Pipeline logs a warning for missing clubs.

**Output changes:**
- `players.json` gains `club_lat` and `club_lon` fields (nullable)
- `summary.json` `top_clubs` entries gain `club_lat`, `club_lon`, `club_country`

### Web Frontend Changes

#### Types (`web/src/lib/types.ts`)

- Add `club_lat` and `club_lon` (nullable) to `Player` interface
- Add `club_lat`, `club_lon`, `club_country` to `ClubSummary` interface
- Add `"clubs"` to `ViewMode` union type

#### Data helpers (`web/src/lib/data.ts`)

- Add `uniqueClubs(players: Player[]): { club: string; count: number; teams: number }[]`
  sorted by player count descending

#### ViewSwitcher (`web/src/components/ViewSwitcher.tsx`)

Replace flat tab list with grouped layout:

```
Players:  [Diaspora] [Squads] [Clubs]
Tournament: [Origins] [Bracket]
```

Two `GROUPS` arrays, each rendered as its own pill bar with a small uppercase label above.

#### ClubCombobox (`web/src/components/ClubCombobox.tsx`) — new

Search-first combobox component:

- Text input with search icon, clear button
- Filters club list on keystroke (case-insensitive substring match)
- Each option shows club name + player count badge
- Default state (empty query): shows top 10 clubs by player count
- Selected state: shows club name with clear (✕) button
- Props: `clubs: { club: string; count: number; teams: number }[]`, `selected: string`, `onChange: (club: string) => void`

#### ClubDetail (`web/src/components/ClubDetail.tsx`) — new

Panel content when a club is selected:

- Summary callout: "[Club] sends N players to M national teams"
- Player list grouped by national team
  - Section header: flag emoji + country name + count
  - Player rows: name + position (right-aligned, muted)
- Sorted: national teams alphabetical, players by position order within each team

#### ClubLayer (`web/src/components/ClubLayer.tsx`) — new

deck.gl layer for the clubs view:

- **Source dot**: club location (`club_lat`/`club_lon`), blue (#4A7FB5), size 8
- **Arc layer**: from club location to each national team's country centroid
  - Color: #4A7FB5 with 60% opacity
  - Width: proportional to player count (1 player = 1px, scale up to 4px max)
  - Height factor: 0.5 (moderate arc curvature)
- **Target dots**: national team country centroids, colored by confederation
- Uses existing `computeCentroids()` from `lib/geo.ts` for destination points
- Fallback: if `club_lat`/`club_lon` null, use club_country centroid

#### Page integration (`web/src/app/page.tsx`)

- Add `filterClub` state (string, default "")
- Add `clubPlayers` derived memo: players filtered by `filterClub`
- Add `allClubs` derived memo via `uniqueClubs()`
- Add clubs case to `PanelContent` — renders `ClubCombobox` + `ClubDetail`
- Add clubs case to `layers` memo — creates club arc layer
- Add clubs case to hover handler — show player name + national team
- Reset `filterClub` on view change in `handleViewChange`

## Scope Boundaries

**In scope:**
- Pipeline: club coordinate enrichment via Wikidata
- Web: Clubs view with combobox, player list, arc visualization
- Web: Grouped tab bar refactor

**Out of scope:**
- League grouping / league data enrichment
- Club logos or badges
- Click-to-select-player interaction (hover tooltip only)
- Mobile bottom sheet adjustments (reuses existing pattern)
