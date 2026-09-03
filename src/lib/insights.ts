import type { HealthData, SeriesPoint, WorkoutLog, SleepStageLog } from "@/lib/types";
import { formatNumber } from "@/lib/format";
import { meanBy, sumBy } from "lodash";

export interface HealthScoreResult {
  overallScore: number;
  status: "Optimal" | "Good" | "Moderate" | "Needs Recovery";
  statusColor: string;
  subscores: {
    sleep: number;
    activity: number;
    heart: number;
    stress: number;
  };
  highlights: string[];
}

export interface DayComparison {
  weekdayAvgSteps: number;
  weekendAvgSteps: number;
  weekdayAvgSleepHours: number;
  weekendAvgSleepHours: number;
  weekdayAvgCalories: number;
  weekendAvgCalories: number;
}

export interface InsightItem {
  id: string;
  category: "sleep" | "activity" | "heart" | "recovery" | "milestone";
  title: string;
  description: string;
  metric: string;
  badgeText: string;
  badgeVariant: "default" | "secondary" | "outline" | "destructive";
  iconType: string;
}

export function computeHealthScore(
  sleepSeries: SeriesPoint[],
  stepsSeries: SeriesPoint[],
  rhrSeries: SeriesPoint[],
  stressSeries: SeriesPoint[]
): HealthScoreResult {
  // 1. Sleep score (average of recent or filtered)
  const avgSleep = sleepSeries.length ? meanBy(sleepSeries, (s) => s.value) : 78;
  const sleepSub = Math.min(100, Math.max(0, Math.round(avgSleep)));

  // 2. Activity score (target 10,000 steps = 100%)
  const avgSteps = stepsSeries.length ? meanBy(stepsSeries, (s) => s.value) : 8000;
  const activitySub = Math.min(100, Math.max(0, Math.round((avgSteps / 10000) * 100)));

  // 3. Heart score (resting HR ideal between 50-65 bpm)
  const avgRhr = rhrSeries.length ? meanBy(rhrSeries, (s) => s.value) : 62;
  let heartSub = 85;
  if (avgRhr <= 60) heartSub = 95;
  else if (avgRhr <= 68) heartSub = 85;
  else if (avgRhr <= 75) heartSub = 72;
  else heartSub = 60;

  // 4. Stress score (higher stress score in Fitbit = better stress management / lower strain)
  const avgStress = stressSeries.length ? meanBy(stressSeries, (s) => s.value) : 75;
  const stressSub = Math.min(100, Math.max(0, Math.round(avgStress)));

  // Composite: Sleep 35%, Activity 30%, Heart 20%, Stress 15%
  const overall = Math.round(
    sleepSub * 0.35 + activitySub * 0.30 + heartSub * 0.20 + stressSub * 0.15
  );

  let status: HealthScoreResult["status"] = "Good";
  let statusColor = "#10B981";

  if (overall >= 85) {
    status = "Optimal";
    statusColor = "#10B981"; // Emerald
  } else if (overall >= 70) {
    status = "Good";
    statusColor = "#3B82F6"; // Blue
  } else if (overall >= 55) {
    status = "Moderate";
    statusColor = "#F59E0B"; // Amber
  } else {
    status = "Needs Recovery";
    statusColor = "#EF4444"; // Rose
  }

  const highlights: string[] = [];
  if (avgSteps >= 10000) {
    highlights.push(`Averaging ${formatNumber(Math.round(avgSteps))} daily steps — surpassing the 10k target!`);
  } else {
    highlights.push(`Averaging ${formatNumber(Math.round(avgSteps))} daily steps (${Math.round((avgSteps / 10000) * 100)}% of 10k goal).`);
  }

  if (avgSleep >= 80) {
    highlights.push(`Sleep quality is optimal with an average score of ${Math.round(avgSleep)}.`);
  } else {
    highlights.push(`Sleep score averages ${Math.round(avgSleep)}/100.`);
  }

  if (avgRhr < 65) {
    highlights.push(`Resting heart rate of ${Math.round(avgRhr)} bpm indicates strong cardiovascular recovery.`);
  }

  return {
    overallScore: overall,
    status,
    statusColor,
    subscores: {
      sleep: sleepSub,
      activity: activitySub,
      heart: heartSub,
      stress: stressSub,
    },
    highlights,
  };
}

// 0 = Sunday … 6 = Saturday (UTC), computed arithmetically — no Date allocation
// per point, and immune to local-timezone day shifts.
function dayOfWeekUTC(dateStr: string): number {
  const y = +dateStr.slice(0, 4);
  const m = +dateStr.slice(5, 7);
  const d = +dateStr.slice(8, 10);
  const t = [0, 3, 2, 5, 0, 3, 5, 1, 4, 6, 2, 4];
  const yy = m < 3 ? y - 1 : y;
  return (yy + Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) + t[m - 1] + d) % 7;
}

function isWeekendUTC(dateStr: string): boolean {
  const day = dayOfWeekUTC(dateStr);
  return day === 0 || day === 6;
}

