import type { Player, Summary } from "./types";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

let playersCache: Player[] | null = null;
let summaryCache: Summary | null = null;

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
