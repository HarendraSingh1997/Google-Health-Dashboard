"use client";

import { MapContainer, TileLayer, CircleMarker, Tooltip } from "react-leaflet";
import "leaflet/dist/leaflet.css";

function altColor(t: number): string {
  const a = [227, 242, 253];
  const b = [13, 71, 161];
  const r = Math.round(a[0] + (b[0] - a[0]) * t);
  const g = Math.round(a[1] + (b[1] - a[1]) * t);
  const bl = Math.round(a[2] + (b[2] - a[2]) * t);
  return `rgb(${r}, ${g}, ${bl})`;
}

export default function LeafletMap({
  points,
}: {
  points: { date: string; lat: number; lng: number; alt: number | null; count: number }[];
}) {
  if (!points.length) {
    return <div className="grid h-[400px] place-items-center text-sm text-muted-foreground">No locations in this period.</div>;
  }
  const sumLat = points.reduce((a, p) => a + p.lat, 0);
  const sumLng = points.reduce((a, p) => a + p.lng, 0);
  const center: [number, number] = [sumLat / points.length, sumLng / points.length];
  const alts = points.map((p) => p.alt ?? 0).filter((a) => a > 0);
  const min = alts.length ? Math.min(...alts) : 0;
  const max = alts.length ? Math.max(...alts) : 1;

  return (
    <MapContainer center={center} zoom={11} scrollWheelZoom={false} className="h-[400px] w-full rounded-2xl z-0">
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      {points.map((p, i) => {
        const ratio = max > min && p.alt != null ? (p.alt - min) / (max - min) : 0.5;
        const c = altColor(ratio);
        return (
          <CircleMarker
            key={i}
            center={[p.lat, p.lng]}
            radius={7}
            pathOptions={{ color: c, weight: 1, fillColor: c, fillOpacity: 0.75 }}
          >
            <Tooltip direction="top">
              <div className="text-xs">
                <div className="font-medium">{p.date}</div>
                <div>lat {p.lat.toFixed(4)}, lng {p.lng.toFixed(4)}</div>
                <div>elev {p.alt} m · {p.count} fixes</div>
              </div>
            </Tooltip>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
