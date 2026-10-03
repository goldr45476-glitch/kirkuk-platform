"use client";

import { ArrowRight, Dices, LocateFixed, RotateCcw, Sparkles } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { Badge, Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { formatClock } from "@/lib/format-time";
import type { Locale, Recommendation } from "@/lib/types";
import { cn } from "@/lib/utils";
import { recommendAction } from "./actions";

type Aud = "family" | "couple" | "friends" | "kids" | "solo";
const AUDS: Aud[] = ["family", "couple", "friends", "kids", "solo"];
const EMOJI: Record<Aud, string> = { family: "👨‍👩‍👧", couple: "💑", friends: "🧑‍🤝‍🧑", kids: "🧒", solo: "🚶" };
const DISTS = ["2", "5", "10", "any"] as const;

export function WhereWizard({ t, locale, amenities }: { t: Dictionary; locale: Locale; amenities: Record<string, string> }) {
  const w = t.where;
  const [step, setStep] = useState(0);
  const [aud, setAud] = useState<Aud | null>(null);
  const [budget, setBudget] = useState<number | null>(null);
  const [dist, setDist] = useState<(typeof DISTS)[number]>("5");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geo, setGeo] = useState<"idle" | "busy" | "denied">("idle");
  const [results, setResults] = useState<Recommendation[] | null>(null);
  const [seen, setSeen] = useState<string[]>([]);
  const [pending, start] = useTransition();

  const locate = () => {
    if (!navigator.geolocation) return setGeo("denied");
    setGeo("busy");
    navigator.geolocation.getCurrentPosition(
      (p) => { setCoords({ lat: +p.coords.latitude.toFixed(5), lng: +p.coords.longitude.toFixed(5) }); setGeo("idle"); },
      () => setGeo("denied"), { enableHighAccuracy: true, timeout: 10_000 },
    );
  };

  const run = (random: boolean, exclude: string[] = []) => start(async () => {
    const r = await recommendAction({
      audience: aud, budget, maxKm: dist === "any" ? null : Number(dist),
      lat: coords?.lat ?? null, lng: coords?.lng ?? null, random, exclude,
    });
    setResults(r); setSeen((s) => [...new Set([...s, ...r.map((x) => x.id)])]); setStep(3);
  });
  const reset = () => { setStep(0); setAud(null); setBudget(null); setResults(null); setSeen([]); };

  const big = "flex min-h-24 flex-col items-center justify-center gap-1 rounded-2xl border-2 bg-card p-3 text-center text-sm font-bold transition";
  const reasons = (r: Recommendation) => [
    r.closes_at ? w.reasonOpenUntil.replace("{time}", formatClock(r.closes_at, locale)) : w.reasonOpen,
    r.audience ? w.reasonAudience[r.audience as Aud] : null,
    r.distance_km != null ? `${w.reasonKm.replace("{km}", r.distance_km.toFixed(1))}${coords ? "" : ` ${w.reasonFrom}`}` : null,
    r.rating_count > 0 ? w.reasonBest.replace("{rating}", Number(r.rating_avg).toFixed(1)) : null,
    ...r.amenities.slice(0, 2).map((a) => amenities[a]).filter(Boolean),
  ].filter(Boolean) as string[];

  return (
    <div className="mx-auto max-w-xl space-y-5">
      {step < 3 && (
        <div className="flex gap-1.5" aria-hidden>{[0, 1, 2].map((i) => <span key={i} className={cn("h-1.5 flex-1 rounded-full", i <= step ? "bg-primary" : "bg-muted")} />)}</div>
      )}

      {step === 0 && (
        <section className="space-y-3">
          <h2 className="text-xl font-extrabold">{w.q1}</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {AUDS.map((a) => (
              <button key={a} onClick={() => { setAud(a); setStep(1); }} className={cn(big, aud === a ? "border-primary bg-primary/10" : "border-transparent hover:border-primary/40")}>
                <span className="text-3xl" aria-hidden>{EMOJI[a]}</span>{w.audiences[a]}
              </button>
            ))}
          </div>
        </section>
      )}

      {step === 1 && (
        <section className="space-y-3">
          <h2 className="text-xl font-extrabold">{w.q2}</h2>
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((b) => (
              <button key={b} onClick={() => { setBudget(b); setStep(2); }} className={cn(big, budget === b ? "border-primary bg-primary/10" : "border-transparent hover:border-primary/40")}>
                <span className="text-2xl font-extrabold text-primary" dir="ltr">{"$".repeat(b)}</span>{w.budgets[String(b) as "1"]}
              </button>
            ))}
          </div>
          <Button variant="ghost" onClick={() => setStep(0)}>{w.back}</Button>
        </section>
      )}

      {step === 2 && (
        <section className="space-y-3">
          <h2 className="text-xl font-extrabold">{w.q3}</h2>
          <div className="grid grid-cols-2 gap-3">
            {DISTS.map((d) => (
              <button key={d} onClick={() => setDist(d)} aria-pressed={dist === d} className={cn(big, dist === d ? "border-primary bg-primary/10" : "border-transparent hover:border-primary/40")}>{w.distances[d]}</button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={locate} disabled={geo === "busy" || !!coords}><LocateFixed aria-hidden />{geo === "busy" ? w.locating : w.useLocation}</Button>
            <span className="text-xs text-muted-foreground">{geo === "denied" ? w.denied : coords ? "✓" : w.cityCenter}</span>
          </div>
          <div className="flex gap-2">
            <Button size="lg" className="flex-1" disabled={pending} onClick={() => run(false)}><Sparkles aria-hidden />{w.suggest}</Button>
            <Button size="lg" variant="accent" disabled={pending} onClick={() => run(true)}><Dices aria-hidden />{w.surprise}</Button>
          </div>
          <Button variant="ghost" onClick={() => setStep(1)}>{w.back}</Button>
        </section>
      )}

      {step === 3 && results && (
        <section className="space-y-3" aria-live="polite">
          {results.length === 0 ? <Card className="p-5 text-center text-muted-foreground">{w.noResults}</Card> : (
            <>
              <h2 className="text-xl font-extrabold">{w.results}</h2>
              {results.map((r) => (
                <Card key={r.id} className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="text-lg font-extrabold leading-tight"><Link href={`/business/${r.slug}`} className="hover:underline">{r.name}</Link></h3>
                      {r.district && <p className="text-xs text-muted-foreground">{r.district}</p>}
                    </div>
                    {r.price_level && <span className="font-extrabold text-primary" dir="ltr">{"$".repeat(r.price_level)}</span>}
                  </div>
                  <p className="text-xs font-bold text-muted-foreground">{w.why}</p>
                  <div className="flex flex-wrap gap-1.5">{reasons(r).map((x) => <Badge key={x} tone="primary">{x}</Badge>)}</div>
                  <div className="flex gap-2">
                    {r.phone && <Button asChild className="flex-1"><a href={`tel:${r.phone}`}>{t.common.call}</a></Button>}
                    <Button asChild variant="outline" className="flex-1"><Link href={`/business/${r.slug}`}>{t.map.viewPage}<ArrowRight className="rtl:-scale-x-100" aria-hidden /></Link></Button>
                  </div>
                </Card>
              ))}
            </>
          )}
          <div className="flex flex-wrap gap-2">
            <Button variant="accent" disabled={pending} onClick={() => run(true, seen)}><Dices aria-hidden />{w.another}</Button>
            <Button variant="ghost" onClick={reset}><RotateCcw aria-hidden />{w.again}</Button>
          </div>
        </section>
      )}
    </div>
  );
}
