"use client";

import * as React from "react";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { colorFor } from "@/lib/palette";
import { formatNumber } from "@/lib/format";
import type { WorkoutLog, BadgeItem, PersonalRecords } from "@/lib/types";

const MILESTONE_LANE = "★ Milestones";
const MAX_LANES = 7;
const OTHER_LANE = "Other";
const MAX_MILESTONES = 40;
const CHART_HEIGHT = 360;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function epochOf(dateStr: string): number {
  const y = +dateStr.slice(0, 4);
  const m = +dateStr.slice(5, 7);
  const d = +dateStr.slice(8, 10);
  return Date.UTC(y, m - 1, d);
}

function tickLabel(epoch: number): string {
  const dt = new Date(epoch);
  return `${MONTHS[dt.getUTCMonth()]} ’${String(dt.getUTCFullYear()).slice(2)}`;
}

function fullDate(epoch: number): string {
  const dt = new Date(epoch);
  return `${dt.getUTCDate()} ${MONTHS[dt.getUTCMonth()]} ${dt.getUTCFullYear()}`;
}

interface SessionDot {
  x: number;
  y: string;
  date: string;
  activity: string;
  sessions: number;
  durationMin: number;
  calories: number;
  distanceKm: number;
  color: string;
  r: number;
}

interface MilestoneDot {
  x: number;
  y: string;
  label: string;
  detail: string;
}

function radiusFor(minutes: number): number {
  return Math.max(3.5, Math.min(13, 3 + Math.sqrt(minutes) * 0.9));
}

// Custom dot: circles for sessions, diamonds for milestones.
function TimelineShape(props: {
  cx?: number;
  cy?: number;
  payload?: SessionDot | MilestoneDot;
}) {
  const { cx = 0, cy = 0, payload } = props;
  if (!payload || cx == null || cy == null) return null;
  if ("sessions" in payload) {
    return (
      <circle cx={cx} cy={cy} r={payload.r} fill={payload.color} fillOpacity={0.85} stroke="#fff" strokeWidth={1.2} />
    );
  }
  const s = 7;
  return (
    <path
      d={`M ${cx} ${cy - s} L ${cx + s} ${cy} L ${cx} ${cy + s} L ${cx - s} ${cy} Z`}
      fill="#F59E0B"
      stroke="#fff"
      strokeWidth={1.2}
    />
  );
}

function TimelineTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload?: SessionDot | MilestoneDot }[];
}) {
  if (!active || !payload?.length || !payload[0]?.payload) return null;
  const p = payload[0].payload;
  if ("sessions" in p) {
    return (
      <div className="rounded-xl border border-border bg-popover px-3.5 py-2.5 text-xs shadow-xl">
        <div className="mb-1 text-xs font-semibold text-muted-foreground">{fullDate(p.x)}</div>
        <div className="flex items-center gap-1.5 font-bold text-popover-foreground">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color }} />
          {p.activity}
          {p.sessions > 1 ? ` × ${p.sessions}` : ""}
        </div>
        <div className="mt-1 flex flex-col gap-0.5 tabular-nums text-popover-foreground">
          <span>{formatNumber(Math.round(p.durationMin))} min total</span>
          <span>{formatNumber(p.calories)} kcal</span>
          {p.distanceKm > 0 && <span>{p.distanceKm.toFixed(2)} km</span>}
        </div>
      </div>
    );
  }
  return (
    <div className="max-w-60 rounded-xl border border-border bg-popover px-3.5 py-2.5 text-xs shadow-xl">
      <div className="mb-1 text-xs font-semibold text-muted-foreground">{fullDate(p.x)}</div>
      <div className="font-bold text-popover-foreground">◆ {p.label}</div>
      {p.detail && <div className="mt-0.5 text-popover-foreground">{p.detail}</div>}
    </div>
  );
}

