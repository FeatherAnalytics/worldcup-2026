import type { Player } from "@/lib/types";

interface PlayerCardProps {
  player: Player;
}

export function PlayerCard({ player }: PlayerCardProps) {
  return (
    <div className="rounded-lg border border-stone-200 p-3">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-stone-900">{player.name}</span>
        {player.is_foreign_born && (
          <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
            Foreign Born
          </span>
        )}
      </div>
      <div className="mt-1 text-xs text-stone-500">{player.position}</div>
      <div className="mt-2 space-y-1 text-xs text-stone-600">
        <div>
          Born: {player.birth_city}, {player.birth_country}
        </div>
        <div>Club: {player.club}</div>
        <div>
          {player.caps} caps &middot; {player.goals} goals
        </div>
      </div>
    </div>
  );
}
