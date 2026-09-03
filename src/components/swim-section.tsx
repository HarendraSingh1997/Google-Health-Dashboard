"use client";

import * as React from "react";
import { Waves, Timer, Route, Repeat, Flame, Gauge, Dumbbell } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TimeSeriesChart, MonthlyBarChart } from "@/components/charts";
import type { WorkoutLog } from "@/lib/types";
import { formatNumber } from "@/lib/format";

/** Fitbit exports pace as seconds per km; swimmers read pace per 100 m. */
function pacePer100m(paceSecPerKm: number | null): number | null {
  return paceSecPerKm == null ? null : paceSecPerKm / 10;
}

function formatPace(secPer100m: number | null): string {
  if (secPer100m == null || !Number.isFinite(secPer100m)) return "—";
  const s = Math.round(secPer100m);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function formatDuration(totalMin: number): string {
  const h = Math.floor(totalMin / 60);
  const m = Math.round(totalMin % 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

const DISTANCE_DEFS = [{ key: "distance", label: "Distance", color: "var(--color-chart-2)" }];
const PACE_DEFS = [{ key: "pace", label: "Pace /100m", color: "var(--color-primary)" }];
const VOLUME_DEFS = [
  { key: "lengths", label: "Lengths", color: "var(--color-chart-2)" },
  { key: "meters", label: "Meters", color: "var(--color-chart-3)" },
];

export function SwimSection({ workouts }: { workouts: WorkoutLog[] }) {
  const swims = React.useMemo(
    () =>
      workouts
        .filter((w) => w.activityName === "Swim")
        .slice()
        .sort((a, b) => a.date.localeCompare(b.date)),
    [workouts]
  );

  const stats = React.useMemo(() => {
    const totalDistKm = swims.reduce((a, w) => a + (w.distanceKm ?? 0), 0);
    const totalLengths = swims.reduce((a, w) => a + (w.swimLengths ?? 0), 0);
    const totalMin = swims.reduce((a, w) => a + w.durationMin, 0);
    const totalCal = swims.reduce((a, w) => a + w.calories, 0);
    const paces = swims
      .map((w) => w.paceSecPerKm)
      .filter((p): p is number => p != null && Number.isFinite(p));
    return {
      sessions: swims.length,
      totalDistKm,
      totalLengths,
      totalMin,
      totalCal,
      avgPace100m: paces.length ? paces.reduce((a, p) => a + p, 0) / paces.length / 10 : null,
    };
  }, [swims]);

  const distanceData = React.useMemo(
    () => swims.map((w) => ({ date: w.date, distance: w.distanceKm ?? 0 })),
    [swims]
  );
  const paceData = React.useMemo(
    () =>
      swims
        .filter((w) => w.paceSecPerKm != null)
        .map((w) => ({ date: w.date, pace: Math.round((w.paceSecPerKm as number) / 10) })),
    [swims]
  );
  const monthlyVolume = React.useMemo(() => {
    const byMonth = new Map<string, { lengths: number; meters: number }>();
    for (const w of swims) {
      const m = w.date.slice(0, 7);
      const cur = byMonth.get(m) ?? { lengths: 0, meters: 0 };
      cur.lengths += w.swimLengths ?? 0;
      cur.meters += Math.round((w.distanceKm ?? 0) * 1000);
      byMonth.set(m, cur);
    }
    return [...byMonth.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, v]) => ({ month, lengths: v.lengths, meters: v.meters }));
  }, [swims]);

  const tableRows = React.useMemo(() => swims.slice().reverse(), [swims]);

  if (!swims.length) return null;

  const tiles = [
    { icon: <Dumbbell className="h-3.5 w-3.5" />, label: "Swim Sessions", value: formatNumber(stats.sessions), sub: `${swims[0].date} → ${swims[swims.length - 1].date}` },
    { icon: <Route className="h-3.5 w-3.5" />, label: "Total Distance", value: `${stats.totalDistKm.toFixed(2)} km`, sub: `${formatNumber(stats.totalLengths)} lengths` },
    { icon: <Repeat className="h-3.5 w-3.5" />, label: "Pool Lengths", value: formatNumber(stats.totalLengths), sub: "25 m pool" },
    { icon: <Timer className="h-3.5 w-3.5" />, label: "Time in Water", value: formatDuration(stats.totalMin), sub: `${formatNumber(Math.round(stats.totalMin))} min total` },
    { icon: <Gauge className="h-3.5 w-3.5" />, label: "Avg Pace /100m", value: formatPace(stats.avgPace100m), sub: "lower is faster" },
    { icon: <Flame className="h-3.5 w-3.5" />, label: "Calories Burned", value: formatNumber(stats.totalCal), sub: "kcal total" },
  ];

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Waves className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-bold tracking-wider text-foreground uppercase">
            Swimming
          </h3>
        </div>
        <Badge variant="secondary">{stats.sessions} sessions in view</Badge>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-xl border border-border bg-muted/40 p-3">
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
              <span className="text-primary">{t.icon}</span>
              {t.label}
            </div>
            <div className="mt-1 text-lg font-bold text-foreground tabular-nums">{t.value}</div>
            <div className="truncate text-[10px] text-muted-foreground tabular-nums">{t.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="w-full rounded-3xl border border-border bg-card p-5 shadow-sm">
          <CardHeader className="p-0 pb-4">
            <CardTitle className="text-base font-bold text-card-foreground">
              Distance per Swim Session
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Kilometers logged per swim ({stats.totalDistKm.toFixed(2)} km total in view).
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <TimeSeriesChart
              data={distanceData}
              xKey="date"
              series={DISTANCE_DEFS}
              type="area"
              unit="km"
              height={260}
            />
          </CardContent>
        </Card>

        <Card className="w-full rounded-3xl border border-border bg-card p-5 shadow-sm">
          <CardHeader className="p-0 pb-4">
            <CardTitle className="text-base font-bold text-card-foreground">
              Pace per 100 m Trend
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Seconds per 100 m per session — downward trend means getting faster.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <TimeSeriesChart
              data={paceData}
              xKey="date"
              series={PACE_DEFS}
              type="line"
              unit="s/100m"
              height={260}
            />
          </CardContent>
        </Card>
      </div>

      <Card className="w-full rounded-3xl border border-border bg-card p-5 shadow-sm">
        <CardHeader className="p-0 pb-4">
          <CardTitle className="text-base font-bold text-card-foreground">
            Monthly Swim Volume
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Pool lengths and meters swum per month.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <MonthlyBarChart data={monthlyVolume} xKey="month" series={VOLUME_DEFS} height={260} />
        </CardContent>
      </Card>

      <Card className="rounded-2xl border border-border bg-card shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-bold text-card-foreground">
            Swim Sessions
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            {tableRows.length} sessions, newest first · 25 m pool.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="overflow-hidden rounded-xl border border-border">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Distance</TableHead>
                  <TableHead className="text-right">Lengths</TableHead>
                  <TableHead className="text-right">Duration</TableHead>
                  <TableHead className="text-right">Pace /100m</TableHead>
                  <TableHead className="text-right">Speed</TableHead>
                  <TableHead className="text-right">Calories</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tableRows.map((w) => (
                  <TableRow key={w.id}>
                    <TableCell className="font-medium text-foreground tabular-nums">{w.date}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {w.distanceKm != null ? `${w.distanceKm.toFixed(2)} km` : "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {w.swimLengths != null ? formatNumber(w.swimLengths) : "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{formatDuration(w.durationMin)}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatPace(pacePer100m(w.paceSecPerKm))}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {w.speedKmh != null ? `${w.speedKmh.toFixed(2)} km/h` : "—"}
                    </TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">
                      {formatNumber(w.calories)} kcal
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