export function TimelineChart({
  workouts,
  badges,
  records,
}: {
  workouts: WorkoutLog[];
  badges: BadgeItem[];
  records: PersonalRecords;
}) {
  const { lanes, sessionDots, milestoneDots, minX, maxX, laneColors } = React.useMemo(() => {
    // Lane assignment: top activities by session count in view.
    const counts = new Map<string, number>();
    for (const w of workouts) counts.set(w.activityName, (counts.get(w.activityName) ?? 0) + 1);
    const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    const top = ranked.slice(0, MAX_LANES).map(([a]) => a);
    const laneOf = (activity: string) => (top.includes(activity) ? activity : OTHER_LANE);
    const lanes = [MILESTONE_LANE, ...top];
    if (ranked.length > MAX_LANES) lanes.push(OTHER_LANE);
    const laneColors = new Map<string, string>();
    top.forEach((a, i) => laneColors.set(a, colorFor(i)));
    laneColors.set(OTHER_LANE, "var(--color-muted-foreground)");

    // Aggregate same-day + same-activity sessions into one dot.
    const agg = new Map<string, SessionDot>();
    for (const w of workouts) {
      const lane = laneOf(w.activityName);
      const key = `${w.date}|${lane}`;
      const cur = agg.get(key);
      if (cur) {
        cur.sessions += 1;
        cur.durationMin += w.durationMin;
        cur.calories += w.calories;
        cur.distanceKm += w.distanceKm ?? 0;
        cur.r = radiusFor(cur.durationMin);
      } else {
        agg.set(key, {
          x: epochOf(w.date),
          y: lane,
          date: w.date,
          activity: lane === OTHER_LANE ? `${w.activityName} (other)` : w.activityName,
          sessions: 1,
          durationMin: w.durationMin,
          calories: w.calories,
          distanceKm: w.distanceKm ?? 0,
          color: laneColors.get(lane) ?? colorFor(0),
          r: radiusFor(w.durationMin),
        });
      }
    }
    const sessionDots = [...agg.values()].sort((a, b) => a.x - b.x);

    // Window follows the workouts in view.
    const xs = sessionDots.map((d) => d.x);
    const minX = xs.length ? Math.min(...xs) : Date.UTC(2020, 0, 1);
    const maxX = xs.length ? Math.max(...xs) : Date.UTC(2020, 0, 2);
    const inWindow = (dateStr: string) => {
      if (!dateStr || dateStr.length < 10) return false;
      const x = epochOf(dateStr.slice(0, 10));
      return x >= minX && x <= maxX;
    };

    // Milestones: badges + records + streak start, capped for readability.
    const milestoneDots: MilestoneDot[] = [];
    const inBadges = badges
      .filter((b) => inWindow(b.earnedDate))
      .sort((a, b) => b.value - a.value)
      .slice(0, MAX_MILESTONES);
    for (const b of inBadges) {
      milestoneDots.push({
        x: epochOf(b.earnedDate.slice(0, 10)),
        y: MILESTONE_LANE,
        label: b.shortName || b.name,
        detail: b.description || b.category,
      });
    }
    const recs: { date: string; label: string; detail: string }[] = [];
    if (records.maxStepsDay)
      recs.push({
        date: records.maxStepsDay.date,
        label: "Peak steps day",
        detail: `${formatNumber(records.maxStepsDay.value)} steps`,
      });
    if (records.highestSleepScore)
      recs.push({
        date: records.highestSleepScore.date,
        label: "Best sleep score",
        detail: `${records.highestSleepScore.value}/100`,
      });
    if (records.longestStreakPeriod) {
      const m = /^(\d{4}-\d{2}-\d{2})/.exec(records.longestStreakPeriod);
      if (m)
        recs.push({
          date: m[1],
          label: `${records.longest10kStreakDays}-day 10k streak`,
          detail: records.longestStreakPeriod,
        });
    }
    for (const r of recs) {
      if (inWindow(r.date)) {
        milestoneDots.push({ x: epochOf(r.date.slice(0, 10)), y: MILESTONE_LANE, label: r.label, detail: r.detail });
      }
    }

    return { lanes, sessionDots, milestoneDots, minX, maxX, laneColors };
  }, [workouts, badges, records]);

  if (!sessionDots.length) {
    return (
      <div className="flex h-48 items-center justify-center text-xs text-muted-foreground">
        No workout sessions in this range.
      </div>
    );
  }

  const pad = 4 * 86400000;
  const totalSessions = sessionDots.reduce((a, d) => a + d.sessions, 0);

  return (
    <div>
      <div
        className="relative w-full min-w-0 overflow-hidden"
        style={{ height: CHART_HEIGHT, minHeight: CHART_HEIGHT }}
      >
        <ResponsiveContainer width="100%" height={CHART_HEIGHT} minWidth={0} minHeight={CHART_HEIGHT}>
          <ScatterChart margin={{ left: 0, right: 16, top: 12, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" strokeOpacity={0.6} />
            <XAxis
              type="number"
              dataKey="x"
              domain={[minX - pad, maxX + pad]}
              tickFormatter={tickLabel}
              tickLine={false}
              axisLine={false}
              minTickGap={40}
              tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
            />
            <YAxis
              type="category"
              dataKey="y"
              domain={lanes}
              tickLine={false}
              axisLine={false}
              width={112}
              tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
            />
            <Tooltip content={<TimelineTooltip />} cursor={{ strokeDasharray: "3 3" }} />
            <Scatter name="Sessions" data={sessionDots} shape={<TimelineShape />} />
            {milestoneDots.length > 0 && (
              <Scatter name="Milestones" data={milestoneDots} shape={<TimelineShape />} />
            )}
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 px-1 text-[11px] text-muted-foreground">
        {lanes
          .filter((l) => l !== MILESTONE_LANE)
          .map((l) => (
            <span key={l} className="flex items-center gap-1.5">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: laneColors.get(l) }}
              />
              {l}
            </span>
          ))}
        {milestoneDots.length > 0 && (
          <span className="flex items-center gap-1.5">
            <span className="text-[10px] text-[#F59E0B]">◆</span> Milestone
          </span>
        )}
        <span className="ml-auto tabular-nums">
          {formatNumber(totalSessions)} sessions · dot size = minutes
        </span>
      </div>
    </div>
  );
}
