import type { Match, Player, Summary } from "./types";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

let playersCache: Player[] | null = null;
let summaryCache: Summary | null = null;
let matchesCache: Match[] | null = null;

export async function loadPlayers(): Promise<Player[]> {
  if (playersCache) return playersCache;
  const resp = await fetch(`${BASE}/data/players.json`);
  playersCache = (await resp.json()) as Player[];
  return playersCache;
}

export async function loadSummary(): Promise<Summary> {
  if (summaryCache) return summaryCache;
  const resp = await fetch(`${BASE}/data/summary.json`);
  summaryCache = (await resp.json()) as Summary;
  return summaryCache;
}

export async function loadMatches(): Promise<Match[]> {
  if (matchesCache) return matchesCache;
  const resp = await fetch(`${BASE}/data/matches.json`);
  matchesCache = (await resp.json()) as Match[];
  return matchesCache;
}

export function filterPlayers(
  players: Player[],
  filters: { team?: string; confederation?: string; birthCountry?: string }
): Player[] {
  return players.filter((p) => {
    if (filters.team && p.team_country !== filters.team) return false;
    if (filters.confederation && p.team_confederation !== filters.confederation) return false;
    if (filters.birthCountry && p.birth_country !== filters.birthCountry) return false;
    return true;
  });
}

export function uniqueTeams(players: Player[]): string[] {
  return [...new Set(players.map((p) => p.team_country))].sort();
}

export function uniqueConfederations(players: Player[]): string[] {
  return [...new Set(players.map((p) => p.team_confederation))].sort();
}

export function uniqueBirthCountries(players: Player[]): string[] {
  return [...new Set(players.filter((p) => p.birth_country).map((p) => p.birth_country))].sort();
}

export function uniqueClubs(
  players: Player[]
): { club: string; count: number; teams: number }[] {
  const map = new Map<string, { count: number; teams: Set<string> }>();
  for (const p of players) {
    if (!p.club) continue;
    const entry = map.get(p.club) ?? { count: 0, teams: new Set<string>() };
    entry.count++;
    entry.teams.add(p.team_country);
    map.set(p.club, entry);
  }
  return [...map.entries()]
    .map(([club, { count, teams }]) => ({ club, count, teams: teams.size }))
    .sort((a, b) => b.count - a.count);
}
