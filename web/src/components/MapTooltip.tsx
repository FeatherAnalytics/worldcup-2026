export interface MapTooltipProps {
  x: number;
  y: number;
  children: React.ReactNode;
}

export function MapTooltip({ x, y, children }: MapTooltipProps) {
  return (
    <div
      className="animate-tooltip pointer-events-none absolute z-50 rounded-lg bg-white/92 px-3 py-2 text-sm shadow-lg backdrop-blur-sm"
      style={{ left: x + 12, top: y - 12 }}
    >
      {children}
    </div>
  );
}
