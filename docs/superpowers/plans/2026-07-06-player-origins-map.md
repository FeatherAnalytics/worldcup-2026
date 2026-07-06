# Player Origins Map — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an interactive world map showing where 2026 World Cup players were born vs which teams they represent, with three switchable views (Diaspora arcs, Squad diversity dots, Talent factory choropleth).

**Architecture:** Next.js 16 static app with deck.gl visualization layers over a MapLibre basemap. Data is static JSON (no API). React state in page.tsx drives view switching and filtering. Light editorial theme with warm stone neutrals and confederation-based color coding.

**Tech Stack:** Next.js 16, React 19, deck.gl 9, MapLibre GL 5, react-map-gl 8, Tailwind CSS 4, TypeScript 5

**Spec:** `docs/superpowers/specs/2026-07-06-player-origins-map-design.md`

---

## File Map

```
web/
├── package.json
├── tsconfig.json
├── next.config.ts
├── postcss.config.mjs
├── src/
│   ├── app/
│   │   ├── layout.tsx              # Geist fonts, metadata, body classes
│   │   ├── page.tsx                # Main page: state, view switching, layout
│   │   └── globals.css             # Tailwind imports, tooltip/sheet animations
│   ├── components/
│   │   ├── MapView.tsx             # MapLibre + DeckGLOverlay container
│   │   ├── DiasporaLayer.tsx       # ArcLayer for birth→team arcs
│   │   ├── SquadLayer.tsx          # ScatterplotLayer for player dots
│   │   ├── FactoriesLayer.tsx      # GeoJsonLayer choropleth
│   │   ├── MapTooltip.tsx          # Positioned tooltip over map
│   │   ├── SidePanel.tsx           # Desktop left panel (320px)
│   │   ├── BottomSheet.tsx         # Mobile bottom sheet
│   │   ├── ViewSwitcher.tsx        # 3-tab view toggle
│   │   ├── FilterPanel.tsx         # Confederation/team/country filters
│   │   ├── TeamSelector.tsx        # Team dropdown for squad view
│   │   ├── PlayerCard.tsx          # Player detail card
│   │   ├── TeamSummary.tsx         # Squad composition stats
│   │   └── ColorLegend.tsx         # Gradient + categorical legend
│   └── lib/
│       ├── types.ts                # Player, Summary, ViewMode types
│       ├── data.ts                 # Data loading functions
│       ├── colors.ts               # Confederation palette, choropleth scale, helpers
│       └── geo.ts                  # Country centroid computation from GeoJSON
├── public/
│   └── data/
│       ├── players.json            # Copied from pipeline output
│       ├── summary.json            # Copied from pipeline output
│       └── countries.geojson       # Natural Earth 110m
└── tests/
    ├── lib/
    │   ├── colors.test.ts
    │   ├── geo.test.ts
    │   └── data.test.ts
    └── components/
        └── ViewSwitcher.test.tsx
```

---

## Task 1: Scaffold Next.js Project

**Files:**
- Create: `web/package.json`
- Create: `web/tsconfig.json`
- Create: `web/next.config.ts`
- Create: `web/postcss.config.mjs`
- Create: `web/src/app/layout.tsx`
- Create: `web/src/app/page.tsx`
- Create: `web/src/app/globals.css`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "worldcup-2026-web",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "deck.gl": "^9.3.4",
    "maplibre-gl": "^5.24.0",
    "next": "16.2.9",
    "react": "19.2.4",
    "react-dom": "19.2.4",
    "react-map-gl": "^8.1.1"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4",
    "@testing-library/jest-dom": "^6.9.1",
    "@testing-library/react": "^16.3.2",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "@vitejs/plugin-react": "^6.0.2",
    "eslint": "^9",
    "eslint-config-next": "16.2.9",
    "jsdom": "^29.1.1",
    "prettier": "^3.8.4",
    "tailwindcss": "^4",
    "typescript": "^5",
    "vitest": "^4.1.9"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: Create next.config.ts**

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
};

export default nextConfig;
```

- [ ] **Step 4: Create postcss.config.mjs**

```javascript
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
```

- [ ] **Step 5: Create globals.css**

```css
@import "tailwindcss";

@theme {
  --font-sans: "Geist", ui-sans-serif, system-ui, sans-serif;
  --font-mono: "Geist Mono", ui-monospace, monospace;

  --color-stone-50: #FAFAF9;
  --color-stone-200: #E7E5E4;
  --color-stone-400: #A8A29E;
  --color-stone-600: #57534E;
  --color-stone-900: #1C1917;
  --color-accent: #4A7FB5;
}

body {
  background-color: var(--color-stone-50);
  color: var(--color-stone-900);
  font-family: var(--font-sans);
}

@keyframes tooltip-fade-in {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes sheet-slide-up {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}

.animate-tooltip { animation: tooltip-fade-in 150ms ease-out; }
.animate-sheet { animation: sheet-slide-up 250ms ease-out; }
```

- [ ] **Step 6: Create layout.tsx**

```tsx
import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});

const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "World Cup 2026: Where Players Come From",
  description: "Interactive map of player birthplaces vs national teams at the 2026 FIFA World Cup",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
```

Note: Geist font files ship with `next` — copy from `node_modules/geist/dist/fonts/geist-sans/` to `src/app/fonts/` after install if `next/font/local` path doesn't resolve. Alternatively use `next/font/google` with `font-family: "Geist"` if available.

- [ ] **Step 7: Create minimal page.tsx**

```tsx
"use client";

