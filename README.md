# Google Health Dashboard — Fitbit Takeout Analytics

Interactive Next.js dashboard for your **Google Health / Fitbit Takeout** export. Parses thousands of CSV/JSON files into aggregated JSON and renders full-width responsive charts, OpenStreetMap, heatmap, funnel and sortable data tables — all with **shadcn** UI.

> Built with `pnpm dlx shadcn@latest init --preset buKEvLs --template next` · Next.js 16 (Turbopack) · Tailwind v4 · Recharts 3 · Leaflet 1.9 + react-leaflet 5 · TanStack Table 8

## Features

**Tabs (separate per category):** Overview · Sleep & Recovery · Activity & Workouts · Cardiovascular & Vitals · Stress & Mind · Geo & Elevation · Badges · Data Explorer

| Area | Charts & Visuals |
|------|------------------|
| **Sleep** | Sleep score / deep sleep / nocturnal RHR (line), stacked sleep stages (area), deep sleep, skin temperature |
| **Activity** | Daily steps/calories (area), intensity minutes (stacked area), monthly Active Zone Minutes (stacked bar), workouts table |
| **Cardio** | Resting HR, HRV, VO2 Max, SpO2, respiratory rate (line/area) |
| **Stress** | Daily stress score (area), status distribution (pie), moods (pie) |
| **Geo** | OpenStreetMap (Leaflet + OSM tiles) — GPS centroids colored by elevation, 24×7 activity heatmap, training-intensity funnel |
| **Overview** | Health-score hero, personal-records banner, weekday vs weekend comparison, insights feed, 8 metric cards with sparklines |

**Filters:** preset range (All / 1Y / 90D / 30D / 7D) + granular **Year / Month / Week** selectors (`shadcn Select`) — every chart, KPI, funnel, map and table re-filters. Reset button.

**Tables:** canonical **shadcn data-table** (`@tanstack/react-table` + `src/components/ui/table`): sortable headers, pagination, `Previous`/`Next`. One per dataset plus a Data Explorer tab with metric picker.

**Palette**
`#E3F2FD` · `#90CAF9` · `#2196F3` · `#0D47A1` extended with `#64B5F6 #42A5F5 #1976D2 #1565C0 #0288D1 #01579B #4FC3F7 #82B1FF` + accents `#26A69A #FFA726 #AB47BC #EC407A #66BB6A` — applied via `src/lib/palette.ts`.

**Cards:** `Card` (`src/components/ui/card.tsx`) patched to `w-full` + chart wrappers `flex w-full min-w-0 h-[280px]` with `ResponsiveContainer minWidth={0}` — full-width responsive, no `aspect-video` clipping.

## Data Pipeline

```
Takeout 2/Google Health/**  →  scripts/build-data.mjs  →  public/data/health.json (513 KB)
```

Aggregates from:
* `Sleep Score/sleep_score.csv`, `Stress Score/Stress Score.csv`
* `Physical Activity_GoogleData/daily_*.csv`, `Active Zone Minutes (AZM)/*.csv`, `gps_location_*.csv`
* `Global Export Data/altitude-*.json`, steps/calories JSON

Run manually:

```bash
pnpm run build:data   # node scripts/build-data.mjs
```

`predev`/`prebuild` run it automatically.

## Getting Started

```bash
cd health-dashboard
pnpm install
pnpm dev          # http://localhost:3000  (runs build:data first)
pnpm build        # next build (Turbopack)
pnpm start        # serve production
```

The project lives at `Google-Health-Data/health-dashboard` so the build script can reference the sibling `Takeout 2/` folder via absolute path in `scripts/build-data.mjs`. Adjust `ROOT` there if you move the data.

## Project Structure

```
health-dashboard/
  scripts/build-data.mjs      # CSV/JSON aggregation
  public/data/health.json     # generated, git-tracked
  src/
    app/page.tsx              # server: loads health.json → <Dashboard data={data} />
    components/
      dashboard.tsx           # client: filters, Tabs, Cards, charts, DataTable, GeoMap
      charts.tsx              # TimeSeriesChart, StackedAreaChart, MonthlyBarChart, Pie, WeekdayComparison
      data-table.tsx          # shadcn data-table (TanStack) — sortable + paginated
      metric-card.tsx         # KPI card with sparkline + badge
      heatmap.tsx             # 7×24 activity heatmap
      leaflet-map.tsx / geo-map.tsx  # dynamic ssr:false OpenStreetMap
      funnel-chart.tsx        # AZM funnel
      workouts-table.tsx / badges-gallery.tsx / insights-card.tsx
      ui/{button,card,chart,select,table,tabs,badge,separator}
    lib/{filter.ts,insights.ts,palette.ts,types.ts,utils.ts}
```

## Tech Stack

* **Next.js 16.3.3** (App Router, Turbopack) / React 19 / TypeScript 5
* **shadcn** (preset `buKEvLs`) + Tailwind 4 + `tw-animate-css`
* **Recharts 3** + `@tanstack/react-table 8` + `leaflet` + `react-leaflet 5`
* **pnpm 9**

## Deploy

Push to `main` — Vercel auto-deploys Next.js. Or:

```bash
pnpm build && pnpm start
```

Export raw data from the header’s **Export JSON** button.

---
Built for Fitbit data portability — maps © OpenStreetMap contributors.
