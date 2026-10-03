"use client";

import { useCallback, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label, Textarea } from "@/components/ui/input";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { cn } from "@/lib/utils";
import { submitPlaceAction } from "./actions";
import { LocationPicker, type LatLng } from "./location-picker-loader";

const sel = "h-11 w-full rounded-lg border border-input bg-card px-3 text-base";

export function SuggestForm({ t, categories, districts, center }: {
  t: Dictionary; categories: { id: number; label: string }[]; districts: { id: number; label: string }[]; center: LatLng;
}) {
  const s = t.suggest;
  const [step, setStep] = useState(1);
  const [f, setF] = useState({ name: "", categoryId: "", districtId: "", phone: "", address: "", description: "", isOwner: false });
  const [pos, setPos] = useState<LatLng | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();
  const set = (k: keyof typeof f, v: string | boolean) => setF((x) => ({ ...x, [k]: v }));
  const onPick = useCallback((v: LatLng) => setPos(v), []);

  const next = () => {
    if (f.name.trim().length < 2 || !f.categoryId) return setError(s.invalid);
    if (!pos) return setError(s.needLocation);
    setError(null); setStep(2);
  };
  const submit = () => start(async () => {
    const r = await submitPlaceAction({
      name: f.name, categoryId: Number(f.categoryId), lat: pos!.lat, lng: pos!.lng, districtId: f.districtId ? Number(f.districtId) : null,
      phone: f.phone, address: f.address, description: f.description, isOwner: f.isOwner,
    });
    if (!r.ok) return setError(r.error === "rate_limited" ? t.post.errors.rate_limited : r.error === "invalid" ? s.invalid : t.post.errors.generic);
    setDone(true);
  });

  if (done) return (
    <Card className="space-y-4 p-6 text-center">
      <p className="text-4xl" aria-hidden>🎉</p>
      <p role="status" className="font-bold">{s.sent}</p>
      <Button onClick={() => { setDone(false); setStep(1); setF({ name: "", categoryId: "", districtId: "", phone: "", address: "", description: "", isOwner: false }); setPos(null); }}>{s.another}</Button>
    </Card>
  );

  return (
    <div className="space-y-4">
      <div className="flex gap-1.5" aria-hidden>{[1, 2].map((i) => <span key={i} className={cn("h-1.5 flex-1 rounded-full", i <= step ? "bg-primary" : "bg-muted")} />)}</div>
      <p className="text-xs text-muted-foreground">{s.reviewNote}</p>
      <Card className="space-y-4 p-4">
        {step === 1 ? (
          <>
            <h2 className="font-extrabold">{s.step1}</h2>
            <div><Label htmlFor="sn">{s.name}</Label><Input id="sn" value={f.name} onChange={(e) => set("name", e.target.value)} maxLength={120} required /></div>
            <div><Label htmlFor="sc">{s.category}</Label>
              <select id="sc" value={f.categoryId} onChange={(e) => set("categoryId", e.target.value)} className={sel}><option value="">{s.pickCategory}</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</select></div>
            <div><Label>{s.pickLocation}</Label><LocationPicker value={pos} onChange={onPick} center={center} hint={s.tapMap} myLocation={s.myLocation} /></div>
            {error && <p role="alert" className="text-sm font-semibold text-destructive">{error}</p>}
            <Button className="w-full" size="lg" onClick={next}>{s.next}</Button>
          </>
        ) : (
          <>
            <h2 className="font-extrabold">{s.step2}</h2>
            <div><Label htmlFor="sd">{s.district}</Label><select id="sd" value={f.districtId} onChange={(e) => set("districtId", e.target.value)} className={sel}><option value="">—</option>{districts.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}</select></div>
            <div><Label htmlFor="sp">{s.phone}</Label><Input id="sp" type="tel" dir="ltr" className="text-start" value={f.phone} onChange={(e) => set("phone", e.target.value)} placeholder="07701234567" /></div>
            <div><Label htmlFor="sa">{s.address}</Label><Input id="sa" value={f.address} onChange={(e) => set("address", e.target.value)} maxLength={200} /></div>
            <div><Label htmlFor="sx">{s.description}</Label><Textarea id="sx" value={f.description} onChange={(e) => set("description", e.target.value)} maxLength={1000} /></div>
            <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={f.isOwner} onChange={(e) => set("isOwner", e.target.checked)} className="size-5 accent-[hsl(var(--primary))]" />{s.isOwner}</label>
            {error && <p role="alert" className="text-sm font-semibold text-destructive">{error}</p>}
            <div className="flex gap-2"><Button variant="ghost" onClick={() => setStep(1)}>{s.back}</Button><Button className="flex-1" size="lg" disabled={pending} onClick={submit}>{s.submit}</Button></div>
          </>
        )}
      </Card>
    </div>
  );
}