export default function Home() {
  return (
    <div className="flex h-screen flex-col">
      <header className="border-b border-stone-200 px-6 py-3">
        <h1 className="text-xl font-semibold tracking-tight">
          World Cup 2026: Where Players Come From
        </h1>
      </header>
      <main className="flex flex-1 overflow-hidden">
        <div className="w-80 border-r border-stone-200 p-4 max-lg:hidden">
          <p className="text-stone-400 text-sm">Panel placeholder</p>
        </div>
        <div className="flex-1 bg-stone-100">
          <p className="p-8 text-stone-400">Map placeholder</p>
        </div>
      </main>
    </div>
  );
}
```

- [ ] **Step 8: Install dependencies and verify**

```bash
cd web && npm install
```

- [ ] **Step 9: Copy data files to public/**

```bash
mkdir -p web/public/data
cp data/output/players.json web/public/data/
cp data/output/summary.json web/public/data/
```

- [ ] **Step 10: Download Natural Earth countries GeoJSON**

```bash
curl -L "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson" -o web/public/data/countries.geojson
```

- [ ] **Step 11: Verify dev server starts**

Ask user to run: `! cd web && npm run dev`

Open http://localhost:3000 — should show header + panel placeholder + map placeholder.

- [ ] **Step 12: Commit**

```bash
git add web/package.json web/tsconfig.json web/next.config.ts web/postcss.config.mjs web/src/ web/public/data/
git commit -m "feat: scaffold Next.js app with layout and static data"
```

---

## Task 2: Types, Colors, and Geo Utilities

**Files:**
- Create: `web/src/lib/types.ts`
- Create: `web/src/lib/colors.ts`
- Create: `web/src/lib/geo.ts`
- Create: `web/src/lib/data.ts`
- Create: `web/tests/lib/colors.test.ts`
- Create: `web/tests/lib/geo.test.ts`

- [ ] **Step 1: Write types.ts**

```typescript
export type ViewMode = "diaspora" | "squad" | "factories";

export interface Player {
  name: string;
  team_country: string;
  team_confederation: string;
  position: string;
  club: string;
  club_country: string;
  birth_date: string;
  birth_city: string;
  birth_country: string;
  birth_lat: number | null;
  birth_lon: number | null;
  caps: number;
  goals: number;
  is_foreign_born: boolean;
  birth_country_known: boolean;
}

export interface TeamSummary {
  team_country: string;
  squad_size: number;
  foreign_born_count: number;
  birth_countries: number;
  birth_country_known_count?: number;
}

export interface BirthCountrySummary {
  birth_country: string;
  player_count: number;
  teams_represented: number;
}

export interface ConfederationSummary {
  team_confederation: string;
  player_count: number;
  team_count: number;
  foreign_born_count: number;
}

export interface ClubSummary {
  club: string;
  player_count: number;
  teams_represented: number;
}

export interface Summary {
  total_players: number;
  total_teams: number;
  foreign_born_count: number;
  foreign_born_pct: number;
  birth_country_known_count?: number;
  teams: TeamSummary[];
  birth_countries: BirthCountrySummary[];
  confederations: ConfederationSummary[];
  top_clubs: ClubSummary[];
}

export interface TooltipInfo {
  x: number;
  y: number;
  content: React.ReactNode;
}
```

- [ ] **Step 2: Write colors.ts**

```typescript
export const CONFEDERATION_COLORS: Record<string, [number, number, number]> = {
  UEFA: [74, 127, 181],
  CAF: [232, 145, 58],
  CONMEBOL: [74, 155, 110],
  CONCACAF: [224, 99, 92],
  AFC: [59, 155, 143],
  OFC: [139, 107, 174],
};

export const CONFEDERATION_HEX: Record<string, string> = {
  UEFA: "#4A7FB5",
  CAF: "#E8913A",
  CONMEBOL: "#4A9B6E",
  CONCACAF: "#E0635C",
  AFC: "#3B9B8F",
  OFC: "#8B6BAE",
};

export const CHOROPLETH_SCALE: { max: number; color: [number, number, number] }[] = [
  { max: 0, color: [240, 240, 240] },
  { max: 5, color: [254, 240, 217] },
  { max: 15, color: [253, 204, 138] },
  { max: 35, color: [252, 141, 89] },
  { max: 65, color: [227, 74, 51] },
  { max: Infinity, color: [179, 0, 0] },
];

export function confederationColor(confederation: string): [number, number, number] {
  return CONFEDERATION_COLORS[confederation] ?? [160, 160, 160];
}

export function choroplethColor(count: number): [number, number, number] {
  for (const step of CHOROPLETH_SCALE) {
    if (count <= step.max) return step.color;
  }
  return CHOROPLETH_SCALE[CHOROPLETH_SCALE.length - 1].color;
}
```

- [ ] **Step 3: Write failing tests for colors**

```typescript
// web/tests/lib/colors.test.ts
import { describe, expect, it } from "vitest";
import { confederationColor, choroplethColor } from "@/lib/colors";

describe("confederationColor", () => {
  it("returns UEFA blue for UEFA", () => {
    expect(confederationColor("UEFA")).toEqual([74, 127, 181]);
  });

  it("returns gray fallback for unknown", () => {
    expect(confederationColor("UNKNOWN")).toEqual([160, 160, 160]);
  });
});

describe("choroplethColor", () => {
  it("returns gray for 0 players", () => {
    expect(choroplethColor(0)).toEqual([240, 240, 240]);
  });

  it("returns lightest warm for 1-5", () => {
    expect(choroplethColor(3)).toEqual([254, 240, 217]);
  });

  it("returns darkest for 66+", () => {
    expect(choroplethColor(100)).toEqual([179, 0, 0]);
  });
});
```

- [ ] **Step 4: Create vitest config**

Create `web/vitest.config.ts`:

```typescript
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: [],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

- [ ] **Step 5: Run color tests**

```bash
cd web && npx vitest run tests/lib/colors.test.ts
```

Expected: 4 tests PASS.

- [ ] **Step 6: Write geo.ts**

