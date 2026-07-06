import { CHOROPLETH_SCALE } from "@/lib/colors";

const LABELS = ["0", "1–5", "6–15", "16–35", "36–65", "66+"];

function rgbToHex([r, g, b]: [number, number, number]): string {
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

export function ColorLegend() {
  return (
    <div className="flex flex-col gap-1">
      <div className="text-xs font-medium text-stone-500">Players born per country</div>
      <div className="flex">
        {CHOROPLETH_SCALE.map((step, i) => (
          <div key={i} className="flex-1">
            <div className="h-3 rounded-sm" style={{ backgroundColor: rgbToHex(step.color) }} />
            <div className="mt-0.5 text-center text-[10px] text-stone-400">{LABELS[i]}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
