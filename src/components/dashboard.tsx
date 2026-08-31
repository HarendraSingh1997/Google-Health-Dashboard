"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MetricCard } from "@/components/metric-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  TimeSeriesChart,
  StackedAreaChart,
  MonthlyBarChart,
  DistributionChart,
  WeekdayComparisonChart,
  type SeriesDef,
} from "@/components/charts";
import { Heatmap } from "@/components/heatmap";
import { GeoMap } from "@/components/geo-map";
import { FunnelChartView } from "@/components/funnel-chart";
import { DataTable } from "@/components/data-table";
import { WorkoutsTable } from "@/components/workouts-table";
import { BadgesGallery } from "@/components/badges-gallery";
import {
  HealthScoreHero,
  InsightsFeed,
  PersonalRecordsBanner,
} from "@/components/insights-card";
import type { HealthData, SeriesPoint } from "@/lib/types";
import {
  buildOptions,
  filterDaily,
  filterGeo,
  filterMonthly,
  filterWorkouts,
  filterSleepStages,
  filterIntensity,
  periodLabel,
  summarize,
  type FilterState,
  type Granularity,
  type PresetRange,
} from "@/lib/filter";
import {
  computeHealthScore,
  computeWeekdayVsWeekend,
  generateHealthInsights,
} from "@/lib/insights";
import {
  Activity,
  Moon,
  Heart,
  Flame,
  Footprints,
  Wind,
  Scale,
  Gauge,
  Calendar,
  RotateCcw,
  Sparkles,
  Zap,
  Download,
} from "lucide-react";

function toChart(series: SeriesPoint[], key = "value"): any[] {
  return series.map((p) => ({ date: p.date, [key]: p.value }));
}

function rowsFromSeries(series: SeriesPoint[]): Record<string, any>[] {
  return series.map((p) => ({ date: p.date, value: p.value }));
}