```typescript
import type { FeatureCollection, Feature, Polygon, MultiPolygon } from "geojson";

export interface CountryCentroid {
  name: string;
  lat: number;
  lon: number;
}

export function computeCentroids(geojson: FeatureCollection): Map<string, CountryCentroid> {
  const centroids = new Map<string, CountryCentroid>();

  for (const feature of geojson.features) {
    const name = feature.properties?.NAME ?? feature.properties?.ADMIN ?? "";
    if (!name) continue;

    const [lon, lat] = featureCentroid(feature);
    centroids.set(name, { name, lat, lon });
  }

  return centroids;
}

function featureCentroid(feature: Feature): [number, number] {
  const coords = extractCoords(feature.geometry as Polygon | MultiPolygon);
  if (coords.length === 0) return [0, 0];

  let sumLon = 0;
  let sumLat = 0;
  for (const [lon, lat] of coords) {
    sumLon += lon;
    sumLat += lat;
  }
  return [sumLon / coords.length, sumLat / coords.length];
}

function extractCoords(geometry: Polygon | MultiPolygon): [number, number][] {
  if (geometry.type === "Polygon") {
    return geometry.coordinates[0] as [number, number][];
  }
  if (geometry.type === "MultiPolygon") {
    return geometry.coordinates.flatMap((poly) => poly[0]) as [number, number][];
  }
  return [];
}
```

- [ ] **Step 7: Write failing test for geo**

```typescript
// web/tests/lib/geo.test.ts
import { describe, expect, it } from "vitest";
import { computeCentroids } from "@/lib/geo";
import type { FeatureCollection } from "geojson";

const mockGeoJSON: FeatureCollection = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: { NAME: "Testland" },
      geometry: {
        type: "Polygon",
        coordinates: [[[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]],
      },
    },
  ],
};

describe("computeCentroids", () => {
  it("computes centroid of a simple polygon", () => {
    const centroids = computeCentroids(mockGeoJSON);
    const c = centroids.get("Testland");
    expect(c).toBeDefined();
    expect(c!.lon).toBeCloseTo(4, 0);
    expect(c!.lat).toBeCloseTo(4, 0);
  });

  it("returns empty map for empty FeatureCollection", () => {
    const empty: FeatureCollection = { type: "FeatureCollection", features: [] };
    expect(computeCentroids(empty).size).toBe(0);
  });
});
```

- [ ] **Step 8: Run geo tests**

```bash
cd web && npx vitest run tests/lib/geo.test.ts
```

Expected: 2 tests PASS.

- [ ] **Step 9: Write data.ts**

```typescript
import type { Player, Summary } from "./types";

let playersCache: Player[] | null = null;
let summaryCache: Summary | null = null;

export async function loadPlayers(): Promise<Player[]> {
  if (playersCache) return playersCache;
  const resp = await fetch("/data/players.json");
  playersCache = (await resp.json()) as Player[];
  return playersCache;
}

export async function loadSummary(): Promise<Summary> {
  if (summaryCache) return summaryCache;
  const resp = await fetch("/data/summary.json");
  summaryCache = (await resp.json()) as Summary;
  return summaryCache;
}

export function filterPlayers(
  players: Player[],
  filters: {
    team?: string;
    confederation?: string;
    birthCountry?: string;
  }
): Player[] {
  return players.filter((p) => {
    if (filters.team && p.team_country !== filters.team) return false;
    if (filters.confederation && p.team_confederation !== filters.confederation) return false;
    if (filters.birthCountry && p.birth_country !== filters.birthCountry) return false;
    return true;
  });
}

export function uniqueTeams(players: Player[]): string[] {
  return [...new Set(players.map((p) => p.team_country))].sort();
}

export function uniqueConfederations(players: Player[]): string[] {
  return [...new Set(players.map((p) => p.team_confederation))].sort();
}

export function uniqueBirthCountries(players: Player[]): string[] {
  return [...new Set(players.filter((p) => p.birth_country).map((p) => p.birth_country))].sort();
}
```

- [ ] **Step 10: Commit**

```bash
git add web/src/lib/ web/tests/ web/vitest.config.ts
git commit -m "feat: add types, color palette, geo utilities, and data loading"
```

---

## Task 3: MapView with Basemap

**Files:**
- Create: `web/src/components/MapView.tsx`
- Modify: `web/src/app/page.tsx`

- [ ] **Step 1: Create MapView.tsx**

```tsx
"use client";

import { useCallback, useState } from "react";
import Map from "react-map-gl/maplibre";
import { DeckGLOverlay } from "./DeckGLOverlay";
import type { Layer } from "deck.gl";
import "maplibre-gl/dist/maplibre-gl.css";

const BASEMAP = "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json";

const INITIAL_VIEW = {
  longitude: 10,
  latitude: 25,
  zoom: 1.8,
  pitch: 0,
  bearing: 0,
};

interface MapViewProps {
  layers?: Layer[];
  onHover?: (info: { x: number; y: number; object?: unknown } | null) => void;
  onClick?: (info: { object?: unknown }) => void;
}

export function MapView({ layers = [], onHover, onClick }: MapViewProps) {
  return (
    <Map
      initialViewState={INITIAL_VIEW}
      style={{ width: "100%", height: "100%" }}
      mapStyle={BASEMAP}
      attributionControl={false}
    >
      <DeckGLOverlay layers={layers} onHover={onHover} onClick={onClick} />
    </Map>
  );
}
```

- [ ] **Step 2: Create DeckGLOverlay.tsx**

```tsx
"use client";

import { useControl } from "react-map-gl/maplibre";
import { MapboxOverlay } from "deck.gl";
import type { Layer } from "deck.gl";

interface DeckGLOverlayProps {
  layers: Layer[];
  onHover?: (info: { x: number; y: number; object?: unknown } | null) => void;
  onClick?: (info: { object?: unknown }) => void;
}

export function DeckGLOverlay({ layers, onHover, onClick }: DeckGLOverlayProps) {
  const overlay = useControl(
    () => new MapboxOverlay({ interleaved: false }),
  );
  overlay.setProps({
    layers,
    onHover: onHover ? (info: unknown) => onHover(info as { x: number; y: number; object?: unknown }) : undefined,
    onClick: onClick ? (info: unknown) => onClick(info as { object?: unknown }) : undefined,
  });
  return null;
}
```

- [ ] **Step 3: Update page.tsx to render MapView**

