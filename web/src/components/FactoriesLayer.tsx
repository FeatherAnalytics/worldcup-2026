import { GeoJsonLayer } from "deck.gl";
import type { FeatureCollection, Feature } from "geojson";
import { choroplethColor } from "@/lib/colors";
import type { BirthCountrySummary } from "@/lib/types";

export function createFactoriesLayer(geojson: FeatureCollection, birthCountries: BirthCountrySummary[]) {
  const countByName = new Map<string, number>();
  for (const bc of birthCountries) {
    countByName.set(bc.birth_country, bc.player_count);
  }
  return new GeoJsonLayer({
    id: "factories-choropleth",
    data: geojson,
    getFillColor: (f: Feature) => {
      const name = (f.properties?.NAME ?? f.properties?.ADMIN ?? "") as string;
      const count = countByName.get(name) ?? 0;
      return [...choroplethColor(count), 200] as [number, number, number, number];
    },
    getLineColor: [255, 255, 255, 150],
    getLineWidth: 0.5,
    lineWidthUnits: "pixels" as const,
    pickable: true,
    autoHighlight: true,
    highlightColor: [74, 127, 181, 80],
    updateTriggers: { getFillColor: [birthCountries] },
  });
}
