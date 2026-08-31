// Modern Health Analytics Design Palette
export const PALETTE = {
  blueDark: "#0B2265",
  bluePrimary: "#2563EB",
  blueLight: "#60A5FA",
  blueMuted: "#DBEAFE",
  teal: "#0D9488",
  emerald: "#059669",
  indigo: "#4F46E5",
  violet: "#7C3AED",
  purple: "#9333EA",
  amber: "#D97706",
  rose: "#E11D48",
  cyan: "#0891B2",
  slate: "#475569",
} as const;

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

// Group domain colors
export const GROUP_COLOR: Record<string, string> = {
  sleep: "#6366F1", // Indigo
  stress: "#8B5CF6", // Purple
  heart: "#EF4444", // Rose / Red
  fitness: "#3B82F6", // Blue
  breath: "#06B6D4", // Cyan
  body: "#F59E0B", // Amber
  readiness: "#10B981", // Emerald
  activity: "#2563EB", // Blue
  geo: "#0D9488", // Teal
};

// Sleep stages specific palette
export const SLEEP_STAGE_COLORS = {
  deep: "#312E81",   // Deep Indigo
  rem: "#7C3AED",    // Violet
  light: "#60A5FA",  // Sky Blue
  wake: "#F43F5E",   // Coral Red
};

// Activity zones palette
export const ACTIVITY_ZONE_COLORS = {
  sedentary: "#94A3B8", // Gray
  light: "#38BDF8",     // Sky
  fairly: "#3B82F6",    // Blue
  very: "#EA580C",      // Orange
  fatBurn: "#38BDF8",   // Light Blue
  cardio: "#2563EB",    // Royal Blue
  peak: "#DC2626",      // Red
};
