import type { Player } from "@/lib/types";

interface TeamSummaryProps {
  team: string;
  players: Player[];
}

export function TeamSummary({ team, players }: TeamSummaryProps) {
  const foreignBorn = players.filter((p) => p.is_foreign_born).length;
  const uniqueBirthCountries = new Set(players.map((p) => p.birth_country)).size;

  return (
    <div className="rounded-lg border border-stone-200 p-3">
      <div className="mb-2 text-sm font-medium text-stone-900">{team}</div>
      <div className="flex gap-4 text-center">
        <div>
          <div className="text-lg font-semibold text-stone-900">{players.length}</div>
          <div className="text-xs text-stone-500">Players</div>
        </div>
        <div>
          <div className="text-lg font-semibold text-stone-900">{foreignBorn}</div>
          <div className="text-xs text-stone-500">Foreign</div>
        </div>
        <div>
          <div className="text-lg font-semibold text-stone-900">{uniqueBirthCountries}</div>
          <div className="text-xs text-stone-500">Origins</div>
        </div>
      </div>
    </div>
  );
}