export function Dashboard({ data }: { data: HealthData }) {
  const D = data.datasets;
  const derived = data.derived;
  const user = derived.userProfile;
  const records = derived.personalRecords;

  const [preset, setPreset] = React.useState<PresetRange>("all");
  const [granularity, setGranularity] = React.useState<Granularity>("all");
  const [year, setYear] = React.useState<string>("all");
  const [period, setPeriod] = React.useState<string>("all");
  const [explorerDataset, setExplorerDataset] = React.useState<string>("steps");

  const opts = React.useMemo(() => buildOptions(data), [data]);

  const periodOptions = React.useMemo(() => {
    if (granularity === "all") return [] as string[];
    if (granularity === "year") return opts.years.filter((y) => year === "all" || y === year);
    if (granularity === "month") return opts.months.filter((m) => year === "all" || m.startsWith(year));
    return opts.weeks.filter((w) => year === "all" || w.startsWith(year));
  }, [granularity, year, opts]);

  React.useEffect(() => {
    if (granularity === "all") {
      setPeriod("all");
      return;
    }
    if (!periodOptions.includes(period)) {
      setPeriod(periodOptions[0] ?? "all");
    }
  }, [periodOptions, granularity, period]);

  const filter: FilterState = { preset, granularity, year, period };

  // ---- Filtered series ----
  const fSteps = filterDaily(derived.dailyStepsSeries, filter, opts.maxDate);
  const fCalories = filterDaily(derived.dailyCaloriesSeries, filter, opts.maxDate);
  const fDistance = filterDaily(derived.dailyDistanceSeries, filter, opts.maxDate);
  const fIntensity = filterIntensity(derived.dailyActivityIntensity, filter, opts.maxDate);
  const fWorkouts = filterWorkouts(derived.workouts, filter, opts.maxDate);
  const fSleepStages = filterSleepStages(derived.sleepStagesDetailed, filter, opts.maxDate);

  const fSleepScore = filterDaily(D.sleepScore.series, filter, opts.maxDate);
  const fDeep = filterDaily(D.sleepDeep.series, filter, opts.maxDate);
  const fSleepRhr = filterDaily(D.sleepRhr.series, filter, opts.maxDate);
  const fStress = filterDaily(D.stressScore.series, filter, opts.maxDate);
  const fRhr = filterDaily(D.restingHR.series, filter, opts.maxDate);
  const fHrv = filterDaily(D.hrv.series, filter, opts.maxDate);
  const fReadiness = filterDaily(D.readiness.series, filter, opts.maxDate);
  const fSpo2 = filterDaily(D.spo2.series, filter, opts.maxDate);
  const fResp = filterDaily(D.respiratory.series, filter, opts.maxDate);
  const fTemp = filterDaily(D.sleepTemp.series, filter, opts.maxDate);
  const fVo2 = filterDaily(D.vo2max.series, filter, opts.maxDate);
  const fWeight = filterDaily(D.weight.series, filter, opts.maxDate);
  const fElev = filterDaily(D.elevation.series, filter, opts.maxDate);

  const fAzb = filterMonthly(derived.azmSeries, filter, opts.maxDate);
  const fStepsMonthly = filterMonthly(derived.stepsMonthly, filter, opts.maxDate);
  const fCalsMonthly = filterMonthly(derived.caloriesMonthly, filter, opts.maxDate);
  const fGeo = filterGeo(derived.geoPoints, filter, opts.maxDate);

  // ---- Health Score & Insights ----
  const healthScore = React.useMemo(
    () => computeHealthScore(fSleepScore, fSteps, fRhr, fStress, fReadiness),
    [fSleepScore, fSteps, fRhr, fStress, fReadiness]
  );

  const weekdayComparison = React.useMemo(
    () => computeWeekdayVsWeekend(fSteps, fSleepStages, fCalories),
    [fSteps, fSleepStages, fCalories]
  );

  const insightsList = React.useMemo(
    () => generateHealthInsights(data, fSteps, fSleepScore, fWorkouts),
    [data, fSteps, fSleepScore, fWorkouts]
  );

  // Sleep Stages Stacked Data
  const sleepStagesChartData = fSleepStages.map((s) => ({
    date: s.date,
    deep: s.deepMin,
    rem: s.remMin,
    light: s.lightMin,
    wake: s.wakeMin,
  }));

  const sleepStagesDefs: SeriesDef[] = [
    { key: "deep", label: "Deep Sleep", color: "var(--color-primary)" },
    { key: "rem", label: "REM Sleep", color: "var(--color-chart-2)" },
    { key: "light", label: "Light Sleep", color: "var(--color-chart-3)" },
    { key: "wake", label: "Awake / Restless", color: "var(--color-chart-5)" },
  ];

  // Activity Intensity Chart Data
  const intensityChartData = fIntensity.map((i) => ({
    date: i.date,
    very: i.very,
    fairly: i.fairly,
    lightly: i.lightly,
    sedentary: Math.round(i.sedentary / 60),
  }));

  const intensityDefs: SeriesDef[] = [
    { key: "very", label: "Very Active (min)", color: "var(--color-chart-1)" },
    { key: "fairly", label: "Fairly Active (min)", color: "var(--color-chart-2)" },
    { key: "lightly", label: "Lightly Active (min)", color: "var(--color-chart-3)" },
  ];

  // AZM Funnel
  const azmFunnel = [
    { stage: "Months tracked", value: fAzb.length },
    { stage: "Fat burn", value: fAzb.filter((m) => m.FAT_BURN > 0).length },
    { stage: "Cardio", value: fAzb.filter((m) => m.CARDIO > 0).length },
    { stage: "Peak", value: fAzb.filter((m) => m.PEAK > 0).length },
  ];

  // AZM Defs
  const azmDefs: SeriesDef[] = [
    { key: "FAT_BURN", label: "Fat Burn Zone", color: "var(--color-chart-3)" },
    { key: "CARDIO", label: "Cardio Zone", color: "var(--color-primary)" },
    { key: "PEAK", label: "Peak Zone", color: "var(--color-destructive)" },
  ];

  const stressStatusData = Object.entries(derived.stressStatus).map(([name, value]) => ({ name, value }));
  const moodData = Object.entries(derived.moodCounts).map(([name, value]) => ({ name, value }));

  const weekdayChartData = [
    {
      category: "Steps (Avg)",
      Weekday: weekdayComparison.weekdayAvgSteps,
      Weekend: weekdayComparison.weekendAvgSteps,
    },
    {
      category: "Sleep (Hours)",
      Weekday: Math.round(weekdayComparison.weekdayAvgSleepHours * 10) / 10,
      Weekend: Math.round(weekdayComparison.weekendAvgSleepHours * 10) / 10,
    },
    {
      category: "Calories (kcal)",
      Weekday: weekdayComparison.weekdayAvgCalories,
      Weekend: weekdayComparison.weekendAvgCalories,
    },
  ];

  const label = periodLabel(filter);

  // Quick export function
  const handleExportJSON = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `google-health-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  };

  return (
    <main className="min-h-screen bg-background text-foreground pb-16">
      <div className="relative mx-auto max-w-7xl px-4 pt-8 sm:px-6 lg:px-8">
        {/* Top Header */}
        <header className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
              <Activity className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl">
                  Google Health
                </h1>
                <span className="rounded-md bg-secondary px-2 py-0.5 text-xs font-bold text-secondary-foreground">
                  Fitbit Analytics
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                User: <span className="font-semibold text-foreground">{user.name}</span> · Tracking since {user.memberSince} · <span className="font-medium text-primary">{records.totalDaysTracked.toLocaleString()} Days Logged</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="hidden rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-xs sm:flex sm:items-center sm:gap-2">
              <Calendar className="h-3.5 w-3.5 text-primary" />
              <span>Current Range: <strong className="text-foreground">{label}</strong></span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportJSON}
              className="gap-1.5 rounded-xl text-xs font-semibold"
            >
              <Download className="h-3.5 w-3.5" /> Export JSON
            </Button>
          </div>
        </header>

        {/* Filter Bar with Presets & Granular Controls */}
        <section className="mb-6 rounded-2xl border border-border bg-card p-3.5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Quick Preset Buttons */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Range:
              </span>
              {(
                [
                  { id: "all", label: "All Time" },
                  { id: "1y", label: "1 Year" },
                  { id: "90d", label: "90 Days" },
                  { id: "30d", label: "30 Days" },
                  { id: "7d", label: "7 Days" },
                ] as const
              ).map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setPreset(p.id);
                    setGranularity("all");
                  }}
                  className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                    preset === p.id && granularity === "all"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Granular Dropdowns */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground">or Granular:</span>
              <Select
                value={granularity}
                onValueChange={(v) => {
                  setGranularity(v as Granularity);
                  setPreset("custom");
                }}
              >
                <SelectTrigger className="h-8.5 w-[130px] rounded-xl text-xs">
                  <SelectValue placeholder="Granularity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Full Range</SelectItem>
                  <SelectItem value="year">Yearly</SelectItem>
                  <SelectItem value="month">Monthly</SelectItem>
                  <SelectItem value="week">Weekly</SelectItem>
                </SelectContent>
              </Select>

              {granularity !== "all" && (
                <Select value={year} onValueChange={(v) => setYear(v ?? "all")}>
                  <SelectTrigger className="h-8.5 w-[110px] rounded-xl text-xs">
                    <SelectValue placeholder="Year" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Years</SelectItem>
                    {opts.years.map((y) => (
                      <SelectItem key={y} value={y}>
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {granularity !== "all" && (
                <Select value={period} onValueChange={(v) => setPeriod(v ?? "all")}>
                  <SelectTrigger className="h-8.5 w-[140px] rounded-xl text-xs">
                    <SelectValue placeholder="Select period" />
                  </SelectTrigger>
                  <SelectContent>
                    {periodOptions.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {(preset !== "all" || granularity !== "all") && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setPreset("all");
                    setGranularity("all");
                    setYear("all");
                    setPeriod("all");
                  }}
                  className="h-8.5 gap-1 rounded-xl text-xs text-muted-foreground hover:text-foreground"
                >
                  <RotateCcw className="h-3 w-3" /> Reset
                </Button>
              )}
            </div>
          </div>
        </section>

        {/* Tab Navigation */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="flex flex-wrap h-auto gap-1 rounded-2xl border border-border bg-card p-1.5 shadow-xs">
            <TabsTrigger value="overview" className="rounded-xl px-3.5 py-2 text-xs font-semibold">
              🌟 Overview
            </TabsTrigger>
            <TabsTrigger value="sleep" className="rounded-xl px-3.5 py-2 text-xs font-semibold">
              😴 Sleep &amp; Recovery
            </TabsTrigger>
            <TabsTrigger value="activity" className="rounded-xl px-3.5 py-2 text-xs font-semibold">
              🏃 Activity &amp; Workouts
            </TabsTrigger>
            <TabsTrigger value="heart" className="rounded-xl px-3.5 py-2 text-xs font-semibold">
              ❤️ Cardiovascular &amp; Vitals
            </TabsTrigger>
            <TabsTrigger value="stress" className="rounded-xl px-3.5 py-2 text-xs font-semibold">
              🧘 Stress &amp; Mind
            </TabsTrigger>
            <TabsTrigger value="geo" className="rounded-xl px-3.5 py-2 text-xs font-semibold">
              🗺️ Geo &amp; Elevation
            </TabsTrigger>
            <TabsTrigger value="badges" className="rounded-xl px-3.5 py-2 text-xs font-semibold">
              🏆 Badges ({derived.badges.length})
            </TabsTrigger>
            <TabsTrigger value="explorer" className="rounded-xl px-3.5 py-2 text-xs font-semibold">
              📋 Data Explorer
            </TabsTrigger>
          </TabsList>

          {/* ================= OVERVIEW TAB ================= */}
          <TabsContent value="overview" className="space-y-6">
            <HealthScoreHero healthScore={healthScore} />
            <PersonalRecordsBanner records={records} />

            <section className="grid grid-cols-2 gap-4 sm:grid-cols-2 md:grid-cols-4">
              <MetricCard
                label="Daily Steps"
                value={summarize(fSteps)?.latest ?? "—"}
                unit="steps"
                avg={summarize(fSteps)?.avg}
                min={summarize(fSteps)?.min}
                max={summarize(fSteps)?.max}
                trendPct={summarize(fSteps)?.trendPct}
                icon={<Footprints className="h-4 w-4" />}
                sparklineData={fSteps}
                statusLabel={(summarize(fSteps)?.avg ?? 0) >= 10000 ? "Goal Met" : "Active"}
              />
              <MetricCard
                label="Daily Calories"
                value={summarize(fCalories)?.latest ?? "—"}
                unit="kcal"
                avg={summarize(fCalories)?.avg}
                trendPct={summarize(fCalories)?.trendPct}
                icon={<Flame className="h-4 w-4" />}
                sparklineData={fCalories}
                statusLabel="Metabolic"
              />
              <MetricCard
                label="Sleep Score"
                value={summarize(fSleepScore)?.latest ?? "—"}
                unit="/100"
                avg={summarize(fSleepScore)?.avg}
                trendPct={summarize(fSleepScore)?.trendPct}
                icon={<Moon className="h-4 w-4" />}
                sparklineData={fSleepScore}
                statusLabel={(summarize(fSleepScore)?.avg ?? 0) >= 80 ? "Optimal" : "Normal"}
              />
              <MetricCard
                label="Resting Heart Rate"
                value={summarize(fRhr)?.latest ?? "—"}
                unit="bpm"
                avg={summarize(fRhr)?.avg}
                trendPct={summarize(fRhr)?.trendPct}
                icon={<Heart className="h-4 w-4" />}
                sparklineData={fRhr}
                statusLabel={(summarize(fRhr)?.latest ?? 70) <= 65 ? "Aerobic Recovery" : "Elevated"}
              />
              <MetricCard
                label="Heart Rate Variability"
                value={summarize(fHrv)?.latest ?? "—"}
                unit="ms"
                avg={summarize(fHrv)?.avg}
                trendPct={summarize(fHrv)?.trendPct}
                icon={<Zap className="h-4 w-4" />}
                sparklineData={fHrv}
                statusLabel="Nervous System"
              />
              <MetricCard
                label="VO2 Max (Cardio)"
                value={summarize(fVo2)?.latest ?? "—"}
                unit="ml/kg/min"
                avg={summarize(fVo2)?.avg}
                icon={<Gauge className="h-4 w-4" />}
                sparklineData={fVo2}
                statusLabel="Cardio Fitness"
              />
              <MetricCard
                label="Oxygen Saturation"
                value={summarize(fSpo2)?.latest ?? "—"}
                unit="%"
                avg={summarize(fSpo2)?.avg}
                icon={<Wind className="h-4 w-4" />}
                sparklineData={fSpo2}
                statusLabel="SpO2 Normal"
              />
              <MetricCard
                label="Body Weight"
                value={summarize(fWeight)?.latest ?? "—"}
                unit="kg"
                avg={summarize(fWeight)?.avg}
                min={summarize(fWeight)?.min}
                max={summarize(fWeight)?.max}
                icon={<Scale className="h-4 w-4" />}
                sparklineData={fWeight}
                statusLabel="Stable"
              />
            </section>

            <div>
              <div className="mb-3 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-bold tracking-wider text-foreground uppercase">
                  Intelligent Health &amp; Behavioral Insights
                </h3>
              </div>
              <InsightsFeed insights={insightsList} />
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              <Card className="w-full rounded-3xl border border-border bg-card p-5 shadow-sm lg:col-span-2">
                <CardHeader className="p-0 pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base font-bold text-card-foreground">
                        Daily Step Trajectory vs 10k Goal
                      </CardTitle>
                      <CardDescription className="text-xs text-muted-foreground">
                        Daily step count across {label} with 10,000 steps recommended goal line.
                      </CardDescription>
                    </div>
                    <Badge variant="outline">
                      {fSteps.length} Days
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <TimeSeriesChart
                    data={toChart(fSteps)}
                    xKey="date"
                    series={[{ key: "value", label: "Steps" }]}
                    type="area"
                    unit="steps"
                    height={280}
                    referenceValue={10000}
                    referenceLabel="10k Target"
                  />
                </CardContent>
              </Card>

              <Card className="w-full rounded-3xl border border-border bg-card p-5 shadow-sm">
                <CardHeader className="p-0 pb-4">
                  <CardTitle className="text-base font-bold text-card-foreground">
                    Weekday vs. Weekend Habits
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">
                    Comparing routine vs rest day averages.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <WeekdayComparisonChart data={weekdayChartData} height={280} />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ================= SLEEP LAB TAB ================= */}
          <TabsContent value="sleep" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="w-full rounded-3xl border border-border bg-card p-5 shadow-sm">
                <CardHeader className="p-0 pb-4">
                  <CardTitle className="text-base font-bold text-card-foreground">
                    Sleep Score &amp; Restorative Quality
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">
                    Overall sleep score (0-100) trend across {label}.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <TimeSeriesChart
                    data={toChart(fSleepScore)}
                    xKey="date"
                    series={[{ key: "value", label: "Sleep Score" }]}
                    type="area"
                    unit="pts"
                    height={280}
                    referenceValue={80}
                    referenceLabel="Optimal (80+)"
                  />
                </CardContent>
              </Card>

              <Card className="w-full rounded-3xl border border-border bg-card p-5 shadow-sm">
                <CardHeader className="p-0 pb-4">
                  <CardTitle className="text-base font-bold text-card-foreground">
                    Resting Heart Rate during Sleep
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">
                    Nocturnal cardiac resting rate ({summarize(fSleepRhr)?.avg} bpm avg).
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <TimeSeriesChart
                    data={toChart(fSleepRhr)}
                    xKey="date"
                    series={[{ key: "value", label: "Sleep RHR" }]}
                    type="line"
                    unit="bpm"
                    height={280}
                  />
                </CardContent>
              </Card>
            </div>

            <Card className="w-full rounded-3xl border border-border bg-card p-5 shadow-sm">
              <CardHeader className="p-0 pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-bold text-card-foreground">
                      Sleep Architecture &amp; Stages (Minutes)
                    </CardTitle>
                    <CardDescription className="text-xs text-muted-foreground">
                      Nightly breakdown of Deep Sleep, REM Sleep, Light Sleep, and Awake times.
                    </CardDescription>
                  </div>
                  <Badge variant="outline">
                    {sleepStagesChartData.length} Nights Tracked
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <StackedAreaChart
                  data={sleepStagesChartData}
                  xKey="date"
                  series={sleepStagesDefs}
                  unit="min"
                  height={300}
                />
              </CardContent>
            </Card>

            <div className="grid gap-6 md:grid-cols-2">
              <Card className="w-full rounded-3xl border border-border bg-card p-5 shadow-sm">
                <CardHeader className="p-0 pb-4">
                  <CardTitle className="text-base font-bold text-card-foreground">
                    Deep Sleep Duration (Minutes)
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <TimeSeriesChart
                    data={toChart(fDeep)}
                    xKey="date"
                    series={[{ key: "value", label: "Deep Sleep" }]}
                    type="area"
                    unit="min"
                    height={240}
                  />
                </CardContent>
              </Card>

              <Card className="w-full rounded-3xl border border-border bg-card p-5 shadow-sm">
                <CardHeader className="p-0 pb-4">
                  <CardTitle className="text-base font-bold text-card-foreground">
                    Nightly Skin Temperature (°C)
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <TimeSeriesChart
                    data={toChart(fTemp)}
                    xKey="date"
                    series={[{ key: "value", label: "Temp" }]}
                    type="line"
                    unit="°C"
                    height={240}
                  />
                </CardContent>
              </Card>
            </div>

            <DataTable
              title="Detailed Sleep Records"
              columns={[
                { key: "date", label: "Date" },
                { key: "score", label: "Score", align: "right" },
                { key: "durationMin", label: "Total Min", align: "right" },
                { key: "deepMin", label: "Deep (m)", align: "right" },
                { key: "remMin", label: "REM (m)", align: "right" },
                { key: "lightMin", label: "Light (m)", align: "right" },
                { key: "efficiency", label: "Efficiency %", align: "right" },
              ]}
              rows={fSleepStages}
            />
          </TabsContent>

          {/* ================= ACTIVITY & WORKOUTS TAB ================= */}
          <TabsContent value="activity" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="w-full rounded-3xl border border-border bg-card p-5 shadow-sm">
                <CardHeader className="p-0 pb-4">
                  <CardTitle className="text-base font-bold text-card-foreground">
                    Daily Steps Trend
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">
                    {summarize(fSteps)?.count} days recorded · avg {summarize(fSteps)?.avg?.toLocaleString()} steps.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <TimeSeriesChart
                    data={toChart(fSteps)}
                    xKey="date"
                    series={[{ key: "value", label: "Steps" }]}
                    type="area"
                    unit="steps"
                    height={280}
                    referenceValue={10000}
                    referenceLabel="10k Target"
                  />
                </CardContent>
              </Card>

              <Card className="w-full rounded-3xl border border-border bg-card p-5 shadow-sm">
                <CardHeader className="p-0 pb-4">
                  <CardTitle className="text-base font-bold text-card-foreground">
                    Daily Calorie Burn (Total kcal)
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">
                    Combined basal metabolic + active exertion calories.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <TimeSeriesChart
                    data={toChart(fCalories)}
                    xKey="date"
                    series={[{ key: "value", label: "Calories" }]}
                    type="area"
                    unit="kcal"
                    height={280}
                  />
                </CardContent>
              </Card>
            </div>

            <Card className="w-full rounded-3xl border border-border bg-card p-5 shadow-sm">
              <CardHeader className="p-0 pb-4">
                <CardTitle className="text-base font-bold text-card-foreground">
                  Daily Physical Activity Intensity Breakdown (Minutes)
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Very Active (High Intensity), Fairly Active (Moderate), and Lightly Active minutes.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <StackedAreaChart
                  data={intensityChartData}
                  xKey="date"
                  series={intensityDefs}
                  unit="min"
                  height={280}
                />
              </CardContent>
            </Card>

            <Card className="w-full rounded-3xl border border-border bg-card p-5 shadow-sm">
              <CardHeader className="p-0 pb-4">
                <CardTitle className="text-base font-bold text-card-foreground">
                  Monthly Active Zone Minutes (AZM) by Heart Rate Zone
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Cardio, Fat Burn, and Peak heart rate zones distribution.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <MonthlyBarChart data={fAzb} xKey="month" series={azmDefs} stacked height={280} />
              </CardContent>
            </Card>

            <WorkoutsTable workouts={fWorkouts} />
          </TabsContent>

          {/* ================= CARDIOVASCULAR & VITALS TAB ================= */}
          <TabsContent value="heart" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Card className="w-full rounded-3xl border border-border bg-card p-5 shadow-sm">
                <CardHeader className="p-0 pb-4">
                  <CardTitle className="text-base font-bold text-card-foreground">
                    Resting Heart Rate Trend (Daily)
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">
                    {summarize(fRhr)?.avg} bpm average · lower resting rate reflects cardio endurance.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <TimeSeriesChart
                    data={toChart(fRhr)}
                    xKey="date"
                    series={[{ key: "value", label: "Resting HR" }]}
                    type="line"
                    unit="bpm"
                    height={280}
                  />
                </CardContent>
              </Card>

              <Card className="w-full rounded-3xl border border-border bg-card p-5 shadow-sm">
                <CardHeader className="p-0 pb-4">
                  <CardTitle className="text-base font-bold text-card-foreground">
                    Heart Rate Variability (HRV ms)
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">
                    Autonomic nervous system recovery and stress resilience index.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <TimeSeriesChart
                    data={toChart(fHrv)}
                    xKey="date"
                    series={[{ key: "value", label: "HRV" }]}
                    type="area"
                    unit="ms"
                    height={280}
                  />
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              <Card className="w-full rounded-3xl border border-border bg-card p-5 shadow-sm">
                <CardHeader className="p-0 pb-4">
                  <CardTitle className="text-base font-bold text-card-foreground">
                    VO2 Max (Cardio Fitness)
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">Aerobic capacity score.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <TimeSeriesChart
                    data={toChart(fVo2)}
                    xKey="date"
                    series={[{ key: "value", label: "VO2 Max" }]}
                    type="line"
                    unit="ml/kg"
                    height={240}
                  />
                </CardContent>
              </Card>

              <Card className="w-full rounded-3xl border border-border bg-card p-5 shadow-sm">
                <CardHeader className="p-0 pb-4">
                  <CardTitle className="text-base font-bold text-card-foreground">
                    Oxygen Saturation (SpO2)
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">Blood oxygen levels (%).</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <TimeSeriesChart
                    data={toChart(fSpo2)}
                    xKey="date"
                    series={[{ key: "value", label: "SpO2" }]}
                    type="line"
                    unit="%"
                    height={240}
                  />
                </CardContent>
              </Card>

              <Card className="w-full rounded-3xl border border-border bg-card p-5 shadow-sm">
                <CardHeader className="p-0 pb-4">
                  <CardTitle className="text-base font-bold text-card-foreground">
                    Respiratory Rate
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">Breaths per minute.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <TimeSeriesChart
                    data={toChart(fResp)}
                    xKey="date"
                    series={[{ key: "value", label: "Resp Rate" }]}
                    type="area"
                    unit="br/m"
                    height={240}
                  />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ================= STRESS & MIND TAB ================= */}
          <TabsContent value="stress" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-3">
              <Card className="w-full rounded-3xl border border-border bg-card p-5 shadow-sm md:col-span-2">
                <CardHeader className="p-0 pb-4">
                  <CardTitle className="text-base font-bold text-card-foreground">
                    Daily Stress Management Score
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">
                    Higher score denotes better autonomic and emotional balance.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <TimeSeriesChart
                    data={toChart(fStress)}
                    xKey="date"
                    series={[{ key: "value", label: "Stress Score" }]}
                    type="area"
                    height={280}
                  />
                </CardContent>
              </Card>

              <Card className="w-full rounded-3xl border border-border bg-card p-5 shadow-sm">
                <CardHeader className="p-0 pb-4">
                  <CardTitle className="text-base font-bold text-card-foreground">
                    Stress State Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <DistributionChart data={stressStatusData} nameKey="name" valueKey="value" height={280} />
                </CardContent>
              </Card>
            </div>

            <Card className="w-full rounded-3xl border border-border bg-card p-5 shadow-sm">
              <CardHeader className="p-0 pb-4">
                <CardTitle className="text-base font-bold text-card-foreground">
                  Mood &amp; Reflection Log
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  {moodData.reduce((a, m) => a + m.value, 0)} recorded mood reflections.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <DistributionChart data={moodData} nameKey="name" valueKey="value" height={260} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* ================= GEO & ELEVATION TAB ================= */}
          <TabsContent value="geo" className="space-y-6">
            <Card className="w-full rounded-3xl border border-border bg-card p-5 shadow-sm">
              <CardHeader className="p-0 pb-4">
                <CardTitle className="text-base font-bold text-card-foreground">
                  GPS Workout &amp; Movement Locations
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  {fGeo.length} recorded geographic centroid coordinates.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <GeoMap points={fGeo} />
              </CardContent>
            </Card>

            <div className="grid gap-6 lg:grid-cols-3">
              <Card className="w-full rounded-3xl border border-border bg-card p-5 shadow-sm lg:col-span-2">
                <CardHeader className="p-0 pb-4">
                  <CardTitle className="text-base font-bold text-card-foreground">
                    24×7 Activity Heatmap (Time of Day)
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">
                    Location fixes by Day of Week × Hour of Day (UTC).
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <Heatmap data={derived.activityHeat} />
                </CardContent>
              </Card>

              <Card className="w-full rounded-3xl border border-border bg-card p-5 shadow-sm">
                <CardHeader className="p-0 pb-4">
                  <CardTitle className="text-base font-bold text-card-foreground">
                    Training-Intensity Funnel
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">
                    Monthly heart rate intensity milestone reach.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <FunnelChartView data={azmFunnel} />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ================= BADGES TAB ================= */}
          <TabsContent value="badges" className="space-y-6">
            <BadgesGallery badges={derived.badges} />
          </TabsContent>

          {/* ================= DATA EXPLORER TAB ================= */}
          <TabsContent value="explorer" className="space-y-6">
            <Card className="w-full rounded-3xl border border-border bg-card p-5 shadow-sm">
              <CardHeader className="p-0 pb-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle className="text-base font-bold text-card-foreground">
                      Raw Health Data Explorer
                    </CardTitle>
                    <CardDescription className="text-xs text-muted-foreground">
                      Inspect, sort, and analyze individual metrics across all days.
                    </CardDescription>
                  </div>

                  <div className="flex items-center gap-2">
                    <Select value={explorerDataset} onValueChange={(v) => setExplorerDataset(v ?? "steps")}>
                      <SelectTrigger className="h-9 w-[200px] rounded-xl text-xs">
                        <SelectValue placeholder="Select metric" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="steps">Daily Steps</SelectItem>
                        <SelectItem value="calories">Daily Calories</SelectItem>
                        <SelectItem value="distance">Daily Distance (km)</SelectItem>
                        <SelectItem value="sleepScore">Sleep Score</SelectItem>
                        <SelectItem value="restingHR">Resting HR (bpm)</SelectItem>
                        <SelectItem value="hrv">HRV (ms)</SelectItem>
                        <SelectItem value="vo2max">VO2 Max</SelectItem>
                        <SelectItem value="spo2">SpO2 (%)</SelectItem>
                        <SelectItem value="weight">Body Weight (kg)</SelectItem>
                        <SelectItem value="stressScore">Stress Score</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {(() => {
                  let activeSeries: SeriesPoint[] = [];
                  let unit = "";
                  switch (explorerDataset) {
                    case "steps":
                      activeSeries = fSteps;
                      unit = "steps";
                      break;
                    case "calories":
                      activeSeries = fCalories;
                      unit = "kcal";
                      break;
                    case "distance":
                      activeSeries = fDistance;
                      unit = "km";
                      break;
                    case "sleepScore":
                      activeSeries = fSleepScore;
                      unit = "score";
                      break;
                    case "restingHR":
                      activeSeries = fRhr;
                      unit = "bpm";
                      break;
                    case "hrv":
                      activeSeries = fHrv;
                      unit = "ms";
                      break;
                    case "vo2max":
                      activeSeries = fVo2;
                      unit = "ml/kg";
                      break;
                    case "spo2":
                      activeSeries = fSpo2;
                      unit = "%";
                      break;
                    case "weight":
                      activeSeries = fWeight;
                      unit = "kg";
                      break;
                    case "stressScore":
                      activeSeries = fStress;
                      unit = "pts";
                      break;
                  }

                  return (
                    <DataTable
                      title={`${explorerDataset} Table (${activeSeries.length} rows)`}
                      columns={[
                        { key: "date", label: "Date" },
                        { key: "value", label: `Value (${unit})`, align: "right" },
                      ]}
                      rows={rowsFromSeries(activeSeries)}
                    />
                  );
                })()}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <footer className="mt-12 border-t border-border pt-6 text-center text-xs text-muted-foreground">
          <p>
            Google Health &amp; Fitbit Data Analytics · Built for {user.name} · {records.totalLifetimeSteps.toLocaleString()} Total Lifetime Steps · {records.totalLifetimeDistanceKm.toLocaleString()} km Explored
          </p>
        </footer>
      </div>
    </main>
  );
}
