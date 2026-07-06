import type { Match, Player } from "@/lib/types";
import { type StageKey, matchesForStage, computeGroupStandings, type GroupStanding } from "@/lib/bracket";
import { RoundSelector } from "./RoundSelector";
import { MatchCard } from "./MatchCard";

interface BracketPanelProps {
  matches: Match[];
  selectedStage: StageKey;
  onStageChange: (stage: StageKey) => void;
  selectedTeam: string | null;
  onTeamClick: (team: string) => void;
  teamPlayers: Player[];
}

function StandingsTable({ group, standings, selectedTeam, onTeamClick }: {
  group: string;
  standings: GroupStanding[];
  selectedTeam: string | null;
  onTeamClick: (team: string) => void;
}) {
  return (
    <div className="mb-3">
      <h3 className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-stone-400">
        {group}
      </h3>
      <table className="w-full text-xs">
        <thead>
          <tr className="text-[10px] text-stone-400">
            <th className="pb-0.5 text-left font-medium">Team</th>
            <th className="pb-0.5 w-6 text-center font-medium">W</th>
            <th className="pb-0.5 w-6 text-center font-medium">D</th>
            <th className="pb-0.5 w-6 text-center font-medium">L</th>
            <th className="pb-0.5 w-8 text-center font-medium">GD</th>
            <th className="pb-0.5 w-7 text-right font-medium">Pts</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((s, i) => (
            <tr
              key={s.team}
              className={`cursor-pointer border-t border-stone-100 transition-colors hover:bg-stone-50 ${
                selectedTeam === s.team ? "bg-stone-100 font-medium" : ""
              }`}
              onClick={() => onTeamClick(s.team)}
            >
              <td className={`py-1 pr-1 ${i < 2 ? "text-stone-900" : "text-stone-500"}`}>
                {s.team}
              </td>
              <td className="py-1 text-center text-stone-600">{s.won}</td>
              <td className="py-1 text-center text-stone-600">{s.drawn}</td>
              <td className="py-1 text-center text-stone-600">{s.lost}</td>
              <td className="py-1 text-center text-stone-600">
                {s.gd > 0 ? `+${s.gd}` : s.gd}
              </td>
              <td className="py-1 text-right font-mono font-semibold text-stone-900">{s.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function BracketPanel({
  matches,
  selectedStage,
  onStageChange,
  selectedTeam,
  onTeamClick,
  teamPlayers,
}: BracketPanelProps) {
  const stageMatches = matchesForStage(matches, selectedStage);
  const foreignBornCount = teamPlayers.filter((p) => p.is_foreign_born).length;

  const groupStandings = selectedStage === "group" ? computeGroupStandings(matches) : null;

  return (
    <div className="flex flex-col gap-4">
      <RoundSelector active={selectedStage} onChange={onStageChange} />

      <div className="flex flex-col gap-2 overflow-y-auto">
        {selectedStage === "group" && groupStandings ? (
          <>
            {[...groupStandings.entries()]
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([group, standings]) => (
                <StandingsTable
                  key={group}
                  group={group}
                  standings={standings}
                  selectedTeam={selectedTeam}
                  onTeamClick={onTeamClick}
                />
              ))}
          </>
        ) : (
          <div className="flex flex-col gap-1.5">
            {stageMatches.map((m, i) => (
              <MatchCard
                key={`${m.team_a}-${m.team_b}-${i}`}
                match={m}
                onTeamClick={onTeamClick}
                selectedTeam={selectedTeam}
              />
            ))}
          </div>
        )}

        {stageMatches.length === 0 && selectedStage !== "group" && (
          <p className="py-6 text-center text-xs text-stone-400">
            No matches for this round yet.
          </p>
        )}
      </div>

      {selectedTeam && teamPlayers.length > 0 && (
        <>
          <div className="border-t border-stone-100" />
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-stone-900">{selectedTeam}</h3>
              <button
                onClick={() => onTeamClick(selectedTeam)}
                className="text-[10px] text-[#4A7FB5] hover:underline"
              >
                Deselect
              </button>
            </div>
            <div className="mb-2 mt-1 flex gap-4 text-[10px] font-medium uppercase tracking-wider text-stone-400">
              <span>{teamPlayers.length} players</span>
              <span>{foreignBornCount} foreign-born</span>
            </div>
            <div className="flex max-h-48 flex-col gap-0.5 overflow-y-auto">
              {teamPlayers.map((p) => (
                <div
                  key={p.name}
                  className="flex items-center justify-between py-0.5 text-xs text-stone-600"
                >
                  <span className="truncate">{p.name}</span>
                  <span className="ml-2 shrink-0 text-stone-400">{p.position}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
