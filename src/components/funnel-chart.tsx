"use client";

import { FunnelChart, Funnel, LabelList, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { colorFor } from "@/lib/palette";

export function FunnelChartView({ data }: { data: { stage: string; value: number }[] }) {
  const height = 260;
  return (
    // Explicit pixel height on both wrapper and ResponsiveContainer: percentage
    // heights measure -1 on first paint / inside tab panels.
    <div className="relative w-full min-w-0 overflow-hidden" style={{ height, minHeight: height }}>
      <ResponsiveContainer width="100%" height={height} minWidth={0} minHeight={height}>
      <FunnelChart>
        <Tooltip content={({ active, payload }) => {
          if (!active || !payload?.length) return null;
          const p = payload[0]?.payload as { stage?: string; value?: number | string } | undefined;
          if (!p) return null;
          return (
            <div className="rounded-md border bg-white p-2 text-xs shadow">
              <div className="font-medium">{p.stage}</div>
              <div>{p.value}</div>
            </div>
          );
        }} />
        <Funnel dataKey="value" data={data} isAnimationActive>
          <LabelList position="right" fill="#0D47A1" stroke="none" dataKey="stage" fontSize={12} />
          <LabelList position="left" fill="#0D47A1" stroke="none" dataKey="value" fontSize={12} />
          {data.map((_, i) => (
            <Cell key={i} fill={colorFor(i + 1)} />
          ))}
        </Funnel>
      </FunnelChart>
      </ResponsiveContainer>
    </div>
  );
}