```tsx
"use client";

import { useEffect, useState } from "react";
import { MapView } from "@/components/MapView";
import type { Player, Summary, ViewMode } from "@/lib/types";
import { loadPlayers, loadSummary } from "@/lib/data";

export default function Home() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [activeView, setActiveView] = useState<ViewMode>("diaspora");

  useEffect(() => {
    loadPlayers().then(setPlayers);
    loadSummary().then(setSummary);
  }, []);

  return (
    <div className="flex h-screen flex-col">
      <header className="border-b border-stone-200 px-6 py-3">
        <h1 className="text-xl font-semibold tracking-tight">
          World Cup 2026: Where Players Come From
        </h1>
        <p className="text-sm text-stone-500">
          {players.length > 0 && `${players.length} players across ${summary?.total_teams ?? 48} teams`}
        </p>
      </header>
      <main className="flex flex-1 overflow-hidden">
        <aside className="w-80 shrink-0 overflow-y-auto border-r border-stone-200 p-4 max-lg:hidden">
          <p className="text-sm text-stone-400">
            {players.length} players loaded. View: {activeView}
          </p>
        </aside>
        <div className="relative flex-1">
          <MapView layers={[]} />
        </div>
      </main>
    </div>
  );
}
```

- [ ] **Step 4: Verify map renders**

Ask user: `! cd web && npm run dev`

Open http://localhost:3000 — should show header with player count, sidebar, and CartoDB Voyager world map.

- [ ] **Step 5: Commit**

```bash
git add web/src/components/MapView.tsx web/src/components/DeckGLOverlay.tsx web/src/app/page.tsx
git commit -m "feat: add MapLibre basemap with deck.gl overlay"
```

---

## Task 4: Diaspora View (Arc Layer)

**Files:**
- Create: `web/src/components/DiasporaLayer.tsx`
- Create: `web/src/components/MapTooltip.tsx`
- Modify: `web/src/app/page.tsx`

- [ ] **Step 1: Create DiasporaLayer.tsx**

```tsx
import { ArcLayer } from "deck.gl";
import type { Player } from "@/lib/types";
import { confederationColor } from "@/lib/colors";

interface ArcData {
  player: Player;
  sourcePosition: [number, number];
  targetPosition: [number, number];
}

export function createDiasporaLayer(
  players: Player[],
  centroids: Map<string, { lon: number; lat: number }>,
  highlightFilter?: (p: Player) => boolean
) {
  const data: ArcData[] = players
    .filter((p) => p.birth_lat != null && p.birth_lon != null)
    .map((p) => {
      const target = centroids.get(p.team_country);
      return {
        player: p,
        sourcePosition: [p.birth_lon!, p.birth_lat!] as [number, number],
        targetPosition: target
          ? [target.lon, target.lat] as [number, number]
          : [0, 0] as [number, number],
      };
    })
    .filter((d) => d.targetPosition[0] !== 0 || d.targetPosition[1] !== 0);

  return new ArcLayer<ArcData>({
    id: "diaspora-arcs",
    data,
    getSourcePosition: (d) => d.sourcePosition,
    getTargetPosition: (d) => d.targetPosition,
    getSourceColor: (d) => {
      const base = confederationColor(d.player.team_confederation);
      if (highlightFilter && !highlightFilter(d.player)) return [...base, 25] as [number, number, number, number];
      return [...base, 180] as [number, number, number, number];
    },
    getTargetColor: (d) => {
      const base = confederationColor(d.player.team_confederation);
      if (highlightFilter && !highlightFilter(d.player)) return [...base, 25] as [number, number, number, number];
      return [...base, 180] as [number, number, number, number];
    },
    getWidth: 1,
    getHeight: 0.3,
    greatCircle: true,
    pickable: true,
    autoHighlight: true,
    highlightColor: [255, 255, 255, 100],
    updateTriggers: {
      getSourceColor: [highlightFilter],
      getTargetColor: [highlightFilter],
    },
  });
}
```

- [ ] **Step 2: Create MapTooltip.tsx**

```tsx
interface MapTooltipProps {
  x: number;
  y: number;
  children: React.ReactNode;
}

export function MapTooltip({ x, y, children }: MapTooltipProps) {
  return (
    <div
      className="animate-tooltip pointer-events-none absolute z-50 rounded-lg bg-white/92 px-3 py-2 text-sm shadow-lg backdrop-blur-sm"
      style={{ left: x + 12, top: y - 12 }}
    >
      {children}
    </div>
  );
}
```

- [ ] **Step 3: Update page.tsx to wire Diaspora view**

Replace page.tsx content with full wiring. Key additions:
- Load GeoJSON and compute centroids on mount
- Create arc layer when `activeView === "diaspora"`
- Handle hover to show tooltip

```tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { MapView } from "@/components/MapView";
import { MapTooltip } from "@/components/MapTooltip";
import { createDiasporaLayer } from "@/components/DiasporaLayer";
import { computeCentroids, type CountryCentroid } from "@/lib/geo";
import { loadPlayers, loadSummary } from "@/lib/data";
import type { Player, Summary, ViewMode, TooltipInfo } from "@/lib/types";
import type { FeatureCollection } from "geojson";

export default function Home() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [centroids, setCentroids] = useState<Map<string, CountryCentroid>>(new Map());
  const [activeView, setActiveView] = useState<ViewMode>("diaspora");
  const [tooltip, setTooltip] = useState<TooltipInfo | null>(null);

  useEffect(() => {
    loadPlayers().then(setPlayers);
    loadSummary().then(setSummary);
    fetch("/data/countries.geojson")
      .then((r) => r.json())
      .then((geojson: FeatureCollection) => setCentroids(computeCentroids(geojson)));
  }, []);

  const handleHover = useCallback((info: { x: number; y: number; object?: unknown } | null) => {
    if (!info?.object) {
      setTooltip(null);
      return;
    }
    const arc = info.object as { player: Player };
    setTooltip({
      x: info.x,
      y: info.y,
      content: (
        <div>
          <p className="font-medium">{arc.player.name}</p>
          <p className="text-stone-500">
            {arc.player.birth_city}, {arc.player.birth_country} → {arc.player.team_country}
          </p>
          <p className="text-stone-400 text-xs">{arc.player.club}</p>
        </div>
      ),
    });
  }, []);

  const layers = useMemo(() => {
    if (activeView === "diaspora" && players.length > 0 && centroids.size > 0) {
      return [createDiasporaLayer(players, centroids)];
    }
    return [];
  }, [activeView, players, centroids]);

  return (
    <div className="flex h-screen flex-col">
      <header className="border-b border-stone-200 px-6 py-3">
        <h1 className="text-xl font-semibold tracking-tight">
          World Cup 2026: Where Players Come From
        </h1>
        <p className="text-sm text-stone-500">
          {players.length > 0 && `${players.length} players across ${summary?.total_teams ?? 48} teams`}
        </p>
      </header>
      <main className="flex flex-1 overflow-hidden">
        <aside className="w-80 shrink-0 overflow-y-auto border-r border-stone-200 p-4 max-lg:hidden">
          <p className="text-sm text-stone-400">View: {activeView}</p>
        </aside>
        <div className="relative flex-1">
          <MapView layers={layers} onHover={handleHover} />
          {tooltip && (
            <MapTooltip x={tooltip.x} y={tooltip.y}>
              {tooltip.content}
            </MapTooltip>
          )}
        </div>
      </main>
    </div>
  );
}
```

- [ ] **Step 4: Verify arcs render**

Reload http://localhost:3000. Should see ~1,200 colored arcs spanning the globe from birth cities to team countries. Hover an arc should show player name and route.

- [ ] **Step 5: Commit**

```bash
git add web/src/components/DiasporaLayer.tsx web/src/components/MapTooltip.tsx web/src/app/page.tsx
git commit -m "feat: add diaspora arc layer with hover tooltips"
```

---

## Task 5: View Switcher + Side Panel

**Files:**
- Create: `web/src/components/ViewSwitcher.tsx`
- Create: `web/src/components/SidePanel.tsx`
- Modify: `web/src/app/page.tsx`

- [ ] **Step 1: Create ViewSwitcher.tsx**

```tsx
import type { ViewMode } from "@/lib/types";

const VIEWS: { key: ViewMode; label: string; description: string }[] = [
  { key: "diaspora", label: "Diaspora", description: "Where players are born vs who they play for" },
  { key: "squad", label: "Squads", description: "How diverse is each team's roster" },
  { key: "factories", label: "Talent Factories", description: "Which countries produce the most players" },
];

interface ViewSwitcherProps {
  active: ViewMode;
  onChange: (view: ViewMode) => void;
}

export function ViewSwitcher({ active, onChange }: ViewSwitcherProps) {
  return (
    <div className="space-y-1">
      {VIEWS.map((v) => (
        <button
          key={v.key}
          onClick={() => onChange(v.key)}
          className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
            active === v.key
              ? "bg-stone-100 font-medium text-stone-900"
              : "text-stone-500 hover:bg-stone-50 hover:text-stone-700"
          }`}
          aria-pressed={active === v.key}
        >
          <span className="block">{v.label}</span>
          <span className="block text-xs text-stone-400">{v.description}</span>
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Create SidePanel.tsx**

```tsx
import type { ViewMode, Player, Summary } from "@/lib/types";
import { ViewSwitcher } from "./ViewSwitcher";

interface SidePanelProps {
  activeView: ViewMode;
  onViewChange: (view: ViewMode) => void;
  players: Player[];
  summary: Summary | null;
  children?: React.ReactNode;
}

export function SidePanel({ activeView, onViewChange, players, summary, children }: SidePanelProps) {
  return (
    <aside className="flex w-80 shrink-0 flex-col gap-4 overflow-y-auto border-r border-stone-200 p-4 max-lg:hidden">
      <ViewSwitcher active={activeView} onChange={onViewChange} />
      <div className="h-px bg-stone-200" />
      {summary && (
        <div className="grid grid-cols-2 gap-2 text-center">
          <div className="rounded-lg bg-stone-50 p-2">
            <p className="font-mono text-lg font-semibold">{summary.total_players}</p>
            <p className="text-xs text-stone-400">Players</p>
          </div>
          <div className="rounded-lg bg-stone-50 p-2">
            <p className="font-mono text-lg font-semibold">{summary.total_teams}</p>
            <p className="text-xs text-stone-400">Teams</p>
          </div>
          <div className="rounded-lg bg-stone-50 p-2">
            <p className="font-mono text-lg font-semibold">{summary.foreign_born_count}</p>
            <p className="text-xs text-stone-400">Foreign-born</p>
          </div>
          <div className="rounded-lg bg-stone-50 p-2">
            <p className="font-mono text-lg font-semibold">{summary.foreign_born_pct}%</p>
            <p className="text-xs text-stone-400">of known</p>
          </div>
        </div>
      )}
      <div className="h-px bg-stone-200" />
      {children}
    </aside>
  );
}
```

- [ ] **Step 3: Update page.tsx to use SidePanel**

Replace the `<aside>` block in page.tsx with:

```tsx
<SidePanel
  activeView={activeView}
  onViewChange={setActiveView}
  players={players}
  summary={summary}
/>
```

Add import: `import { SidePanel } from "@/components/SidePanel";`

- [ ] **Step 4: Verify view switching**

