"use client";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function Heatmap({
  data,
  title,
  subtitle,
}: {
  data: number[][]; // [day][hour]
  title?: string;
  subtitle?: string;
}) {
  const max = Math.max(1, ...data.flat());

  const getIntensityClass = (v: number) => {
    if (v === 0) return "bg-muted";
    const ratio = v / max;
    if (ratio < 0.25) return "bg-primary/25";
    if (ratio < 0.5) return "bg-primary/50";
    if (ratio < 0.75) return "bg-primary/75";
    return "bg-primary";
  };

  return (
    <div>
      {title && <div className="mb-2 text-sm font-semibold text-foreground">{title}</div>}
      {subtitle && <div className="mb-3 text-xs text-muted-foreground">{subtitle}</div>}
      <div className="overflow-x-auto">
        <div className="min-w-[640px]">
          <div className="flex">
            <div className="w-10 shrink-0" />
            <div className="grid flex-1 grid-cols-[repeat(24,minmax(0,1fr))] gap-[2px]">
              {Array.from({ length: 24 }).map((_, h) => (
                <div key={h} className="text-center text-[9px] text-muted-foreground">
                  {h % 3 === 0 ? h : ""}
                </div>
              ))}
            </div>
          </div>
          {data.map((row, d) => (
            <div key={d} className="flex items-center">
              <div className="w-10 shrink-0 pr-1 text-right text-[10px] text-muted-foreground">{DAYS[d]}</div>
              <div className="grid flex-1 grid-cols-[repeat(24,minmax(0,1fr))] gap-[2px]">
                {row.map((v, h) => (
                  <div
                    key={h}
                    title={`${DAYS[d]} ${h}:00 — ${v} fixes`}
                    className={`aspect-square rounded-[2px] ${getIntensityClass(v)}`}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2 text-[10px] text-muted-foreground">
        <span>Less</span>
        <div className="h-3 w-3 rounded-[2px] bg-muted" />
        <div className="h-3 w-3 rounded-[2px] bg-primary/25" />
        <div className="h-3 w-3 rounded-[2px] bg-primary/50" />
        <div className="h-3 w-3 rounded-[2px] bg-primary/75" />
        <div className="h-3 w-3 rounded-[2px] bg-primary" />
        <span>More</span>
      </div>
    </div>
  );
}
