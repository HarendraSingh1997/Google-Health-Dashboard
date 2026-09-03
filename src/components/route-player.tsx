"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { Play, Pause, RotateCcw, Route as RouteIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { GeoTrackSession } from "@/lib/types";
import { formatNumber } from "@/lib/format";
import type { LatLng } from "./route-map";

const RouteMap = dynamic(() => import("./route-map"), {
  ssr: false,
  loading: () => (
    <div className="grid h-[380px] place-items-center rounded-2xl border border-border text-sm text-muted-foreground">
      Loading map…
    </div>
  ),
});

// Full route traverse takes ~30s at 1x speed, regardless of session length.
const BASE_TRAVERSE_SECONDS = 30;
const SPEEDS = [0.5, 1, 2, 4] as const;

function formatClock(epochMs: number): string {
  const d = new Date(epochMs);
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")} UTC`;
}

function formatDuration(totalSec: number): string {
  const s = Math.max(0, Math.round(totalSec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

function formatDist(meters: number): string {
  if (meters >= 1000) return `${(meters / 1000).toFixed(2)} km`;
  return `${formatNumber(Math.round(meters))} m`;
}

function haversineM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export function RoutePlayer({ tracks }: { tracks: GeoTrackSession[] }) {
  const [selected, setSelected] = React.useState(0);
  const [pos, setPos] = React.useState(0); // float index into session.points
  const [playing, setPlaying] = React.useState(true);
  const [speed, setSpeed] = React.useState<number>(1);
  // Ref mirror of pos so the rAF loop can stop itself at the end without
  // impure setState updaters.
  const posRef = React.useRef(0);

  // Clamp during render (no setState-in-effect): the filtered list can shrink
  // or be replaced when the dashboard range changes.
  const safeSelected = tracks.length ? Math.min(selected, tracks.length - 1) : 0;
  const session = tracks.length ? tracks[safeSelected] : null;

  const n = session?.points.length ?? 0;
  const durationSec = session && session.points.length ? session.points[session.points.length - 1][3] : 0;

  // Cumulative path distance per point (for "distance covered" readout).
  const cumDist = React.useMemo(() => {
    if (!session) return [0];
    const cum: number[] = [0];
    for (let i = 1; i < session.points.length; i++) {
      const a = session.points[i - 1];
      const b = session.points[i];
      cum.push(cum[i - 1] + haversineM(a[0], a[1], b[0], b[1]));
    }
    return cum;
  }, [session]);

  // requestAnimationFrame playback loop: advance float position at a constant
  // points-per-second rate so every session animates start → end in ~30s @1x.
  React.useEffect(() => {
    if (!playing || !session || n < 2) return;
    let raf = 0;
    let last = performance.now();
    const rate = ((n - 1) / BASE_TRAVERSE_SECONDS) * speed;
    const tick = (now: number) => {
      // Clamp both ends: rAF timestamps can predate performance.now() sampled
      // in the effect (negative dt), which would drive pos below 0 and crash
      // the position lookup with index -1.
      const dt = Math.min(0.25, Math.max(0, (now - last) / 1000)); // clamp tab-switch jumps
      last = now;
      const next = Math.min(posRef.current + dt * rate, n - 1);
      posRef.current = next;
      setPos(next);
      if (next >= n - 1) {
        setPlaying(false);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, speed, session, n]);

  // Defense in depth: pos must always resolve to a valid point index, even if
  // a non-finite or out-of-range value ever slips through (slider, rAF edge).
  const safePos = n > 1 && Number.isFinite(pos) ? Math.min(Math.max(0, pos), n - 1) : 0;

  const { traveled, current, elapsedSec, distCovered } = React.useMemo(() => {
    if (!session || !session.points.length) {
      return { traveled: [] as LatLng[], current: [0, 0] as LatLng, elapsedSec: 0, distCovered: 0 };
    }
    const len = session.points.length;
    const i = Math.min(Math.max(0, Math.floor(safePos)), len - 1);
    const j = Math.min(i + 1, len - 1);
    const frac = Math.min(1, Math.max(0, safePos - i));
    const a = session.points[i];
    const b = session.points[j];
    const cur: LatLng = [a[0] + (b[0] - a[0]) * frac, a[1] + (b[1] - a[1]) * frac];
    const tr: LatLng[] = session.points.slice(0, i + 1).map((p) => [p[0], p[1]]);
    tr.push(cur);
    return {
      traveled: tr,
      current: cur,
      elapsedSec: a[3] + (b[3] - a[3]) * frac,
      distCovered: cumDist[i] + (cumDist[j] - cumDist[i]) * frac,
    };
  }, [session, safePos, cumDist]);

  if (!session) {
    return (
      <Card className="w-full rounded-3xl border border-border bg-card p-5 shadow-sm">
        <CardHeader className="p-0 pb-4">
          <CardTitle className="text-base font-bold text-card-foreground">
            Session Route Replay
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            No GPS sessions with movement in this range.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="grid h-[200px] place-items-center rounded-2xl border border-dashed border-border text-xs text-muted-foreground">
            No sessions to animate — widen the date range.
          </div>
        </CardContent>
      </Card>
    );
  }

  const progressPct = n > 1 ? Math.round((safePos / (n - 1)) * 100) : 0;

  const selectSession = (idx: number) => {
    setSelected((idx + tracks.length) % tracks.length);
    posRef.current = 0;
    setPos(0);
    setPlaying(true);
  };

  const setPlaybackPos = (v: number) => {
    const clamped = Number.isFinite(v) ? Math.min(Math.max(0, v), Math.max(0, n - 1)) : 0;
    posRef.current = clamped;
    setPos(clamped);
  };

  return (
    <Card className="w-full rounded-3xl border border-border bg-card p-5 shadow-sm">
      <CardHeader className="p-0 pb-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-base font-bold text-card-foreground">
              <RouteIcon className="h-4 w-4 text-primary" />
              Session Route Replay
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Animated motion from start point to end point · {tracks.length} session{tracks.length === 1 ? "" : "s"} in this view.
            </CardDescription>
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 rounded-xl p-0"
              onClick={() => selectSession(safeSelected - 1)}
              disabled={tracks.length < 2}
              aria-label="Previous session"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="min-w-14 text-center text-xs font-semibold tabular-nums">
              {safeSelected + 1} / {tracks.length}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 rounded-xl p-0"
              onClick={() => selectSession(safeSelected + 1)}
              disabled={tracks.length < 2}
              aria-label="Next session"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
          {/* Session list */}
          <div className="order-2 lg:order-1">
            <div className="flex max-h-44 flex-col gap-1.5 overflow-y-auto pr-1 lg:max-h-[452px]">
              {tracks.map((t, idx) => {
                const active = idx === safeSelected;
                const dur = t.points.length ? t.points[t.points.length - 1][3] : 0;
                return (
                  <button
                    key={`${t.start}-${idx}`}
                    onClick={() => selectSession(idx)}
                    className={`rounded-xl border p-2.5 text-left transition-all ${
                      active
                        ? "border-primary bg-primary/10 shadow-xs"
                        : "border-border bg-muted/40 hover:border-primary/50 hover:bg-muted"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-foreground">{t.date}</span>
                      {t.activity && (
                        <Badge variant={active ? "default" : "secondary"} className="px-1.5 py-0 text-[10px] font-semibold">
                          {t.activity}
                        </Badge>
                      )}
                    </div>
                    <div className="mt-1 text-[11px] tabular-nums text-muted-foreground">
                      {formatClock(t.start)} → {formatClock(t.end)} · {formatDist(t.distanceM)} · {formatDuration(dur)}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Map + playback controls */}
          <div className="order-1 lg:order-2">
            <RouteMap session={session} traveled={traveled} current={current} />

            <div className="mt-3 rounded-2xl border border-border bg-muted/40 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  className="h-8 gap-1.5 rounded-xl text-xs font-semibold"
                  onClick={() => {
                    if (safePos >= n - 1) setPlaybackPos(0);
                    setPlaying((p) => !p);
                  }}
                >
                  {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                  {playing ? "Pause" : safePos >= n - 1 ? "Replay" : "Play"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 rounded-xl text-xs"
                  onClick={() => {
                    setPlaybackPos(0);
                    setPlaying(true);
                  }}
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Restart
                </Button>

                <div className="flex items-center gap-1">
                  {SPEEDS.map((s) => (
                    <button
                      key={s}
                      onClick={() => setSpeed(s)}
                      className={`rounded-lg px-2 py-1 text-[11px] font-bold tabular-nums transition-all ${
                        speed === s
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                      }`}
                    >
                      {s}×
                    </button>
                  ))}
                </div>

                <div className="ml-auto flex items-center gap-2 text-[11px] font-semibold tabular-nums text-muted-foreground">
                  <span className="text-foreground">{formatDuration(elapsedSec)}</span>
                  <span>/ {formatDuration(durationSec)}</span>
                  <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-primary">
                    {progressPct}%
                  </span>
                </div>
              </div>

              <input
                type="range"
                min={0}
                max={Math.max(1, n - 1)}
                step={0.1}
                value={safePos}
                onChange={(e) => setPlaybackPos(Number(e.target.value))}
                className="mt-2.5 w-full accent-primary"
                aria-label="Route playback position"
              />

              <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] tabular-nums text-muted-foreground">
                <span>
                  <span className="font-semibold text-emerald-600">● Start</span> {formatClock(session.start)}
                </span>
                <span>
                  <span className="font-semibold text-red-600">● Finish</span> {formatClock(session.end)}
                </span>
                <span className="ml-auto">
                  Covered <span className="font-semibold text-foreground">{formatDist(distCovered)}</span>
                  {" "}of {formatDist(session.distanceM)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
