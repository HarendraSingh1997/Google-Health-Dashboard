"use client";

import * as React from "react";
import { countBy, groupBy, maxBy, orderBy, sumBy } from "lodash";
import { Cloud } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { colorFor } from "@/lib/palette";
import { formatNumber } from "@/lib/format";
import type { WorkoutLog } from "@/lib/types";

export interface CloudWord {
  text: string;
  value: number;
  detail?: string;
}

interface PlacedWord extends CloudWord {
  x: number;
  y: number;
  fontSize: number;
  color: string;
  w: number;
  h: number;
}

const MIN_FONT = 14;
const MAX_FONT = 56;
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

function approxWidth(text: string, fontSize: number): number {
  return text.length * fontSize * 0.58;
}

/**
 * Deterministic center-out spiral layout (no canvas, no Math.random), so SSR
 * and CSR render byte-identical output — safe for prerendering.
 */
function layoutWords(words: CloudWord[], width: number, height: number): PlacedWord[] {
  if (!words.length) return [];
  const values = words.map((w) => w.value);
  const min = Math.min(...values);
  const max = Math.max(...values);

  const placed: PlacedWord[] = [];
  const cx = width / 2;
  const cy = height / 2;

  words.forEach((word, wi) => {
    const t = (Math.sqrt(word.value) - Math.sqrt(min)) / (Math.sqrt(max) - Math.sqrt(min) || 1);
    const fontSize = Math.round(MIN_FONT + t * (MAX_FONT - MIN_FONT));
    const w = approxWidth(word.text, fontSize) + 12;
    const h = fontSize + 10;
    const color = colorFor(wi);

    let x = cx;
    let y = cy;
    let step = 0;
    const overlaps = (px: number, py: number) =>
      placed.some(
        (p) =>
          Math.abs(px - p.x) < (w + p.w) / 2 + 4 && Math.abs(py - p.y) < (h + p.h) / 2 + 4
      );
    if (overlaps(x, y)) {
      let r = 8;
      while (step < 3000) {
        const a = step * GOLDEN_ANGLE;
        x = cx + r * Math.cos(a);
        y = cy + r * Math.sin(a) * 0.62;
        if (!overlaps(x, y)) break;
        r += 2.5;
        step += 1;
      }
    }
    placed.push({ ...word, x, y, fontSize, color, w, h });
  });

  return placed;
}

function cloudBounds(placed: PlacedWord[], width: number, height: number) {
  if (!placed.length) return { x: 0, y: 0, w: width, h: height };
  const x0 = Math.min(...placed.map((p) => p.x - p.w / 2));
  const x1 = Math.max(...placed.map((p) => p.x + p.w / 2));
  const y0 = Math.min(...placed.map((p) => p.y - p.h / 2));
  const y1 = Math.max(...placed.map((p) => p.y + p.h / 2));
  const pad = 12;
  return { x: x0 - pad, y: y0 - pad, w: x1 - x0 + pad * 2, h: y1 - y0 + pad * 2 };
}

export function WordCloud({
  words,
  height = 300,
}: {
  words: CloudWord[];
  height?: number;
}) {
  const width = 900;
  const placed = layoutWords(orderBy(words, ["value"], ["desc"]).slice(0, 40), width, height);

  const bounds = cloudBounds(placed, width, height);

  if (!placed.length) {
    return (
      <div className="flex h-48 items-center justify-center text-xs text-muted-foreground">
        No words to display in this range.
      </div>
    );
  }

  return (
    <svg
      viewBox={`${bounds.x} ${bounds.y} ${bounds.w} ${bounds.h}`}
      className="w-full"
      style={{ height }}
      role="img"
      aria-label="Workout activity word cloud"
    >
      {placed.map((p) => (
        <g key={p.text} transform={`translate(${p.x},${p.y})`} className="cursor-default">
          <title>{`${p.text}: ${formatNumber(Math.round(p.value))}${p.detail ? ` ${p.detail}` : ""}`}</title>
          <text
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={p.fontSize}
            fontWeight={700}
            fill={p.color}
            opacity={0.55 + 0.45 * (p.fontSize - MIN_FONT) / (MAX_FONT - MIN_FONT || 1)}
            className="transition-opacity hover:opacity-100"
          >
            {p.text}
          </text>
        </g>
      ))}
    </svg>
  );
}

type CloudMetric = "sessions" | "calories";

function cloudWords(workouts: WorkoutLog[], metric: CloudMetric): CloudWord[] {
  if (metric === "sessions") {
    const counts = countBy(workouts, (w) => w.activityName);
    return Object.entries(counts).map(([text, value]) => ({
      text,
      value,
      detail: "sessions",
    }));
  }
  const byAct = groupBy(workouts, (w) => w.activityName);
  return Object.entries(byAct).map(([text, ws]) => ({
    text,
    value: sumBy(ws, (w) => w.calories),
    detail: "kcal",
  }));
}

export function WorkoutWordCloud({ workouts }: { workouts: WorkoutLog[] }) {
  const [metric, setMetric] = React.useState<CloudMetric>("sessions");

  const words = cloudWords(workouts, metric);

  const total = sumBy(words, (w) => w.value);
  const top = maxBy(words, (w) => w.value) ?? null;

  if (!workouts.length) return null;

  return (
    <Card className="w-full rounded-3xl border border-border bg-card p-5 shadow-sm">
      <CardHeader className="p-0 pb-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-base font-bold text-card-foreground">
              <Cloud className="h-4 w-4 text-primary" />
              Workout Activity Word Cloud
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              {metric === "sessions"
                ? "Activity names sized by session count — your most frequent training."
                : "Activity names sized by total calories burned — where the energy goes."}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {top && (
              <Badge variant="outline" className="tabular-nums">
                Top: {top.text} · {formatNumber(Math.round(top.value))} {metric === "sessions" ? "sessions" : "kcal"}
              </Badge>
            )}
            <div className="flex items-center gap-1 rounded-xl border border-border bg-muted/40 p-1">
              {(["sessions", "calories"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMetric(m)}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-bold capitalize transition-all ${
                    metric === m
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <WordCloud words={words} height={300} />
        <div className="mt-1 px-1 text-[11px] tabular-nums text-muted-foreground">
          {words.length} activities · {formatNumber(Math.round(total))}{" "}
          {metric === "sessions" ? "sessions" : "kcal"} in view — hover a word for exact numbers.
        </div>
      </CardContent>
    </Card>
  );
}

