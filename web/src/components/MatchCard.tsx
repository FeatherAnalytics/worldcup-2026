import type { Match } from "@/lib/types";

interface MatchCardProps {
  match: Match;
  onTeamClick: (team: string) => void;
  selectedTeam: string | null;
}

function TeamRow({
  team,
  score,
  isWinner,
  isSelected,
  penalties,
  onTeamClick,
}: {
  team: string;
  score: number | null;
  isWinner: boolean;
  isSelected: boolean;
  penalties: number | undefined;
  onTeamClick: (team: string) => void;
}) {
  return (
    <div
      className={`flex items-center justify-between px-3 py-1.5 ${
        isWinner ? "border-l-[3px] border-l-[#4A7FB5]" : "border-l-[3px] border-l-transparent"
      }`}
    >
      <button
        onClick={() => onTeamClick(team)}
        className={`text-sm text-left truncate ${
          isWinner ? "font-semibold text-stone-900" : "text-stone-600"
        } ${isSelected ? "text-[#4A7FB5]" : ""} hover:underline`}
      >
        {team}
      </button>
      {score !== null ? (
        <span className="font-mono text-sm text-stone-700 ml-2 shrink-0">
          {score}
          {penalties !== undefined && (
            <span className="text-[10px] text-stone-400 ml-1">
              (pen. {penalties})
            </span>
          )}
        </span>
      ) : null}
    </div>
  );
}

export function MatchCard({ match, onTeamClick, selectedTeam }: MatchCardProps) {
  const hasScore = match.score_a !== null && match.score_b !== null;

  return (
    <div className="rounded-lg border border-stone-200 bg-white">
      {hasScore ? (
        <>
          <TeamRow
            team={match.team_a}
            score={match.score_a}
            isWinner={match.winner === match.team_a}
            isSelected={match.team_a === selectedTeam}
            penalties={match.penalties_a}
            onTeamClick={onTeamClick}
          />
          <div className="border-t border-stone-100" />
          <TeamRow
            team={match.team_b}
            score={match.score_b}
            isWinner={match.winner === match.team_b}
            isSelected={match.team_b === selectedTeam}
            penalties={match.penalties_b}
            onTeamClick={onTeamClick}
          />
        </>
      ) : (
        <div className="flex items-center justify-between px-3 py-1.5">
          <button
            onClick={() => onTeamClick(match.team_a)}
            className={`text-sm truncate hover:underline ${
              match.team_a === selectedTeam ? "text-[#4A7FB5] font-semibold" : "text-stone-700"
            }`}
          >
            {match.team_a}
          </button>
          <span className="text-xs text-stone-400 mx-2">vs</span>
          <button
            onClick={() => onTeamClick(match.team_b)}
            className={`text-sm truncate hover:underline ${
              match.team_b === selectedTeam ? "text-[#4A7FB5] font-semibold" : "text-stone-700"
            }`}
          >
            {match.team_b}
          </button>
        </div>
      )}
    </div>
  );
}
