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
