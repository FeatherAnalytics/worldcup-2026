interface TeamSelectorProps {
  teams: string[];
  selected: string;
  onChange: (team: string) => void;
}

export function TeamSelector({ teams, selected, onChange }: TeamSelectorProps) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor="team-select" className="text-xs font-medium text-stone-500">
        Select Team
      </label>
      <select
        id="team-select"
        value={selected}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-900 outline-none focus:border-stone-400"
      >
        {teams.map((team) => (
          <option key={team} value={team}>
            {team}
          </option>
        ))}
      </select>
    </div>
  );
}
