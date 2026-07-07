import type { ViewMode } from "@/lib/types";

const GROUPS: { label: string; tabs: { key: ViewMode; label: string }[] }[] = [
  {
    label: "Players",
    tabs: [
      { key: "diaspora", label: "Diaspora" },
      { key: "squad", label: "Squads" },
      { key: "clubs", label: "Clubs" },
    ],
  },
  {
    label: "Tournament",
    tabs: [
      { key: "factories", label: "Origins" },
      { key: "bracket", label: "Bracket" },
    ],
  },
];

interface ViewSwitcherProps {
  active: ViewMode;
  onChange: (view: ViewMode) => void;
}

export function ViewSwitcher({ active, onChange }: ViewSwitcherProps) {
  return (
    <div className="flex flex-col gap-2.5">
      {GROUPS.map((group) => (
        <div key={group.label}>
          <div className="mb-1.5 text-[9px] font-bold uppercase tracking-[1.5px] text-stone-400">
            {group.label}
          </div>
          <div className="flex gap-0.5 rounded-[10px] bg-stone-100 p-[3px]">
            {group.tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => onChange(tab.key)}
                className={`flex-1 rounded-lg px-3 py-2 text-center text-xs font-medium transition-all ${
                  active === tab.key
                    ? "bg-white font-semibold text-stone-900 shadow-sm"
                    : "text-stone-500 hover:text-stone-700"
                }`}
                aria-pressed={active === tab.key}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
