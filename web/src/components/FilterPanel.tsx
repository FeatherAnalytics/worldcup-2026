import { CONFEDERATION_HEX } from "@/lib/colors";

interface FilterPanelProps {
  confederations: string[];
  teams: string[];
  birthCountries: string[];
  selectedConfederation: string;
  selectedTeam: string;
  selectedBirthCountry: string;
  onConfederationChange: (c: string) => void;
  onTeamChange: (t: string) => void;
  onBirthCountryChange: (c: string) => void;
  onClear: () => void;
}

function FilterSelect({
  label,
  placeholder,
  options,
  value,
  onChange,
}: {
  label: string;
  placeholder: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-stone-400">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 pr-8 text-[13px] text-stone-700 outline-none transition-colors focus:border-[#4A7FB5] focus:ring-1 focus:ring-[#4A7FB5]/10"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23A8A29E' stroke-width='2' stroke-linecap='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
          backgroundRepeat: "no-repeat",
          backgroundPosition: "right 10px center",
        }}
      >
        <option value="">{placeholder}</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    </div>
  );
}

function ConfederationChips({
  confederations,
  selected,
  onChange,
}: {
  confederations: string[];
  selected: string;
  onChange: (c: string) => void;
}) {
  return (
    <div>
      <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-stone-400">
        Confederation
      </div>
      <div className="flex flex-wrap gap-1.5">
        {confederations.map((conf) => {
          const isActive = selected === conf;
          const hex = CONFEDERATION_HEX[conf] ?? "#a0a0a0";
          return (
            <button
              key={conf}
              onClick={() => onChange(isActive ? "" : conf)}
              className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-all ${
                isActive
                  ? "border-stone-400 bg-stone-100 text-stone-900"
                  : "border-stone-200 bg-white text-stone-500 hover:border-stone-300 hover:bg-stone-50"
              }`}
            >
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ backgroundColor: hex }}
              />
              {conf}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function FilterPanel({
  confederations,
  teams,
  birthCountries,
  selectedConfederation,
  selectedTeam,
  selectedBirthCountry,
  onConfederationChange,
  onTeamChange,
  onBirthCountryChange,
  onClear,
}: FilterPanelProps) {
  const hasFilter = selectedConfederation || selectedTeam || selectedBirthCountry;

  return (
    <div className="flex flex-col gap-4">
      <ConfederationChips
        confederations={confederations}
        selected={selectedConfederation}
        onChange={onConfederationChange}
      />
      <FilterSelect label="Team" placeholder="All teams" options={teams} value={selectedTeam} onChange={onTeamChange} />
      <FilterSelect label="Birth Country" placeholder="All countries" options={birthCountries} value={selectedBirthCountry} onChange={onBirthCountryChange} />
      {hasFilter && (
        <button
          onClick={onClear}
          className="self-start text-xs text-[#4A7FB5] hover:underline"
        >
          Clear all filters
        </button>
      )}
    </div>
  );
}
