import { describe, expect, it } from "vitest";
import { computeCentroids } from "@/lib/geo";
import type { FeatureCollection } from "geojson";

const mockGeoJSON: FeatureCollection = {
  type: "FeatureCollection",
  features: [{
    type: "Feature",
    properties: { NAME: "Testland" },
    geometry: {
      type: "Polygon",
      coordinates: [[[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]],
    },
  }],
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
