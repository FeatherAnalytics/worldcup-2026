import type { Player } from "@/lib/types";

const POSITION_ORDER: Record<string, number> = {
  Goalkeeper: 0,
  Defender: 1,
  Midfielder: 2,
  Forward: 3,
};

const POSITION_ABBR: Record<string, string> = {
  Goalkeeper: "GK",
  Defender: "DEF",
  Midfielder: "MID",
  Forward: "FWD",
};

interface ClubDetailProps {
  club: string;
  players: Player[];
}

export function ClubDetail({ club, players }: ClubDetailProps) {
  const teams = new Set(players.map((p) => p.team_country));

  const grouped = new Map<string, Player[]>();
  for (const p of players) {
    const list = grouped.get(p.team_country) ?? [];
    list.push(p);
    grouped.set(p.team_country, list);
  }
  for (const list of grouped.values()) {
    list.sort((a, b) => (POSITION_ORDER[a.position] ?? 9) - (POSITION_ORDER[b.position] ?? 9));
  }
  const sortedTeams = [...grouped.entries()].sort((a, b) => a[0].localeCompare(b[0]));

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-r-lg border-l-[3px] border-[#4A7FB5] bg-stone-50 px-3.5 py-3">
        <p className="font-display text-sm italic text-stone-600 leading-relaxed">
          <span className="not-italic font-bold text-stone-900">{club}</span> sends{" "}
          <span className="not-italic font-bold text-stone-900">{players.length}</span>{" "}
          {players.length === 1 ? "player" : "players"} to{" "}
          <span className="not-italic font-bold text-stone-900">{teams.size}</span>{" "}
          {teams.size === 1 ? "national team" : "national teams"}
        </p>
      </div>

      <div>
        <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-stone-400">
          Players by National Team
        </div>
        <div className="flex flex-col gap-3">
          {sortedTeams.map(([team, teamPlayers]) => (
            <div key={team}>
              <div className="mb-1 flex items-center gap-1.5 text-[12px] font-semibold text-stone-900">
                {team}
                <span className="text-[10px] font-normal text-stone-400">
                  ({teamPlayers.length})
                </span>
              </div>
              <div className="flex flex-col gap-0.5 pl-1">
                {teamPlayers.map((p) => (
                  <div
                    key={p.name}
                    className="flex items-center justify-between py-0.5 text-[11px]"
                  >
                    <span className="text-stone-600">{p.name}</span>
                    <span className="text-[10px] text-stone-400">
                      {POSITION_ABBR[p.position] ?? p.position}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
