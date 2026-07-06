export const CONFEDERATION_COLORS: Record<string, [number, number, number]> = {
  UEFA: [74, 127, 181],
  CAF: [232, 145, 58],
  CONMEBOL: [74, 155, 110],
  CONCACAF: [224, 99, 92],
  AFC: [59, 155, 143],
  OFC: [139, 107, 174],
};

export const CONFEDERATION_HEX: Record<string, string> = {
  UEFA: "#4A7FB5",
  CAF: "#E8913A",
  CONMEBOL: "#4A9B6E",
  CONCACAF: "#E0635C",
  AFC: "#3B9B8F",
  OFC: "#8B6BAE",
};

export const CHOROPLETH_SCALE: { max: number; color: [number, number, number] }[] = [
  { max: 0, color: [240, 240, 240] },
  { max: 5, color: [254, 240, 217] },
  { max: 15, color: [253, 204, 138] },
  { max: 35, color: [252, 141, 89] },
  { max: 65, color: [227, 74, 51] },
  { max: Infinity, color: [179, 0, 0] },
];

export function confederationColor(confederation: string): [number, number, number] {
  return CONFEDERATION_COLORS[confederation] ?? [160, 160, 160];
}

export function choroplethColor(count: number): [number, number, number] {
  for (const step of CHOROPLETH_SCALE) {
    if (count <= step.max) return step.color;
  }
  return CHOROPLETH_SCALE[CHOROPLETH_SCALE.length - 1].color;
}
