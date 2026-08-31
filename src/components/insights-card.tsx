"use client";

import * as React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  Trophy,
  Moon,
  Footprints,
  Flame,
  Heart,
  Zap,
} from "lucide-react";
import type { HealthScoreResult, InsightItem } from "@/lib/insights";
import type { PersonalRecords } from "@/lib/types";

export function HealthScoreHero({ healthScore }: { healthScore: HealthScoreResult }) {
  const score = healthScore.overallScore;
  const radius = 48;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <Card className="relative overflow-hidden rounded-3xl border border-border bg-card p-6 text-card-foreground shadow-sm">
      <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-6">
          {/* Circular Score Gauge */}
          <div className="relative flex h-32 w-32 shrink-0 items-center justify-center">
            <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 120 120">
              <circle
                cx="60"
                cy="60"
                r={radius}
                className="stroke-muted"
                strokeWidth="10"
                fill="transparent"
              />
              <circle
                cx="60"
                cy="60"
                r={radius}
                className="stroke-primary transition-all duration-1000 ease-out"
                strokeWidth="10"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center text-center">
              <span className="text-3xl font-extrabold tracking-tight tabular-nums">
                {score}
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Score
              </span>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 text-xs font-semibold uppercase tracking-widest text-primary">
                <Sparkles className="h-3.5 w-3.5" /> Daily Health Composite
              </span>
              <Badge variant="secondary" className="font-semibold">
                {healthScore.status}
              </Badge>
            </div>
            <h2 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
              Holistic Recovery &amp; Vitality
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Synthesizing your Sleep Quality, Step Activity, Cardiac Output, and Stress Balance.
            </p>
          </div>
        </div>

        {/* Subscore Pillars */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:w-auto">
          <div className="rounded-2xl border border-border bg-muted/40 p-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Moon className="h-3.5 w-3.5" /> Sleep
            </div>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-xl font-bold text-foreground">{healthScore.subscores.sleep}</span>
              <span className="text-[10px] text-muted-foreground">/100</span>
            </div>
            <div className="mt-1.5 h-1.5 w-full rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${healthScore.subscores.sleep}%` }}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-muted/40 p-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Footprints className="h-3.5 w-3.5" /> Activity
            </div>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-xl font-bold text-foreground">{healthScore.subscores.activity}</span>
              <span className="text-[10px] text-muted-foreground">/100</span>
            </div>
            <div className="mt-1.5 h-1.5 w-full rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${healthScore.subscores.activity}%` }}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-muted/40 p-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Heart className="h-3.5 w-3.5" /> Heart
            </div>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-xl font-bold text-foreground">{healthScore.subscores.heart}</span>
              <span className="text-[10px] text-muted-foreground">/100</span>
            </div>
            <div className="mt-1.5 h-1.5 w-full rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${healthScore.subscores.heart}%` }}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-muted/40 p-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Zap className="h-3.5 w-3.5" /> Stress
            </div>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-xl font-bold text-foreground">{healthScore.subscores.stress}</span>
              <span className="text-[10px] text-muted-foreground">/100</span>
            </div>
            <div className="mt-1.5 h-1.5 w-full rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${healthScore.subscores.stress}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

export function InsightsFeed({ insights }: { insights: InsightItem[] }) {
  const getIcon = (type: string) => {
    switch (type) {
      case "trophy":
        return <Trophy className="h-4 w-4 text-primary" />;
      case "moon":
        return <Moon className="h-4 w-4 text-primary" />;
      case "footprints":
        return <Footprints className="h-4 w-4 text-primary" />;
      case "flame":
        return <Flame className="h-4 w-4 text-primary" />;
      case "heart":
        return <Heart className="h-4 w-4 text-primary" />;
      default:
        return <Sparkles className="h-4 w-4 text-primary" />;
    }
  };

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {insights.map((item) => (
        <Card
          key={item.id}
          className="rounded-2xl border border-border bg-card p-4 shadow-sm transition-all duration-300 hover:shadow-md"
        >
          <div className="flex items-center justify-between">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-muted">
              {getIcon(item.iconType)}
            </div>
            <Badge variant={item.badgeVariant} className="text-[10px] font-semibold">
              {item.badgeText}
            </Badge>
          </div>

          <h3 className="mt-3 text-sm font-bold text-card-foreground">
            {item.title}
          </h3>
          <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
            {item.description}
          </p>

          <div className="mt-3 border-t border-border pt-2 text-[11px] font-semibold text-primary">
            {item.metric}
          </div>
        </Card>
      ))}
    </div>
  );
}

export function PersonalRecordsBanner({ records }: { records: PersonalRecords }) {
  return (
    <Card className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center gap-2 text-foreground">
        <Trophy className="h-5 w-5 text-primary" />
        <h3 className="text-sm font-bold tracking-wide uppercase">
          All-Time Personal Records &amp; Milestones
        </h3>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <div className="rounded-xl border border-border bg-muted/40 p-3">
          <div className="text-[11px] font-medium text-muted-foreground">
            Peak Steps / Day
          </div>
          <div className="mt-1 text-lg font-bold text-foreground tabular-nums">
            {records.maxStepsDay ? records.maxStepsDay.value.toLocaleString() : "—"}
          </div>
          <div className="text-[10px] text-muted-foreground">
            {records.maxStepsDay?.date || ""}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-muted/40 p-3">
          <div className="text-[11px] font-medium text-muted-foreground">
            Max Calorie Burn
          </div>
          <div className="mt-1 text-lg font-bold text-foreground tabular-nums">
            {records.maxCaloriesDay ? `${records.maxCaloriesDay.value.toLocaleString()} kcal` : "—"}
          </div>
          <div className="text-[10px] text-muted-foreground">
            {records.maxCaloriesDay?.date || ""}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-muted/40 p-3">
          <div className="text-[11px] font-medium text-muted-foreground">
            Best Sleep Score
          </div>
          <div className="mt-1 text-lg font-bold text-foreground tabular-nums">
            {records.highestSleepScore ? `${records.highestSleepScore.value}/100` : "—"}
          </div>
          <div className="text-[10px] text-muted-foreground">
            {records.highestSleepScore?.date || ""}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-muted/40 p-3">
          <div className="text-[11px] font-medium text-muted-foreground">
            10k Step Streak
          </div>
          <div className="mt-1 text-lg font-bold text-foreground tabular-nums">
            {records.longest10kStreakDays} days
          </div>
          <div className="text-[10px] text-muted-foreground truncate">
            {records.longestStreakPeriod || ""}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-muted/40 p-3">
          <div className="text-[11px] font-medium text-muted-foreground">
            Lifetime Steps
          </div>
          <div className="mt-1 text-lg font-bold text-foreground tabular-nums">
            {(records.totalLifetimeSteps / 1_000_000).toFixed(2)}M
          </div>
          <div className="text-[10px] text-muted-foreground">
            {records.totalDaysTracked.toLocaleString()} days tracked
          </div>
        </div>

        <div className="rounded-xl border border-border bg-muted/40 p-3">
          <div className="text-[11px] font-medium text-muted-foreground">
            Total Workouts
          </div>
          <div className="mt-1 text-lg font-bold text-foreground tabular-nums">
            {records.totalWorkoutsLogged.toLocaleString()}
          </div>
          <div className="text-[10px] text-muted-foreground">
            Structured sessions
          </div>
        </div>
      </div>
    </Card>
  );
}
