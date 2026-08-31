"use client";

import dynamic from "next/dynamic";

const LeafletMap = dynamic(() => import("./leaflet-map"), {
  ssr: false,
  loading: () => <div className="grid h-[400px] place-items-center text-sm text-muted-foreground">Loading map…</div>,
});

export function GeoMap({
  points,
}: {
  points: { date: string; lat: number; lng: number; alt: number | null; count: number }[];
}) {
  return <LeafletMap points={points} />;
}
