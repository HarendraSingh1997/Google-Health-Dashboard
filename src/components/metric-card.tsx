"use client";

import * as React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import type { SeriesPoint } from "@/lib/types";
import { formatNumber } from "@/lib/format";

interface MetricCardProps {
  label: string;
  value: number | string;
  unit?: string;
  avg?: number;
  min?: number;
  max?: number;
  trendPct?: number;
  icon?: React.ReactNode;
  sparklineData?: SeriesPoint[];
  statusLabel?: string;
}

// Mini sparkline SVG renderer (React Compiler memoizes the result).
function renderSparkline(sparklineData?: SeriesPoint[]) {
  if (!sparklineData || sparklineData.length < 2) return null;
  const sample = sparklineData.length > 25 ? sparklineData.slice(-25) : sparklineData;
  const vals = sample.map((s) => s.value);
  const minV = Math.min(...vals);
  const maxV = Math.max(...vals);
  const range = maxV - minV || 1;
  const width = 80;
  const height = 28;

  const points = sample
    .map((p, i) => {
      const x = (i / (sample.length - 1)) * width;
      const y = height - ((p.value - minV) / range) * (height - 6) - 3;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg width={width} height={height} className="overflow-visible opacity-80 transition-opacity group-hover:opacity-100">
      <polyline fill="none" stroke="currentColor" className="text-primary" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points={points} />
    </svg>
  );
}

export function MetricCard({
  label,
  value,
  unit,
  avg,
  min,
  max,
  trendPct,
  icon,
  sparklineData,
  statusLabel,
}: MetricCardProps) {
  const up = (trendPct ?? 0) > 0;
  const flat = (trendPct ?? 0) === 0;
  const sparklineSvg = renderSparkline(sparklineData);

  return (
    <Card className="group relative w-full overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon && (
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-muted text-primary">
              {icon}
            </div>
          )}
          <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            {label}
          </span>
        </div>

        {statusLabel && (
          <Badge variant="secondary" className="px-2 py-0.5 text-[10px] font-semibold">
            {statusLabel}
          </Badge>
        )}
      </div>

      <div className="mt-3 flex items-end justify-between">
        <div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold tracking-tight text-card-foreground tabular-nums sm:text-3xl">
              {typeof value === "number" ? formatNumber(value) : value}
            </span>
            {unit && (
              <span className="text-xs font-medium text-muted-foreground">
                {unit}
              </span>
            )}
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {avg !== undefined && (
              <span className="tabular-nums">
                avg <span className="font-semibold text-foreground">{typeof avg === "number" ? formatNumber(avg) : avg}</span>
              </span>
            )}
            {min !== undefined && max !== undefined && (
              <span className="text-[11px] text-muted-foreground">
                ({min}–{max})
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col items-end gap-1">
          {sparklineSvg}
          {trendPct !== undefined && (
            <Badge
              variant={flat ? "outline" : up ? "secondary" : "destructive"}
              className="h-5 gap-0.5 px-1.5 text-[10px] font-semibold"
            >
              {flat ? (
                <Minus className="h-2.5 w-2.5" />
              ) : up ? (
                <ArrowUpRight className="h-3 w-3" />
              ) : (
                <ArrowDownRight className="h-3 w-3" />
              )}
              {Math.abs(trendPct)}%
            </Badge>
          )}
        </div>
      </div>
    </Card>
  );
}
