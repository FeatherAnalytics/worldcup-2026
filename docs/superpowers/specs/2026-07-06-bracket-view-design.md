# Bracket View — Design Spec

## Overview

A 4th view ("Bracket") showing tournament progression alongside the map. The sidebar displays a vertical bracket diagram with round-by-round match results. The map highlights countries of teams still alive, shows player birth origin dots, and reveals diaspora arcs on team click.

## Data Source

Zafronix API (`/tournaments/2026`) provides match schedule, results, and bracket structure. A new pipeline script (`extract/tournament.py`) fetches and writes `public/data/matches.json`. Re-run to update as rounds complete.

### Match Record Shape

```typescript
interface Match {
  round: string;          // "Group A", "Group B", ..., "Round of 32", "Round of 16", "Quarter-finals", "Semi-finals", "Final"
  stage: string;          // "group" | "knockout"
  date: string;           // ISO date
  team_a: string;         // team country name
  team_b: string;
  score_a: number | null; // null = not yet played
  score_b: number | null;
  winner: string | null;  // team country name or null (draw/not played)
  penalties_a?: number;   // if decided by penalties
  penalties_b?: number;
}
```

### Tournament Stages (ordered)

1. Group Stage (12 groups × 4 teams, 3 matches each)
2. Round of 32
3. Round of 16
4. Quarter-finals
5. Semi-finals
6. Final

## Layout

Bracket view replaces sidebar content when the "Bracket" tab is active. Map fills remaining space as with other views. Same responsive pattern — mobile uses bottom sheet.

### Sidebar Content

```
┌─────────────────────────┐
│ [Diaspora][Squads][Origins][Bracket] │  ← ViewSwitcher (4 tabs)
├─────────────────────────┤
│ [Group][R32][R16][QF][SF][F] │  ← RoundSelector (horizontal pills)
├─────────────────────────┤
│ ┌─ Match Card ────────┐ │
│ │ 🇫🇷 France    2     │ │
│ │ 🇮🇶 Iraq      0     │ │  ← winner highlighted
│ └─────────────────────┘ │
│ ┌─ Match Card ────────┐ │
│ │ 🇧🇷 Brazil    1     │ │
│ │ 🇲🇦 Morocco   1     │ │  ← draw (group stage)
│ └─────────────────────┘ │
│ ┌─ Match Card ────────┐ │
│ │ 🇩🇪 Germany   vs    │ │
│ │ 🇨🇺 Curaçao         │ │  ← upcoming (no score)
│ └─────────────────────┘ │
│         ...              │
│                          │
│ ── Selected team ──      │
│ France                   │
│ 26 players, 3 foreign    │
│ [Player list]            │
└─────────────────────────┘
```

## Map Behavior

### Default (no team clicked)

- **Country fill:** Teams still alive at the selected round get a subtle fill highlight (confederation color at 30% opacity) on their country polygon using GeoJsonLayer.
- **Eliminated teams:** No fill (same as non-participating countries).
- **Player origin dots:** ScatterplotLayer showing birth locations of ALL players from surviving teams. Colored by confederation. Small (4px radius).
- No arcs visible by default.

### Team clicked (in bracket or on map)

- **Arcs appear:** Diaspora arcs for that one team's foreign-born players (gray origin → confederation color destination).
- **Sidebar:** Shows team summary card below the bracket — squad size, foreign-born count, player list.
- **Other dots dim** to 15% opacity. Clicked team's dots stay full.
- Click map background or another team to dismiss/switch.

## Components

### New Files

| File | Purpose |
|------|---------|
| `web/src/components/BracketPanel.tsx` | Sidebar content for bracket view: RoundSelector + match list + team detail |
| `web/src/components/RoundSelector.tsx` | Horizontal pill buttons for tournament stages |
| `web/src/components/MatchCard.tsx` | Single match display: two teams, score, winner highlight |
| `web/src/components/BracketLayer.tsx` | Creates map layers: country highlights + player dots + on-click arcs |
| `web/src/lib/bracket.ts` | Types (Match, Round), stage ordering, survivingTeams() computation |
| `pipeline/src/worldcup/extract/tournament.py` | Fetch match data from Zafronix API |

### Modified Files

| File | Change |
|------|--------|
| `web/src/lib/types.ts` | Add `"bracket"` to ViewMode union, add Match interface |
| `web/src/components/ViewSwitcher.tsx` | Add 4th tab |
| `web/src/app/page.tsx` | Add bracket state, layer creation, panel content |
| `web/src/lib/data.ts` | Add loadMatches() |

## State Additions (page.tsx)

```typescript
const [matches, setMatches] = useState<Match[]>([]);
const [selectedRound, setSelectedRound] = useState("group");
const [bracketTeam, setBracketTeam] = useState<string | null>(null);
```

### Derived State

```typescript
const survivingTeams = useMemo(() => computeSurvivingTeams(matches, selectedRound), [matches, selectedRound]);
const eliminatedTeams = useMemo(() => allTeams.filter(t => !survivingTeams.has(t)), [allTeams, survivingTeams]);
```

## Surviving Teams Computation

`computeSurvivingTeams(matches, upToRound)`:
- Start with all 48 teams
- For each knockout round up to `upToRound`, remove losers
- Group stage: all teams survive (no elimination in groups)
- Returns `Set<string>` of team names still alive

## Color & Styling

- Country highlight fill: confederation color at 30% opacity (same palette as arcs)
- Player dots: confederation color, 4px radius, 150 alpha
- Active dots (clicked team): full opacity, 6px radius
- Dimmed dots: 15% opacity
- Match cards: white bg, stone-200 border, winner row has left accent bar in confederation color
- Upcoming matches: italic "vs" instead of score
- Round pills: same style as ViewSwitcher tabs (stone-100 bg, white active)

## Data Pipeline

### tournament.py

```python
# Fetch from Zafronix API: /tournaments/2026
# Extract matches with: round, stage, date, teams, scores
# Write to: web/public/data/matches.json
# Idempotent: overwrites on each run
```

Requires `WC_API_KEY` env var (Zafronix free tier). Falls back to scraping Wikipedia's "2026 FIFA World Cup" results page if API key not available.

## Out of Scope

- Animated transitions between rounds (static view switching is fine)
- Bracket connector lines (traditional bracket diagram) — too complex for 320px sidebar
- Group standings table — just show match results
- Live score updates — manual pipeline re-run
