"use client";

import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { LocateFixed } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { MapBusiness } from "@/lib/types";
import { cn } from "@/lib/utils";

const KIRKUK: [number, number] = [35.4681, 44.3922];
export interface MapCategory { slug: string; name: string; color: string }

const pin = (color: string, verified: boolean) =>
  L.divIcon({
    className: "",
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    html: `<span style="display:block;width:26px;height:26px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:${color};border:3px solid #fff;box-shadow:0 1px 6px rgba(0,0,0,.45);${verified ? "outline:2px solid #f59e0b;" : ""}"></span>`,
  });

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function km(a: [number, number], b: [number, number]) {
  const r = Math.PI / 180, dLat = (b[0] - a[0]) * r, dLng = (b[1] - a[1]) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * r) * Math.cos(b[0] * r) * Math.sin(dLng / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
}

export default function MapView({ businesses, categories, t }: { businesses: MapBusiness[]; categories: MapCategory[]; t: Dictionary["map"] }) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  const me = useRef<L.Marker | null>(null);
  const [active, setActive] = useState<string>("all");
  const [pos, setPos] = useState<[number, number] | null>(null);
  const [geo, setGeo] = useState<"idle" | "busy" | "denied">("idle");

  const visible = useMemo(() => businesses.filter((b) => active === "all" || b.root_slug === active), [businesses, active]);
  const nearest = useMemo(
    () => (pos ? [...visible].map((b) => ({ b, d: km(pos, [b.lat, b.lng]) })).sort((x, y) => x.d - y.d).slice(0, 5) : []),
    [pos, visible],
  );

  useEffect(() => {
    if (!el.current || map.current) return;
    map.current = L.map(el.current, { zoomControl: true }).setView(KIRKUK, 12);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map.current);
    layer.current = L.layerGroup().addTo(map.current);
    return () => { map.current?.remove(); map.current = null; };
  }, []);

  useEffect(() => {
    const g = layer.current;
    if (!g || !map.current) return;
    g.clearLayers();
    visible.forEach((b) => {
      const m = L.marker([b.lat, b.lng], { icon: pin(b.color, b.is_verified), title: b.name, alt: b.name });
      m.bindPopup(
        `<strong>${esc(b.name)}</strong>${b.address ? `<br><span>${esc(b.address)}</span>` : ""}<br><a href="/business/${encodeURIComponent(b.slug)}">${esc(t.viewPage)}</a>`,
      );
      m.addTo(g);
    });
    if (visible.length && !pos) map.current.fitBounds(L.latLngBounds(visible.map((b) => [b.lat, b.lng] as [number, number])).pad(0.15), { maxZoom: 15 });
  }, [visible, t.viewPage, pos]);

  const locate = () => {
    if (!navigator.geolocation) return setGeo("denied");
    setGeo("busy");
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const c: [number, number] = [p.coords.latitude, p.coords.longitude];
        setPos(c); setGeo("idle");
        me.current?.remove();
        me.current = L.marker(c, { icon: L.divIcon({ className: "", iconSize: [18, 18], html: '<span style="display:block;width:18px;height:18px;border-radius:50%;background:#2563eb;border:3px solid #fff;box-shadow:0 0 0 6px rgba(37,99,235,.25)"></span>' }) })
          .addTo(map.current!).bindPopup(esc(t.youAreHere));
        map.current!.setView(c, 15);
      },
      () => setGeo("denied"),
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  };

  const chip = (slug: string, label: string, color?: string) => (
    <button key={slug} onClick={() => setActive(slug)} aria-pressed={active === slug}
      className={cn("shrink-0 rounded-full border px-3 py-1.5 text-sm font-semibold transition", active === slug ? "border-transparent bg-primary text-primary-foreground" : "bg-card hover:bg-muted")}>
      {color && <span className="me-1.5 inline-block size-2.5 rounded-full align-middle" style={{ background: color }} />}{label}
    </button>
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto pb-1" role="group" aria-label={t.title}>
          {chip("all", t.all)}
          {categories.map((c) => chip(c.slug, c.name, c.color))}
        </div>
        <Button variant="accent" size="sm" onClick={locate} disabled={geo === "busy"} className="shrink-0">
          <LocateFixed aria-hidden />{geo === "busy" ? t.locating : t.nearMe}
        </Button>
      </div>
      {geo === "denied" && <p role="alert" className="text-sm font-semibold text-destructive">{t.locationDenied}</p>}
      <div className="grid gap-3 lg:grid-cols-[1fr_320px]">
        <div ref={el} className="z-0 h-[60dvh] min-h-80 overflow-hidden rounded-xl border lg:h-[70dvh]" role="application" aria-label={t.title} />
        <aside className="space-y-2">
          <p className="text-sm text-muted-foreground">{visible.length} {t.places}</p>
          {nearest.length > 0 && (
            <div className="rounded-xl border bg-card p-3">
              <h2 className="mb-2 font-extrabold">{t.nearest}</h2>
              <ol className="space-y-2">
                {nearest.map(({ b, d }) => (
                  <li key={b.id} className="flex items-center justify-between gap-2 text-sm">
                    <Link href={`/business/${b.slug}`} className="truncate font-semibold hover:underline">{b.name}</Link>
                    <span className="shrink-0 text-muted-foreground" dir="ltr">{d.toFixed(1)} km</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
