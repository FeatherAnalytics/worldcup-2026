import type { Match } from "./types";

export const STAGES = [
  { key: "group", label: "Group" },
  { key: "r32", label: "R32" },
  { key: "r16", label: "R16" },
  { key: "qf", label: "QF" },
  { key: "sf", label: "SF" },
  { key: "final", label: "Final" },
] as const;

export type StageKey = (typeof STAGES)[number]["key"];

const ROUND_TO_STAGE: Record<string, StageKey> = {
  "Group A": "group", "Group B": "group", "Group C": "group", "Group D": "group",
  "Group E": "group", "Group F": "group", "Group G": "group", "Group H": "group",
  "Group I": "group", "Group J": "group", "Group K": "group", "Group L": "group",
  "Round of 32": "r32",
  "Round of 16": "r16",
  "Quarter-finals": "qf",
  "Semi-finals": "sf",
  "Final": "final",
};

export function getStage(match: Match): StageKey {
  return ROUND_TO_STAGE[match.round] ?? "group";
}

export function stageIndex(key: StageKey): number {
  return STAGES.findIndex((s) => s.key === key);
}

export function matchesForStage(matches: Match[], stage: StageKey): Match[] {
  return matches.filter((m) => getStage(m) === stage);
}

export function participatingTeams(matches: Match[], stage: StageKey): Set<string> {
  if (stage === "group") {
    const teams = new Set<string>();
    for (const m of matches) {
      teams.add(m.team_a);
      teams.add(m.team_b);
    }
    return teams;
  }

  const stageMatches = matchesForStage(matches, stage);
  const teams = new Set<string>();
  for (const m of stageMatches) {
    teams.add(m.team_a);
    teams.add(m.team_b);
  }
  return teams;
}

export interface GroupStanding {
  team: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  gd: number;
  points: number;
}

export function computeGroupStandings(matches: Match[]): Map<string, GroupStanding[]> {
  const groups = new Map<string, Map<string, GroupStanding>>();

  const groupMatches = matches.filter((m) => m.stage === "group");
  for (const m of groupMatches) {
    if (m.score_a === null || m.score_b === null) continue;
    const groupName = m.round;
    if (!groups.has(groupName)) groups.set(groupName, new Map());
    const table = groups.get(groupName)!;

    for (const team of [m.team_a, m.team_b]) {
      if (!table.has(team)) {
        table.set(team, { team, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0 });
      }
    }

    const a = table.get(m.team_a)!;
    const b = table.get(m.team_b)!;
    a.played++;
    b.played++;
    a.gf += m.score_a;
    a.ga += m.score_b;
    b.gf += m.score_b;
    b.ga += m.score_a;
    a.gd = a.gf - a.ga;
    b.gd = b.gf - b.ga;

    if (m.score_a > m.score_b) {
      a.won++;
      a.points += 3;
      b.lost++;
    } else if (m.score_b > m.score_a) {
      b.won++;
      b.points += 3;
      a.lost++;
    } else {
      a.drawn++;
      b.drawn++;
      a.points += 1;
      b.points += 1;
    }
  }

  const result = new Map<string, GroupStanding[]>();
  for (const [groupName, table] of groups) {
    const sorted = [...table.values()].sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.gd !== a.gd) return b.gd - a.gd;
      return b.gf - a.gf;
    });
    result.set(groupName, sorted);
  }
  return result;
}
