// Categorical series colors
export const HEALTH_COLORS = [
  "#2563EB", // Electric Blue (Primary)
  "#0D9488", // Teal / Recovery
  "#7C3AED", // Violet / Sleep
  "#059669", // Emerald / Active
  "#EA580C", // Amber Orange / Cardio
  "#E11D48", // Crimson Rose / Peak / Heart
  "#0891B2", // Cyan / SpO2
  "#D97706", // Gold / Milestones
  "#4F46E5", // Indigo / Deep Sleep
  "#EC4899", // Pink / Mind
  "#64748B", // Slate
];

export function colorFor(index: number): string {
  return HEALTH_COLORS[index % HEALTH_COLORS.length];
}
