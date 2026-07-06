import { STAGES, type StageKey } from "@/lib/bracket";

interface RoundSelectorProps {
  active: StageKey;
  onChange: (stage: StageKey) => void;
}

export function RoundSelector({ active, onChange }: RoundSelectorProps) {
  return (
    <div className="flex gap-0.5 rounded-[10px] bg-stone-100 p-[3px]">
      {STAGES.map((stage) => (
        <button
          key={stage.key}
          onClick={() => onChange(stage.key)}
          className={`flex-1 rounded-lg px-2 py-2 text-center text-xs font-medium transition-all ${
            active === stage.key
              ? "bg-white font-semibold text-stone-900 shadow-sm"
              : "text-stone-500 hover:text-stone-700"
          }`}
          aria-pressed={active === stage.key}
        >
          {stage.label}
        </button>
      ))}
    </div>
  );
}