Reload — panel should show 3 view tabs, stat cards, clicking tabs should change `activeView` (arcs disappear on non-diaspora views since those layers aren't built yet).

- [ ] **Step 5: Commit**

```bash
git add web/src/components/ViewSwitcher.tsx web/src/components/SidePanel.tsx web/src/app/page.tsx
git commit -m "feat: add view switcher and side panel with summary stats"
```

---

## Task 6: Squad Diversity View (Dot Layer)

**Files:**
- Create: `web/src/components/SquadLayer.tsx`
- Create: `web/src/components/TeamSelector.tsx`
- Create: `web/src/components/TeamSummary.tsx`
- Create: `web/src/components/PlayerCard.tsx`
- Modify: `web/src/app/page.tsx`

- [ ] **Step 1: Create SquadLayer.tsx**

```tsx
import { ScatterplotLayer } from "deck.gl";
import type { Player } from "@/lib/types";

const FOREIGN_COLOR: [number, number, number] = [227, 74, 51];
const HOME_COLOR: [number, number, number] = [160, 160, 160];

export function createSquadLayer(
  players: Player[],
  selectedPlayer: Player | null,
  onHover?: (info: { x: number; y: number; object?: unknown } | null) => void
) {
  const data = players.filter((p) => p.birth_lat != null && p.birth_lon != null);

  return new ScatterplotLayer<Player>({
    id: "squad-dots",
    data,
    getPosition: (d) => [d.birth_lon!, d.birth_lat!],
    getFillColor: (d) => (d.is_foreign_born ? [...FOREIGN_COLOR, 200] : [...HOME_COLOR, 200]) as [number, number, number, number],
    getRadius: (d) => (selectedPlayer?.name === d.name ? 10 : 6),
    radiusUnits: "pixels",
    pickable: true,
    autoHighlight: true,
    highlightColor: [74, 127, 181, 150],
    updateTriggers: {
      getRadius: [selectedPlayer?.name],
    },
  });
}
```

- [ ] **Step 2: Create TeamSelector.tsx**

```tsx
interface TeamSelectorProps {
  teams: string[];
  selected: string;
  onChange: (team: string) => void;
}

export function TeamSelector({ teams, selected, onChange }: TeamSelectorProps) {
  return (
    <div>
      <label htmlFor="team-select" className="mb-1 block text-xs font-medium text-stone-500">
        Select Team
      </label>
      <select
        id="team-select"
        value={selected}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-900 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
      >
        {teams.map((t) => (
          <option key={t} value={t}>{t}</option>
        ))}
      </select>
    </div>
  );
}
```

- [ ] **Step 3: Create TeamSummary.tsx**

```tsx
import type { Player } from "@/lib/types";

interface TeamSummaryProps {
  team: string;
  players: Player[];
}

export function TeamSummaryCard({ team, players }: TeamSummaryProps) {
  const foreignBorn = players.filter((p) => p.is_foreign_born).length;
  const birthCountries = new Set(players.filter((p) => p.birth_country).map((p) => p.birth_country)).size;

  return (
    <div className="rounded-lg bg-stone-50 p-3">
      <h3 className="font-medium text-stone-900">{team}</h3>
      <div className="mt-2 grid grid-cols-3 gap-2 text-center text-xs">
        <div>
          <p className="font-mono text-base font-semibold">{players.length}</p>
          <p className="text-stone-400">Players</p>
        </div>
        <div>
          <p className="font-mono text-base font-semibold">{foreignBorn}</p>
          <p className="text-stone-400">Foreign</p>
        </div>
        <div>
          <p className="font-mono text-base font-semibold">{birthCountries}</p>
          <p className="text-stone-400">Origins</p>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create PlayerCard.tsx**

```tsx
import type { Player } from "@/lib/types";

interface PlayerCardProps {
  player: Player;
}

export function PlayerCard({ player }: PlayerCardProps) {
  return (
    <div className="rounded-lg border border-stone-200 bg-white p-3">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-medium text-stone-900">{player.name}</p>
          <p className="text-xs text-stone-500">{player.position}</p>
        </div>
        {player.is_foreign_born && (
          <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs text-red-600">Foreign-born</span>
        )}
      </div>
      <div className="mt-2 space-y-1 text-xs text-stone-600">
        <p>Born: {player.birth_city}{player.birth_country ? `, ${player.birth_country}` : ""}</p>
        <p>Club: {player.club}{player.club_country ? ` (${player.club_country})` : ""}</p>
        <p>Caps: {player.caps} | Goals: {player.goals}</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Wire Squad view into page.tsx**

Add state for selected team and player. Add squad layer creation when `activeView === "squad"`. Render TeamSelector, TeamSummary, and player list in the panel. Show PlayerCard on dot click.

Key state additions:

```tsx
const [selectedTeam, setSelectedTeam] = useState<string>("");
const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);

// Set initial team when players load
useEffect(() => {
  if (players.length > 0 && !selectedTeam) {
    setSelectedTeam(uniqueTeams(players)[0]);
  }
}, [players, selectedTeam]);
```

Key layer addition in the `layers` useMemo:

```tsx
if (activeView === "squad" && players.length > 0) {
  const teamPlayers = players.filter((p) => p.team_country === selectedTeam);
  return [createSquadLayer(teamPlayers, selectedPlayer)];
}
```

Panel children for squad view:

```tsx
{activeView === "squad" && (
  <>
    <TeamSelector teams={uniqueTeams(players)} selected={selectedTeam} onChange={(t) => { setSelectedTeam(t); setSelectedPlayer(null); }} />
    <TeamSummaryCard team={selectedTeam} players={players.filter((p) => p.team_country === selectedTeam)} />
    {selectedPlayer && <PlayerCard player={selectedPlayer} />}
  </>
)}
```

- [ ] **Step 6: Verify squad view**

Switch to "Squads" tab. Select Morocco — should see 26 dots scattered across Europe/Africa, with red dots for foreign-born. Click a dot to see player card.

- [ ] **Step 7: Commit**

```bash
git add web/src/components/SquadLayer.tsx web/src/components/TeamSelector.tsx web/src/components/TeamSummary.tsx web/src/components/PlayerCard.tsx web/src/app/page.tsx
git commit -m "feat: add squad diversity view with team selector and player cards"
```

---

## Task 7: Talent Factories View (Choropleth)

**Files:**
- Create: `web/src/components/FactoriesLayer.tsx`
- Create: `web/src/components/ColorLegend.tsx`
- Modify: `web/src/app/page.tsx`

- [ ] **Step 1: Create FactoriesLayer.tsx**

```tsx
import { GeoJsonLayer } from "deck.gl";
import type { FeatureCollection, Feature } from "geojson";
import { choroplethColor } from "@/lib/colors";
import type { BirthCountrySummary } from "@/lib/types";

export function createFactoriesLayer(
  geojson: FeatureCollection,
  birthCountries: BirthCountrySummary[]
) {
  const countByName = new Map<string, number>();
  for (const bc of birthCountries) {
    countByName.set(bc.birth_country, bc.player_count);
  }

  return new GeoJsonLayer({
    id: "factories-choropleth",
    data: geojson,
    getFillColor: (f: Feature) => {
      const name = f.properties?.NAME ?? f.properties?.ADMIN ?? "";
      const count = countByName.get(name) ?? 0;
      return [...choroplethColor(count), 200] as [number, number, number, number];
    },
    getLineColor: [255, 255, 255, 150],
    getLineWidth: 0.5,
    lineWidthUnits: "pixels",
    pickable: true,
    autoHighlight: true,
    highlightColor: [74, 127, 181, 80],
    updateTriggers: {
      getFillColor: [birthCountries],
    },
  });
}
```

- [ ] **Step 2: Create ColorLegend.tsx**

```tsx
import { CHOROPLETH_SCALE } from "@/lib/colors";

const LABELS = ["0", "1–5", "6–15", "16–35", "36–65", "66+"];

export function ColorLegend() {
  return (
    <div>
      <p className="mb-1 text-xs font-medium text-stone-500">Players born in country</p>
      <div className="flex">
        {CHOROPLETH_SCALE.map((step, i) => (
          <div key={i} className="flex-1">
            <div
              className="h-3 w-full"
              style={{ backgroundColor: `rgb(${step.color.join(",")})` }}
            />
            <p className="mt-0.5 text-center text-[10px] text-stone-400">{LABELS[i]}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Wire Factories view into page.tsx**

Store geojson in state (already fetched for centroids). Add layer creation when `activeView === "factories"`. Add tooltip for country hover showing player count and teams. Render ColorLegend in panel.

Key layer addition:

```tsx
if (activeView === "factories" && geojson && summary) {
  return [createFactoriesLayer(geojson, summary.birth_countries)];
}
```

Store geojson separately from centroids:

```tsx
const [geojson, setGeojson] = useState<FeatureCollection | null>(null);

useEffect(() => {
  fetch("/data/countries.geojson")
    .then((r) => r.json())
    .then((data: FeatureCollection) => {
      setGeojson(data);
      setCentroids(computeCentroids(data));
    });
}, []);
```

Hover handler for factories — show country name + player count:

```tsx
if (activeView === "factories") {
  const feature = info.object as Feature;
  const name = feature?.properties?.NAME ?? "";
  const bc = summary?.birth_countries.find((c) => c.birth_country === name);
  setTooltip({
    x: info.x, y: info.y,
    content: (
      <div>
        <p className="font-medium">{name}</p>
        <p className="text-stone-500">{bc ? `${bc.player_count} players, ${bc.teams_represented} teams` : "No players"}</p>
      </div>
    ),
  });
}
```

Panel children for factories view:

```tsx
{activeView === "factories" && <ColorLegend />}
```

- [ ] **Step 4: Verify choropleth renders**

Switch to "Talent Factories" tab. France should be darkest amber. Hover countries to see counts.

- [ ] **Step 5: Commit**

```bash
git add web/src/components/FactoriesLayer.tsx web/src/components/ColorLegend.tsx web/src/app/page.tsx
git commit -m "feat: add talent factories choropleth view with legend"
```

---

## Task 8: Filter Panel (Diaspora View)

**Files:**
- Create: `web/src/components/FilterPanel.tsx`
- Modify: `web/src/app/page.tsx`

- [ ] **Step 1: Create FilterPanel.tsx**

```tsx
import { CONFEDERATION_HEX } from "@/lib/colors";

interface FilterPanelProps {
  confederations: string[];
  teams: string[];
  birthCountries: string[];
  selectedConfederation: string;
  selectedTeam: string;
  selectedBirthCountry: string;
  onConfederationChange: (c: string) => void;
  onTeamChange: (t: string) => void;
  onBirthCountryChange: (c: string) => void;
  onClear: () => void;
}

export function FilterPanel({
  confederations, teams, birthCountries,
  selectedConfederation, selectedTeam, selectedBirthCountry,
  onConfederationChange, onTeamChange, onBirthCountryChange, onClear,
}: FilterPanelProps) {
  const hasFilter = selectedConfederation || selectedTeam || selectedBirthCountry;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-stone-500">Filters</p>
        {hasFilter && (
          <button onClick={onClear} className="text-xs text-accent hover:underline">
            Clear all
          </button>
        )}
      </div>

      <div>
        <label htmlFor="conf-filter" className="mb-1 block text-xs text-stone-400">Confederation</label>
        <select
          id="conf-filter"
          value={selectedConfederation}
          onChange={(e) => onConfederationChange(e.target.value)}
          className="w-full rounded border border-stone-200 bg-white px-2 py-1.5 text-sm"
        >
          <option value="">All</option>
          {confederations.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="team-filter" className="mb-1 block text-xs text-stone-400">Team</label>
        <select
          id="team-filter"
          value={selectedTeam}
          onChange={(e) => onTeamChange(e.target.value)}
          className="w-full rounded border border-stone-200 bg-white px-2 py-1.5 text-sm"
        >
          <option value="">All teams</option>
          {teams.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="birth-filter" className="mb-1 block text-xs text-stone-400">Birth country</label>
        <select
          id="birth-filter"
          value={selectedBirthCountry}
          onChange={(e) => onBirthCountryChange(e.target.value)}
          className="w-full rounded border border-stone-200 bg-white px-2 py-1.5 text-sm"
        >
          <option value="">All countries</option>
          {birthCountries.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Wire filters into page.tsx**

Add filter state:

```tsx
const [filterConf, setFilterConf] = useState("");
const [filterTeam, setFilterTeam] = useState("");
const [filterBirth, setFilterBirth] = useState("");

const clearFilters = useCallback(() => {
  setFilterConf("");
  setFilterTeam("");
  setFilterBirth("");
}, []);
```

Build highlight filter for the arc layer:

```tsx
const highlightFilter = useMemo(() => {
  if (!filterConf && !filterTeam && !filterBirth) return undefined;
  return (p: Player) => {
    if (filterConf && p.team_confederation !== filterConf) return false;
    if (filterTeam && p.team_country !== filterTeam) return false;
    if (filterBirth && p.birth_country !== filterBirth) return false;
    return true;
  };
}, [filterConf, filterTeam, filterBirth]);
```

Pass `highlightFilter` to `createDiasporaLayer`:

```tsx
return [createDiasporaLayer(players, centroids, highlightFilter)];
```

Render FilterPanel in panel children when diaspora view is active:

```tsx
{activeView === "diaspora" && (
  <FilterPanel
    confederations={uniqueConfederations(players)}
    teams={uniqueTeams(players)}
    birthCountries={uniqueBirthCountries(players)}
    selectedConfederation={filterConf}
    selectedTeam={filterTeam}
    selectedBirthCountry={filterBirth}
    onConfederationChange={setFilterConf}
    onTeamChange={setFilterTeam}
    onBirthCountryChange={setFilterBirth}
    onClear={clearFilters}
  />
)}
```

- [ ] **Step 3: Verify filtering**

Select "CAF" confederation — only arcs for African teams should remain at full opacity, others dim to 10%.

- [ ] **Step 4: Commit**

```bash
git add web/src/components/FilterPanel.tsx web/src/app/page.tsx
git commit -m "feat: add diaspora view filters with arc highlighting"
```

---

## Task 9: Mobile Bottom Sheet

**Files:**
- Create: `web/src/components/BottomSheet.tsx`
- Modify: `web/src/app/page.tsx`

- [ ] **Step 1: Create BottomSheet.tsx**

```tsx
"use client";

import { useState } from "react";

interface BottomSheetProps {
  children: React.ReactNode;
}

export function BottomSheet({ children }: BottomSheetProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={`animate-sheet fixed inset-x-0 bottom-0 z-40 rounded-t-xl bg-white/92 shadow-2xl backdrop-blur-sm transition-all duration-300 lg:hidden ${
        expanded ? "top-24" : "max-h-56"
      }`}
    >
      <div className="flex justify-center py-2">
        <button
          onClick={() => setExpanded(!expanded)}
          className="h-1 w-10 rounded-full bg-stone-300"
          aria-label={expanded ? "Collapse panel" : "Expand panel"}
        />
      </div>
      <div className="overflow-y-auto px-4 pb-4" style={{ maxHeight: expanded ? "calc(100vh - 8rem)" : "11rem" }}>
        {children}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Wire into page.tsx**

Add below the map div, inside `<main>`:

```tsx
<BottomSheet>
  <ViewSwitcher active={activeView} onChange={setActiveView} />
  <div className="mt-3 h-px bg-stone-200" />
  <div className="mt-3 space-y-3">
    {/* Same view-specific panel content as SidePanel */}
  </div>
</BottomSheet>
```

Extract view-specific panel content into a shared component or render function to avoid duplicating between SidePanel and BottomSheet.

- [ ] **Step 3: Verify on narrow viewport**

Resize browser to <1024px. Sidebar should disappear, bottom sheet should appear with drag handle.

- [ ] **Step 4: Commit**

```bash
git add web/src/components/BottomSheet.tsx web/src/app/page.tsx
git commit -m "feat: add mobile bottom sheet for responsive layout"
```

---

## Task 10: Polish and Final Verification

**Files:**
- Modify: `web/src/app/page.tsx` (attribution footer)
- Modify: `web/src/app/globals.css` (final animation tweaks)

- [ ] **Step 1: Add attribution footer**

Add below `</main>`:

```tsx
<footer className="border-t border-stone-200 px-6 py-2 text-xs text-stone-400">
  Data: Wikipedia + Wikidata | Basemap: CartoDB Voyager | Built with deck.gl
</footer>
```

- [ ] **Step 2: Run all tests**

```bash
cd web && npx vitest run
```

Expected: All tests pass.

- [ ] **Step 3: Run build**

```bash
cd web && npm run build
```

Expected: Static export succeeds with no errors.

- [ ] **Step 4: Visual verification**

Open each view and verify:
- Diaspora: arcs render, tooltips work, filters dim non-matching arcs
- Squad: dots render per team, player card on click, team summary stats correct
- Factories: choropleth colors match data, legend shows, hover tooltips work
- Mobile: bottom sheet appears on narrow viewport, all views accessible

- [ ] **Step 5: Commit**

```bash
git add web/
git commit -m "feat: add attribution footer and finalize styling"
```

---

## Summary

| Task | Description | Key files |
|------|------------|-----------|
| 1 | Scaffold Next.js project | package.json, layout.tsx, page.tsx |
| 2 | Types, colors, geo utilities | lib/types.ts, colors.ts, geo.ts, data.ts |
| 3 | MapView with basemap | MapView.tsx, DeckGLOverlay.tsx |
| 4 | Diaspora arcs | DiasporaLayer.tsx, MapTooltip.tsx |
| 5 | View switcher + side panel | ViewSwitcher.tsx, SidePanel.tsx |
| 6 | Squad diversity dots | SquadLayer.tsx, TeamSelector.tsx, PlayerCard.tsx |
| 7 | Talent factories choropleth | FactoriesLayer.tsx, ColorLegend.tsx |
| 8 | Filter panel | FilterPanel.tsx |
| 9 | Mobile bottom sheet | BottomSheet.tsx |
| 10 | Polish + verify | Footer, tests, build |
