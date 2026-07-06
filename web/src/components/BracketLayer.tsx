import { GeoJsonLayer, ScatterplotLayer, ArcLayer } from "deck.gl";
import type { Layer } from "deck.gl";
import type { FeatureCollection, Feature } from "geojson";
import type { Player } from "@/lib/types";
import { confederationColor } from "@/lib/colors";

/** Map team names to Natural Earth NAME property for mismatches */
const TEAM_TO_NE_NAME: Record<string, string> = {
  "United States": "United States of America",
  "South Korea": "Korea",
  "DR Congo": "Dem. Rep. Congo",
  "Bosnia and Herzegovina": "Bosnia and Herz.",
  "Czech Republic": "Czechia",
  "Ivory Coast": "Côte d'Ivoire",
  "Dominican Republic": "Dominican Rep.",
};

function teamToGeoName(team: string): string {
  return TEAM_TO_NE_NAME[team] ?? team;
}

const NE_NAME_TO_TEAM: Record<string, string> = Object.fromEntries(
  Object.entries(TEAM_TO_NE_NAME).map(([team, ne]) => [ne, team])
);

export function geoNameToTeam(geoName: string): string {
  return NE_NAME_TO_TEAM[geoName] ?? geoName;
}

interface ArcData {
  player: Player;
  sourcePosition: [number, number];
  targetPosition: [number, number];
}

export function createBracketLayers(
  geojson: FeatureCollection,
  players: Player[],
  survivingTeams: Set<string>,
  centroids: Map<string, { lon: number; lat: number }>,
  bracketTeam: string | null,
  getConfederation: (team: string) => string
): Layer[] {
  // Build reverse lookup: NE name -> team name for surviving teams
  const neNameToTeam = new Map<string, string>();
  for (const team of survivingTeams) {
    neNameToTeam.set(teamToGeoName(team), team);
  }

  // 1. Country highlight layer
  const countryLayer = new GeoJsonLayer({
    id: "bracket-countries",
    data: geojson,
    getFillColor: (f: Feature) => {
      const name = f.properties?.NAME ?? "";
      const team = neNameToTeam.get(name);
      if (!team) return [0, 0, 0, 0] as [number, number, number, number];
      const base = confederationColor(getConfederation(team));
      return [...base, 77] as [number, number, number, number]; // ~30% opacity
    },
    getLineColor: [200, 200, 200, 100],
    getLineWidth: 0.5,
    lineWidthUnits: "pixels" as const,
    pickable: true,
    autoHighlight: true,
    highlightColor: [74, 127, 181, 50],
    updateTriggers: {
      getFillColor: [survivingTeams, bracketTeam],
    },
  });

  // 2. Player birth dots for surviving teams
  const survivingPlayers = players.filter(
    (p) => survivingTeams.has(p.team_country) && p.birth_lat != null && p.birth_lon != null
  );

  const birthDots = new ScatterplotLayer<Player>({
    id: "bracket-birth-dots",
    data: survivingPlayers,
    getPosition: (d) => [d.birth_lon!, d.birth_lat!],
    getFillColor: (d) => {
      const base = confederationColor(d.team_confederation);
      if (bracketTeam && d.team_country !== bracketTeam) {
        return [...base, 38] as [number, number, number, number]; // ~15% opacity
      }
      return [...base, 200] as [number, number, number, number];
    },
    getRadius: (d) => {
      if (bracketTeam && d.team_country !== bracketTeam) return 3;
      return 6;
    },
    radiusUnits: "pixels" as const,
    pickable: true,
    autoHighlight: true,
    highlightColor: [255, 255, 255, 200],
    updateTriggers: {
      getFillColor: [bracketTeam],
      getRadius: [bracketTeam],
    },
  });

  const layers: Layer[] = [countryLayer, birthDots];

  // 3. Arc layer for selected team's foreign-born players
  if (bracketTeam) {
    const foreignBorn = survivingPlayers.filter(
      (p) => p.team_country === bracketTeam && p.is_foreign_born
    );
    const teamCentroid = centroids.get(teamToGeoName(bracketTeam)) ?? centroids.get(bracketTeam);

    if (teamCentroid && foreignBorn.length > 0) {
      const arcData: ArcData[] = foreignBorn.map((p) => ({
        player: p,
        sourcePosition: [p.birth_lon!, p.birth_lat!] as [number, number],
        targetPosition: [teamCentroid.lon, teamCentroid.lat] as [number, number],
      }));

      const arcs = new ArcLayer<ArcData>({
        id: "bracket-arcs",
        data: arcData,
        getSourcePosition: (d) => d.sourcePosition,
        getTargetPosition: (d) => d.targetPosition,
        getSourceColor: [160, 160, 160, 100],
        getTargetColor: (d) => {
          const base = confederationColor(d.player.team_confederation);
          return [...base, 200] as [number, number, number, number];
        },
        getWidth: 1.2,
        getHeight: 0.3,
        greatCircle: true,
        pickable: true,
        autoHighlight: true,
        highlightColor: [255, 255, 255, 100],
      });

      layers.push(arcs);
    }
  }

  return layers;
}