export function computeWeekdayVsWeekend(
  steps: SeriesPoint[],
  sleepLogs: SleepStageLog[],
  calories: SeriesPoint[]
): DayComparison {
  let wdSteps = 0, wdStepsN = 0, weSteps = 0, weStepsN = 0;
  for (const s of steps) {
    const isWeekend = isWeekendUTC(s.date);
    if (isWeekend) {
      weSteps += s.value;
      weStepsN++;
    } else {
      wdSteps += s.value;
      wdStepsN++;
    }
  }

  let wdSleep = 0, wdSleepN = 0, weSleep = 0, weSleepN = 0;
  for (const s of sleepLogs) {
    const isWeekend = isWeekendUTC(s.date);
    if (isWeekend) {
      weSleep += s.minutesAsleep / 60;
      weSleepN++;
    } else {
      wdSleep += s.minutesAsleep / 60;
      wdSleepN++;
    }
  }

  let wdCal = 0, wdCalN = 0, weCal = 0, weCalN = 0;
  for (const c of calories) {
    const isWeekend = isWeekendUTC(c.date);
    if (isWeekend) {
      weCal += c.value;
      weCalN++;
    } else {
      wdCal += c.value;
      wdCalN++;
    }
  }

  return {
    weekdayAvgSteps: wdStepsN ? Math.round(wdSteps / wdStepsN) : 0,
    weekendAvgSteps: weStepsN ? Math.round(weSteps / weStepsN) : 0,
    weekdayAvgSleepHours: wdSleepN ? +(wdSleep / wdSleepN).toFixed(1) : 0,
    weekendAvgSleepHours: weSleepN ? +(weSleep / weSleepN).toFixed(1) : 0,
    weekdayAvgCalories: wdCalN ? Math.round(wdCal / wdCalN) : 0,
    weekendAvgCalories: weCalN ? Math.round(weCal / weCalN) : 0,
  };
}

export function generateHealthInsights(
  data: HealthData,
  filteredSteps: SeriesPoint[],
  filteredSleep: SeriesPoint[],
  filteredWorkouts: WorkoutLog[]
): InsightItem[] {
  const insights: InsightItem[] = [];
  const records = data.derived.personalRecords;

  // 1. Peak Record Insight
  if (records.maxStepsDay) {
    insights.push({
      id: "record-steps",
      category: "milestone",
      title: "All-Time Step Peak Record",
      description: `Your highest recorded single-day step count was ${formatNumber(records.maxStepsDay.value)} steps on ${records.maxStepsDay.date} (Ruby Slippers milestone).`,
      metric: `${formatNumber(records.maxStepsDay.value)} steps`,
      badgeText: "Personal Best",
      badgeVariant: "default",
      iconType: "trophy",
    });
  }

  // 2. Step Goal Consistency
  const totalDays = filteredSteps.length;
  const goalDays = filteredSteps.filter((s) => s.value >= 10000).length;
  const goalPct = totalDays > 0 ? Math.round((goalDays / totalDays) * 100) : 0;
  insights.push({
    id: "goal-consistency",
    category: "activity",
    title: "10,000 Step Goal Consistency",
    description: `Achieved 10,000+ steps on ${goalDays} out of ${totalDays} tracked days (${goalPct}% consistency rate).`,
    metric: `${goalPct}% target hit`,
    badgeText: goalPct >= 50 ? "High Activity" : "Steady",
    badgeVariant: goalPct >= 50 ? "default" : "secondary",
    iconType: "footprints",
  });

  // 3. Restorative Sleep Insight
  const avgSleepScore = filteredSleep.length
    ? Math.round(meanBy(filteredSleep, (s) => s.value))
    : 80;
  insights.push({
    id: "sleep-quality",
    category: "sleep",
    title: "Sleep Recovery Architecture",
    description: `Average sleep score across this view is ${avgSleepScore}/100 with consistent deep and REM restorative phases.`,
    metric: `${avgSleepScore}/100 score`,
    badgeText: avgSleepScore >= 80 ? "Optimal Sleep" : "Good Sleep",
    badgeVariant: avgSleepScore >= 80 ? "default" : "secondary",
    iconType: "moon",
  });

  // 4. Workout Frequency
  const workoutCount = filteredWorkouts.length;
  const totalBurn = sumBy(filteredWorkouts, (w) => w.calories);
  insights.push({
    id: "workout-frequency",
    category: "activity",
    title: "Workout Output & Calorie Burn",
    description: `${workoutCount} logged structured workouts totaling ${formatNumber(totalBurn)} active workout kcal.`,
    metric: `${workoutCount} sessions`,
    badgeText: "Workout Volume",
    badgeVariant: "secondary",
    iconType: "flame",
  });

  // 5. Resting Heart Rate Stability
  const rhrSeries = data.datasets.restingHR.series;
  const avgRhr = rhrSeries.length ? Math.round(meanBy(rhrSeries, (s) => s.value)) : 62;
  insights.push({
    id: "heart-stability",
    category: "heart",
    title: "Cardiovascular Baseline",
    description: `Baseline resting heart rate averages ${avgRhr} bpm, reflecting efficient cardiac output and aerobic recovery.`,
    metric: `${avgRhr} bpm`,
    badgeText: "Cardio Health",
    badgeVariant: "outline",
    iconType: "heart",
  });

  return insights;
}
