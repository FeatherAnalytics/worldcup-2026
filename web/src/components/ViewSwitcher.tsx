import type { ViewMode } from "@/lib/types";

const TABS: { key: ViewMode; label: string }[] = [
  { key: "diaspora", label: "Diaspora" },
  { key: "squad", label: "Squads" },
  { key: "factories", label: "Origins" },
  { key: "bracket", label: "Bracket" },
];

interface ViewSwitcherProps {
  active: ViewMode;
  onChange: (view: ViewMode) => void;
}

export function ViewSwitcher({ active, onChange }: ViewSwitcherProps) {
  return (
    <div className="flex gap-0.5 rounded-[10px] bg-stone-100 p-[3px]">
      {TABS.map((tab) => (
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
  );
}
