import type { ViewMode, Player, Summary } from "@/lib/types";
import { ViewSwitcher } from "./ViewSwitcher";

interface SidePanelProps {
  activeView: ViewMode;
  onViewChange: (v: ViewMode) => void;
  players: Player[];
  summary: Summary | null;
  children?: React.ReactNode;
}

function StatItem({ value, label, accent }: { value: string | number; label: string; accent?: boolean }) {
  return (
    <div className="flex-1 text-center py-3">
      <div className={`font-mono text-2xl font-semibold leading-none ${accent ? "text-[#4A7FB5]" : "text-stone-900"}`}>
        {typeof value === "number" ? value.toLocaleString() : value}
      </div>
      <div className="mt-1 text-[10px] font-medium uppercase tracking-wider text-stone-400">
        {label}
      </div>
    </div>
  );
}

export function SidePanel({ activeView, onViewChange, summary, children }: SidePanelProps) {
  return (
    <aside className="flex w-80 flex-col overflow-y-auto border-r border-stone-200 bg-white max-lg:hidden">
      <div className="px-5 pt-4 pb-3">
        <ViewSwitcher active={activeView} onChange={onViewChange} />
      </div>

      <div className="border-t border-stone-100" />

      {summary && (
        <div className="flex items-center px-2">
          <StatItem value={summary.total_players} label="Players" />
          <div className="h-8 w-px bg-stone-200" />
          <StatItem value={summary.foreign_born_count} label="Foreign-born" accent />
          <div className="h-8 w-px bg-stone-200" />
          <StatItem value={summary.total_teams} label="Teams" />
        </div>
      )}

      <div className="border-t border-stone-100" />

      <div className="flex-1 space-y-0 overflow-y-auto">
        <div className="px-5 py-4">
          {children}
        </div>
      </div>
    </aside>
  );
}
