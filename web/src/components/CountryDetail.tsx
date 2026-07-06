import type { Player } from "@/lib/types";
import { CONFEDERATION_HEX } from "@/lib/colors";

interface CountryDetailProps {
  country: string;
  players: Player[];
  onClose: () => void;
}

export function CountryDetail({ country, players, onClose }: CountryDetailProps) {
  const byTeam = new Map<string, Player[]>();
  for (const p of players) {
    const list = byTeam.get(p.team_country) ?? [];
    list.push(p);
    byTeam.set(p.team_country, list);
  }
  const sorted = [...byTeam.entries()].sort((a, b) => b[1].length - a[1].length);

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-stone-900">{country}</h3>
          <p className="text-xs text-stone-500">
            {players.length} player{players.length !== 1 ? "s" : ""} born here, representing{" "}
            {byTeam.size} team{byTeam.size !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={onClose}
          className="rounded-md px-2 py-1 text-xs text-stone-400 hover:bg-stone-100 hover:text-stone-600"
          aria-label="Close country detail"
        >
          &times;
        </button>
      </div>

      <div className="max-h-64 space-y-2 overflow-y-auto">
        {sorted.map(([team, teamPlayers]) => (
          <div key={team} className="rounded-lg bg-stone-50 p-2">
            <div className="mb-1 flex items-center gap-2">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{
                  backgroundColor:
                    CONFEDERATION_HEX[teamPlayers[0]?.team_confederation] ?? "#a0a0a0",
                }}
              />
              <span className="text-sm font-medium text-stone-800">
                {team}
              </span>
              <span className="text-xs text-stone-400">
                ({teamPlayers.length})
              </span>
            </div>
            <div className="space-y-0.5">
              {teamPlayers.map((p) => (
                <div key={p.name} className="flex justify-between text-xs text-stone-600">
                  <span>{p.name}</span>
                  <span className="text-stone-400">{p.position}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
