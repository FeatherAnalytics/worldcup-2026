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
