"use client";

import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { LocateFixed } from "lucide-react";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";

export interface LatLng { lat: number; lng: number }

const pin = L.divIcon({
  className: "", iconSize: [28, 28], iconAnchor: [14, 28],
  html: '<span style="display:block;width:28px;height:28px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:#5b47d6;border:3px solid #fff;box-shadow:0 1px 6px rgba(0,0,0,.5)"></span>',
});

/** Tap-to-place map used by "suggest a place" and the owner dashboard. */
export default function LocationPicker({ value, onChange, center, hint, myLocation }: {
  value: LatLng | null; onChange: (v: LatLng) => void; center: LatLng; hint: string; myLocation: string;
}) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const marker = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (!el.current || map.current) return;
    const m = L.map(el.current).setView(value ?? center, value ? 16 : 13);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' }).addTo(m);
    m.on("click", (e) => onChange({ lat: +e.latlng.lat.toFixed(6), lng: +e.latlng.lng.toFixed(6) }));
    map.current = m;
    return () => { m.remove(); map.current = null; marker.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!map.current || !value) return;
    if (!marker.current) marker.current = L.marker(value, { icon: pin, draggable: true })
      .on("dragend", (e) => { const p = (e.target as L.Marker).getLatLng(); onChange({ lat: +p.lat.toFixed(6), lng: +p.lng.toFixed(6) }); })
      .addTo(map.current);
    else marker.current.setLatLng(value);
  }, [value, onChange]);

  const locate = () => navigator.geolocation?.getCurrentPosition((p) => {
    const v = { lat: +p.coords.latitude.toFixed(6), lng: +p.coords.longitude.toFixed(6) };
    onChange(v); map.current?.setView(v, 17);
  }, () => {}, { enableHighAccuracy: true, timeout: 10_000 });

  return (
    <div className="space-y-2">
      <div ref={el} className="z-0 h-64 overflow-hidden rounded-xl border" role="application" aria-label={hint} />
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">{value ? `${value.lat}, ${value.lng}` : hint}</p>
        <Button type="button" size="sm" variant="outline" onClick={locate}><LocateFixed aria-hidden />{myLocation}</Button>
      </div>
    </div>
  );
}
