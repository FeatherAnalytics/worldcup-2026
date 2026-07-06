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
