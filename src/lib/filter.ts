import type { HealthData, SeriesPoint, WorkoutLog, SleepStageLog, ActivityIntensityPoint, GeoPoint } from "./types";

export type Granularity = "all" | "year" | "month" | "week";
export type PresetRange = "all" | "7d" | "30d" | "90d" | "1y" | "custom";

export interface FilterState {
  preset: PresetRange;
  granularity: Granularity;
  year: string; // "all" or "YYYY"
  period: string; // "all" | "YYYY" | "YYYY-MM" | "YYYY-MM-DD"
}

function pad(n: number) {
  return n < 10 ? "0" + n : "" + n;
}

function weekStart(dateStr: string): string {
  const [y, m, d] = dateStr.slice(0, 10).split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const dow = dt.getUTCDay(); // 0 Sun .. 6 Sat
  const diff = (dow + 6) % 7; // days since Monday
  dt.setUTCDate(dt.getUTCDate() - diff);
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}

function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.slice(0, 10).split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}

export function buildOptions(data: HealthData) {
  const dayDates = new Set<string>();
  const months = new Set<string>();
  for (const d of Object.values(data.datasets)) for (const p of d.series) dayDates.add(p.date);
  for (const p of data.derived.elevationSeries) dayDates.add(p.date);
  for (const p of data.derived.geoPoints) dayDates.add(p.date);
  for (const p of data.derived.sleepSeries) dayDates.add(p.date);
  for (const p of data.derived.dailyStepsSeries) dayDates.add(p.date);
  for (const p of data.derived.azmSeries) months.add(p.month);
  for (const p of data.derived.stepsMonthly) months.add(p.month);
  for (const p of data.derived.caloriesMonthly) months.add(p.month);

  const years = new Set<string>();
  for (const d of dayDates) {
    years.add(d.slice(0, 4));
    months.add(d.slice(0, 7));
  }

  const weeks = new Set<string>();
  for (const d of dayDates) weeks.add(weekStart(d));

  const sortedDates = Array.from(dayDates).sort();
  const maxDate = sortedDates[sortedDates.length - 1] || "2026-02-20";

  return {
    years: Array.from(years).sort().reverse(),
    months: Array.from(months).sort().reverse(),
    weeks: Array.from(weeks).sort().reverse(),
    maxDate,
  };
}

export function getPresetCutoffDate(maxDate: string, preset: PresetRange): string | null {
  if (preset === "all" || preset === "custom") return null;
  const days = preset === "7d" ? 7 : preset === "30d" ? 30 : preset === "90d" ? 90 : 365;
  return addDays(maxDate, -days);
}

export function filterDaily<T extends { date: string }>(
  series: T[],
  f: FilterState,
  maxDate?: string
): T[] {
  if (!series || !series.length) return [];

  // 1. Preset Range filtering
  if (f.preset !== "all" && f.preset !== "custom") {
    const latestDate = maxDate || series[series.length - 1]?.date || "2026-02-20";
    const cutoff = getPresetCutoffDate(latestDate, f.preset);
    if (cutoff) return series.filter((p) => p.date >= cutoff && p.date <= latestDate);
  }

  // 2. Granularity / Custom Period filtering
  if (f.granularity === "all") return series;
  if (f.granularity === "year") return series.filter((p) => p.date.startsWith(f.period));
  if (f.granularity === "month") return series.filter((p) => p.date.startsWith(f.period));
  
  // week
  const end = addDays(f.period, 7);
  return series.filter((p) => p.date >= f.period && p.date < end);
}

export function filterMonthly<T extends { month: string }>(
  arr: T[],
  f: FilterState,
  maxDate?: string
): T[] {
  if (!arr || !arr.length) return [];

  if (f.preset !== "all" && f.preset !== "custom") {
    const latestDate = maxDate || "2026-02-20";
    const cutoff = getPresetCutoffDate(latestDate, f.preset);
    if (cutoff) {
      const cutMonth = cutoff.slice(0, 7);
      return arr.filter((p) => p.month >= cutMonth);
    }
  }

  if (f.granularity === "all") return arr;
  if (f.granularity === "year") return arr.filter((p) => p.month.startsWith(f.period));
  if (f.granularity === "month") return arr.filter((p) => p.month.startsWith(f.period));

  const wkMonth = f.period.slice(0, 7);
  return arr.filter((p) => p.month.startsWith(wkMonth));
}

export function filterWorkouts(workouts: WorkoutLog[], f: FilterState, maxDate?: string): WorkoutLog[] {
  return filterDaily(workouts, f, maxDate);
}

export function filterSleepStages(stages: SleepStageLog[], f: FilterState, maxDate?: string): SleepStageLog[] {
  return filterDaily(stages, f, maxDate);
}

export function filterIntensity(intensity: ActivityIntensityPoint[], f: FilterState, maxDate?: string): ActivityIntensityPoint[] {
  return filterDaily(intensity, f, maxDate);
}

export function filterGeo(geo: GeoPoint[], f: FilterState, maxDate?: string): GeoPoint[] {
  return filterDaily(geo, f, maxDate);
}

export function summarize(series: SeriesPoint[]) {
  if (!series || !series.length) return null;
  const vals = series.map((s) => s.value);
  const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
  const first = series[0];
  const last = series[series.length - 1];
  const trendPct =
    first.value !== 0 ? ((last.value - first.value) / Math.abs(first.value)) * 100 : 0;
  return {
    count: series.length,
    avg: +avg.toFixed(2),
    min: +Math.min(...vals).toFixed(2),
    max: +Math.max(...vals).toFixed(2),
    latest: +last.value.toFixed(2),
    firstDate: first.date,
    lastDate: last.date,
    trendPct: +trendPct.toFixed(1),
  };
}

export function periodLabel(f: FilterState): string {
  if (f.preset === "7d") return "Last 7 Days";
  if (f.preset === "30d") return "Last 30 Days";
  if (f.preset === "90d") return "Last 90 Days";
  if (f.preset === "1y") return "Last 1 Year";
  if (f.granularity === "all") return "All Time";
  if (f.granularity === "year") return `Year ${f.period}`;
  if (f.granularity === "month") return `Month ${f.period}`;
  return `Week of ${f.period}`;
}
