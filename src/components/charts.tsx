"use client";

import { useId } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  Area,
  AreaChart,
  Bar,
  BarChart,
  XAxis,
  YAxis,
  Pie,
  PieChart,
  Cell,
  ReferenceLine,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { colorFor } from "@/lib/palette";

export interface SeriesDef {
  key: string;
  label: string;
  color?: string;
  unit?: string;
  type?: "line" | "area" | "bar";
}

export interface ChartDatum {
  date?: string;
  month?: string;
  [key: string]: string | number | undefined;
}

interface TooltipEntry {
  value?: string | number;
  name?: string;
  dataKey?: string | number;
  color?: string;
  stroke?: string;
  fill?: string;
}

// Custom modern tooltip component using shadcn semantic tokens
function CustomTooltipContent({
  active,
  payload,
  label,
  unit,
}: {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string;
  unit?: string;
}) {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="rounded-xl border border-border bg-popover px-3.5 py-2.5 shadow-xl backdrop-blur-md">
      <div className="mb-1.5 text-xs font-semibold text-muted-foreground">
        {label}
      </div>
      <div className="flex flex-col gap-1">
        {payload.map((entry, index) => {
          const val = entry.value;
          return (
            <div key={`tooltip-item-${index}`} className="flex items-center justify-between gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: entry.color || entry.stroke || entry.fill }}
                />
                <span className="font-medium text-popover-foreground">
                  {entry.name || entry.dataKey}
                </span>
              </div>
              <span className="font-bold text-popover-foreground tabular-nums">
                {typeof val === "number" ? val.toLocaleString() : val}
                {unit ? ` ${unit}` : ""}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function TimeSeriesChart({
  data,
  xKey,
  series,
  unit,
  type = "line",
  height = 280,
  referenceValue,
  referenceLabel,
}: {
  data: ChartDatum[];
  xKey: string;
  series: SeriesDef[];
  unit?: string;
  type?: "line" | "area";
  height?: number;
  referenceValue?: number;
  referenceLabel?: string;
}) {
  // Unique gradient prefix: several charts share series keys (e.g. "value"),
  // and duplicate SVG ids would resolve fills to the wrong chart.
  const gradPrefix = useId().replace(/[^a-zA-Z0-9]/g, "");
  if (!data || !data.length) {
    return (
      <div className="flex h-48 items-center justify-center text-xs text-muted-foreground">
        No chart data available for this range.
      </div>
    );
  }

  const heightClass = height === 240 ? "h-[240px]" : height === 320 ? "h-[320px]" : "h-[280px]";

  return (
    <div className={`flex w-full min-w-0 ${heightClass}`}>
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        {type === "area" ? (
          <AreaChart data={data} margin={{ left: 0, right: 12, top: 12, bottom: 4 }}>
            <defs>
              {series.map((s, i) => {
                const color = s.color || colorFor(i);
                return (
                  <linearGradient key={`grad-${s.key}`} id={`grad-${gradPrefix}-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={color} stopOpacity={0.35} />
                    <stop offset="95%" stopColor={color} stopOpacity={0.0} />
                  </linearGradient>
                );
              })}
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" strokeOpacity={0.6} />
            <XAxis dataKey={xKey} tickLine={false} axisLine={false} minTickGap={32} tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} />
            <YAxis tickLine={false} axisLine={false} width={42} tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} unit={unit} domain={["auto", "auto"]} />
            <Tooltip content={<CustomTooltipContent unit={unit} />} />
            {referenceValue !== undefined && (
              <ReferenceLine y={referenceValue} stroke="var(--color-primary)" strokeDasharray="4 4" label={{ value: referenceLabel, fill: "var(--color-primary)", fontSize: 10, position: "top" }} />
            )}
            {series.map((s, i) => {
              const color = s.color || colorFor(i);
              return (
                <Area
                  key={s.key}
                  name={s.label}
                  dataKey={s.key}
                  type="monotone"
                  stroke={color}
                  fill={`url(#grad-${gradPrefix}-${s.key})`}
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 5, strokeWidth: 2, stroke: "#fff" }}
                />
              );
            })}
          </AreaChart>
        ) : (
          <LineChart data={data} margin={{ left: 0, right: 12, top: 12, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" strokeOpacity={0.6} />
            <XAxis dataKey={xKey} tickLine={false} axisLine={false} minTickGap={32} tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} />
            <YAxis tickLine={false} axisLine={false} width={42} tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} unit={unit} domain={["auto", "auto"]} />
            <Tooltip content={<CustomTooltipContent unit={unit} />} />
            {referenceValue !== undefined && (
              <ReferenceLine y={referenceValue} stroke="var(--color-primary)" strokeDasharray="4 4" label={{ value: referenceLabel, fill: "var(--color-primary)", fontSize: 10, position: "top" }} />
            )}
            {series.map((s, i) => {
              const color = s.color || colorFor(i);
              return (
                <Line
                  key={s.key}
                  name={s.label}
                  dataKey={s.key}
                  type="monotone"
                  stroke={color}
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 5, strokeWidth: 2, stroke: "#fff" }}
                />
              );
            })}
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

export function StackedAreaChart({
  data,
  xKey,
  series,
  unit,
  height = 280,
}: {
  data: ChartDatum[];
  xKey: string;
  series: SeriesDef[];
  unit?: string;
  height?: number;
}) {
  const gradPrefix = useId().replace(/[^a-zA-Z0-9]/g, "");
  if (!data || !data.length) {
    return (
      <div className="flex h-48 items-center justify-center text-xs text-muted-foreground">
        No stage data available.
      </div>
    );
  }

  const heightClass = height === 300 ? "h-[300px]" : "h-[280px]";

  return (
    <div className={`w-full min-w-0 ${heightClass}`}>
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <AreaChart data={data} margin={{ left: 0, right: 12, top: 12, bottom: 4 }}>
          <defs>
            {series.map((s, i) => {
              const color = s.color || colorFor(i);
              return (
                <linearGradient key={`grad-stacked-${s.key}`} id={`grad-stacked-${gradPrefix}-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.7} />
                  <stop offset="95%" stopColor={color} stopOpacity={0.3} />
                </linearGradient>
              );
            })}
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" strokeOpacity={0.6} />
          <XAxis dataKey={xKey} tickLine={false} axisLine={false} minTickGap={32} tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} />
          <YAxis tickLine={false} axisLine={false} width={42} tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} unit={unit} />
          <Tooltip content={<CustomTooltipContent unit={unit} />} />
          <Legend wrapperStyle={{ paddingTop: "12px", fontSize: "12px" }} />
          {series.map((s, i) => {
            const color = s.color || colorFor(i);
            return (
              <Area
                key={s.key}
                name={s.label}
                dataKey={s.key}
                type="monotone"
                stackId="1"
                stroke={color}
                fill={`url(#grad-stacked-${gradPrefix}-${s.key})`}
                strokeWidth={1.5}
              />
            );
          })}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function MonthlyBarChart({
  data,
  xKey,
  series,
  unit,
  height = 280,
  stacked = false,
}: {
  data: ChartDatum[];
  xKey: string;
  series: SeriesDef[];
  unit?: string;
  height?: number;
  stacked?: boolean;
}) {
  if (!data || !data.length) {
    return (
      <div className="flex h-48 items-center justify-center text-xs text-muted-foreground">
        No bar chart data available.
      </div>
    );
  }

  const heightClass = height === 260 ? "h-[260px]" : "h-[280px]";

  return (
    <div className={`w-full min-w-0 ${heightClass}`}>
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <BarChart data={data} margin={{ left: 0, right: 12, top: 12, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" strokeOpacity={0.6} />
          <XAxis dataKey={xKey} tickLine={false} axisLine={false} minTickGap={20} tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} />
          <YAxis tickLine={false} axisLine={false} width={48} tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} unit={unit} />
          <Tooltip content={<CustomTooltipContent unit={unit} />} />
          {series.length > 1 && <Legend wrapperStyle={{ paddingTop: "12px", fontSize: "12px" }} />}
          {series.map((s, i) => {
            const color = s.color || colorFor(i);
            return (
              <Bar
                key={s.key}
                name={s.label}
                dataKey={s.key}
                stackId={stacked ? "a" : undefined}
                fill={color}
                radius={stacked ? [0, 0, 0, 0] : [4, 4, 0, 0]}
              />
            );
          })}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DistributionChart({
  data,
  nameKey = "name",
  valueKey = "value",
  height = 260,
}: {
  data: { name: string; value: number; color?: string }[];
  nameKey?: string;
  valueKey?: string;
  height?: number;
}) {
  if (!data || !data.length) {
    return (
      <div className="flex h-48 items-center justify-center text-xs text-muted-foreground">
        No distribution data available.
      </div>
    );
  }

  const heightClass = height === 280 ? "h-[280px]" : "h-[260px]";

  return (
    <div className={`w-full min-w-0 ${heightClass}`}>
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <PieChart>
          <Tooltip content={<CustomTooltipContent />} />
          <Pie
            data={data}
            dataKey={valueKey}
            nameKey={nameKey}
            innerRadius={55}
            outerRadius={88}
            paddingAngle={3}
          >
            {data.map((d, i) => (
              <Cell key={`cell-${i}`} fill={d.color || colorFor(i + 2)} stroke="transparent" />
            ))}
          </Pie>
          <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function WeekdayComparisonChart({
  data,
  height = 240,
}: {
  data: { category: string; Weekday: number; Weekend: number; unit?: string }[];
  height?: number;
}) {
  const heightClass = height === 280 ? "h-[280px]" : "h-[240px]";

  return (
    <div className={`w-full min-w-0 ${heightClass}`}>
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <BarChart data={data} margin={{ left: 0, right: 12, top: 12, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" strokeOpacity={0.6} />
          <XAxis dataKey="category" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} />
          <YAxis tickLine={false} axisLine={false} width={44} tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} />
          <Tooltip content={<CustomTooltipContent />} />
          <Legend wrapperStyle={{ paddingTop: "8px", fontSize: "12px" }} />
          <Bar name="Weekday" dataKey="Weekday" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
          <Bar name="Weekend" dataKey="Weekend" fill="var(--color-chart-2)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
