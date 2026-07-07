import { describe, expect, it } from "vitest";
import { uniqueClubs } from "@/lib/data";
import type { Player } from "@/lib/types";

const makePlayer = (overrides: Partial<Player>): Player => ({
  name: "Test",
  team_country: "England",
  team_confederation: "UEFA",
  position: "Forward",
  club: "Test FC",
  club_country: "England",
  birth_date: "2000-01-01",
  birth_city: "London",
  birth_country: "England",
  birth_lat: 51.5,
  birth_lon: -0.1,
  club_lat: null,
  club_lon: null,
  caps: 10,
  goals: 5,
  is_foreign_born: false,
  birth_country_known: true,
  ...overrides,
});

describe("uniqueClubs", () => {
  it("groups players by club and counts teams", () => {
    const players = [
      makePlayer({ name: "A", club: "Man City", team_country: "England" }),
      makePlayer({ name: "B", club: "Man City", team_country: "Belgium" }),
      makePlayer({ name: "C", club: "Arsenal", team_country: "England" }),
    ];
    const result = uniqueClubs(players);
    expect(result[0]).toEqual({ club: "Man City", count: 2, teams: 2 });
    expect(result[1]).toEqual({ club: "Arsenal", count: 1, teams: 1 });
  });

  it("sorts by player count descending", () => {
    const players = [
      makePlayer({ club: "Small FC" }),
      makePlayer({ club: "Big FC" }),
      makePlayer({ club: "Big FC" }),
      makePlayer({ club: "Big FC" }),
    ];
    const result = uniqueClubs(players);
    expect(result[0].club).toBe("Big FC");
    expect(result[1].club).toBe("Small FC");
  });

  it("excludes empty club names", () => {
    const players = [
      makePlayer({ club: "" }),
      makePlayer({ club: "Real FC" }),
    ];
    const result = uniqueClubs(players);
    expect(result).toHaveLength(1);
    expect(result[0].club).toBe("Real FC");
  });
});
