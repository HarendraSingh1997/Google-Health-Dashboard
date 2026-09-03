"use client";

import { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Polyline, CircleMarker, Tooltip, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { GeoTrackSession } from "@/lib/types";

export type LatLng = [number, number];

function FitBounds({ session }: { session: GeoTrackSession }) {
  const map = useMap();
  useEffect(() => {
    const latlngs = session.points.map((p) => [p[0], p[1]] as LatLng);
    if (latlngs.length) {
      map.fitBounds(latlngs, { padding: [28, 28] });
    }
  }, [map, session]);
  return null;
}

export default function RouteMap({
  session,
  traveled,
  current,
}: {
  session: GeoTrackSession;
  /** Route already covered by the animation (includes current position). */
  traveled: LatLng[];
  /** Interpolated current position of the moving marker. */
  current: LatLng;
}) {
  const full = useMemo(
    () => session.points.map((p) => [p[0], p[1]] as LatLng),
    [session]
  );
  const center = useMemo<LatLng>(() => {
    const mid = session.points[Math.floor(session.points.length / 2)];
    return [mid[0], mid[1]];
  }, [session]);
  const startPt: LatLng = [session.points[0][0], session.points[0][1]];
  const last = session.points[session.points.length - 1];
  const endPt: LatLng = [last[0], last[1]];

  return (
    <MapContainer
      key={session.start}
      center={center}
      zoom={14}
      scrollWheelZoom={false}
      className="h-[380px] w-full rounded-2xl z-0"
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      <FitBounds session={session} />
      {/* Full route, faint */}
      <Polyline positions={full} pathOptions={{ color: "var(--color-muted-foreground)", weight: 3, opacity: 0.45 }} />
      {/* Traveled portion, highlighted */}
      {traveled.length > 1 && (
        <Polyline positions={traveled} pathOptions={{ color: "var(--color-primary)", weight: 4, opacity: 0.95 }} />
      )}
      {/* Start marker */}
      <CircleMarker
        center={startPt}
        radius={7}
        pathOptions={{ color: "#16a34a", weight: 2, fillColor: "#16a34a", fillOpacity: 0.9 }}
      >
        <Tooltip direction="top">Start</Tooltip>
      </CircleMarker>
      {/* End marker */}
      <CircleMarker
        center={endPt}
        radius={7}
        pathOptions={{ color: "#dc2626", weight: 2, fillColor: "#dc2626", fillOpacity: 0.9 }}
      >
        <Tooltip direction="top">Finish</Tooltip>
      </CircleMarker>
      {/* Moving position marker */}
      <CircleMarker
        center={current}
        radius={9}
        pathOptions={{ color: "#ffffff", weight: 3, fillColor: "var(--color-primary)", fillOpacity: 1 }}
      />
    </MapContainer>
  );
}
