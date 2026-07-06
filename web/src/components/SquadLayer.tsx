import { ScatterplotLayer } from "deck.gl";
import type { Player } from "@/lib/types";

const FOREIGN_COLOR: [number, number, number] = [227, 74, 51];
const HOME_COLOR: [number, number, number] = [160, 160, 160];

export function createSquadLayer(players: Player[], selectedPlayer: Player | null) {
  const data = players.filter((p) => p.birth_lat != null && p.birth_lon != null);
  return new ScatterplotLayer<Player>({
    id: "squad-dots",
    data,
    getPosition: (d) => [d.birth_lon!, d.birth_lat!],
    getFillColor: (d) =>
      (d.is_foreign_born ? [...FOREIGN_COLOR, 200] : [...HOME_COLOR, 200]) as [number, number, number, number],
    getRadius: (d) => (selectedPlayer?.name === d.name ? 10 : 6),
    radiusUnits: "pixels",
    pickable: true,
    autoHighlight: true,
    highlightColor: [74, 127, 181, 150],
    updateTriggers: { getRadius: [selectedPlayer?.name] },
  });
}
