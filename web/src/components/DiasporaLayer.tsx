import { ArcLayer, ScatterplotLayer } from "deck.gl";
import type { Layer } from "deck.gl";
import type { Player } from "@/lib/types";
import { confederationColor } from "@/lib/colors";

interface ArcData {
  player: Player;
  sourcePosition: [number, number];
  targetPosition: [number, number];
}

export function createDiasporaLayers(
  players: Player[],
  centroids: Map<string, { lon: number; lat: number }>,
  highlightFilter?: (p: Player) => boolean
): Layer[] {
  const data: ArcData[] = players
    .filter((p) => p.birth_lat != null && p.birth_lon != null)
    .map((p) => {
      const target = centroids.get(p.team_country);
      return {
        player: p,
        sourcePosition: [p.birth_lon!, p.birth_lat!] as [number, number],
        targetPosition: target ? ([target.lon, target.lat] as [number, number]) : ([0, 0] as [number, number]),
      };
    })
    .filter((d) => d.targetPosition[0] !== 0 || d.targetPosition[1] !== 0);

  const arcs = new ArcLayer<ArcData>({
    id: "diaspora-arcs",
    data,
    getSourcePosition: (d) => d.sourcePosition,
    getTargetPosition: (d) => d.targetPosition,
    getSourceColor: (d) => {
      const dimmed = highlightFilter && !highlightFilter(d.player);
      if (dimmed) return [200, 200, 200, 15] as [number, number, number, number];
      return [160, 160, 160, 100] as [number, number, number, number];
    },
    getTargetColor: (d) => {
      const base = confederationColor(d.player.team_confederation);
      const dimmed = highlightFilter && !highlightFilter(d.player);
      if (dimmed) return [...base, 15] as [number, number, number, number];
      return [...base, 200] as [number, number, number, number];
    },
    getWidth: 1.2,
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

  const birthDots = new ScatterplotLayer<ArcData>({
    id: "diaspora-birth-dots",
    data,
    getPosition: (d) => d.sourcePosition,
    getFillColor: (d) => {
      const dimmed = highlightFilter && !highlightFilter(d.player);
      if (dimmed) return [180, 180, 180, 30] as [number, number, number, number];
      return [120, 120, 120, 180] as [number, number, number, number];
    },
    getRadius: 3,
    radiusUnits: "pixels" as const,
    pickable: true,
    autoHighlight: true,
    highlightColor: [255, 255, 255, 200],
    updateTriggers: { getFillColor: [highlightFilter] },
  });

  const destDots = new ScatterplotLayer<ArcData>({
    id: "diaspora-dest-dots",
    data,
    getPosition: (d) => d.targetPosition,
    getFillColor: (d) => {
      const base = confederationColor(d.player.team_confederation);
      const dimmed = highlightFilter && !highlightFilter(d.player);
      if (dimmed) return [...base, 30] as [number, number, number, number];
      return [...base, 240] as [number, number, number, number];
    },
    getRadius: 5,
    radiusUnits: "pixels" as const,
    stroked: true,
    getLineColor: [255, 255, 255, 200],
    getLineWidth: 1,
    lineWidthUnits: "pixels" as const,
    pickable: false,
    updateTriggers: { getFillColor: [highlightFilter] },
  });

  return [arcs, birthDots, destDots];
}
