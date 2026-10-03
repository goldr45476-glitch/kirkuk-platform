"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label, Textarea } from "@/components/ui/input";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { cn } from "@/lib/utils";
import { createOfferAction, suggestEventAction } from "./actions";

const sel = "h-11 w-full rounded-lg border border-input bg-card px-3 text-base";
const tomorrow = () => new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);

export function OfferForm({ businesses, t }: { businesses: { id: string; name: string }[]; t: Dictionary }) {
  const router = useRouter();
  const o = t.offers;
  const [biz, setBiz] = useState(businesses[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [ends, setEnds] = useState(tomorrow());
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  return (
    <Card className="p-4">
      <form className="space-y-3" onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await createOfferAction({ businessId: biz, title, details, endsOn: ends });
          setMsg({ ok: r.ok, text: r.ok ? o.published : t.post.errors.generic });
          if (r.ok) { setTitle(""); setDetails(""); router.refresh(); }
        });
      }}>
        <h2 className="font-extrabold">{o.add}</h2>
        {businesses.length > 1 && <div><Label htmlFor="ob">{o.business}</Label><select id="ob" value={biz} onChange={(e) => setBiz(e.target.value)} className={sel}>{businesses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></div>}
        <div><Label htmlFor="ot">{o.titleF}</Label><Input id="ot" value={title} onChange={(e) => setTitle(e.target.value)} required minLength={3} maxLength={140} /></div>
        <div><Label htmlFor="od">{o.detailsF}</Label><Textarea id="od" value={details} onChange={(e) => setDetails(e.target.value)} maxLength={1000} /></div>
        <div><Label htmlFor="oe">{o.endsF}</Label><Input id="oe" type="date" value={ends} min={tomorrow().slice(0, 10)} onChange={(e) => setEnds(e.target.value)} required /></div>
        <p className="text-xs text-muted-foreground">{o.note}</p>
        <Button type="submit" disabled={pending}>{o.add}</Button>
        {msg && <p role={msg.ok ? "status" : "alert"} className={cn("text-sm font-semibold", msg.ok ? "text-success" : "text-destructive")}>{msg.text}</p>}
      </form>
    </Card>
  );
}

const CATS = ["music", "family", "sports", "culture", "food", "education", "charity", "other"] as const;

export function EventForm({ t }: { t: Dictionary }) {
  const e = t.events;
  const [f, setF] = useState({ title: "", details: "", category: "family" as (typeof CATS)[number], startsAt: "", venueName: "" });
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const set = (k: keyof typeof f, v: string) => setF((s) => ({ ...s, [k]: v }));
  return (
    <Card className="p-4">
      <form className="space-y-3" onSubmit={(ev) => {
        ev.preventDefault();
        start(async () => {
          const r = await suggestEventAction(f);
          setMsg({ ok: r.ok, text: r.ok ? e.submitted : r.error === "rate_limited" ? t.post.errors.rate_limited : t.post.errors.generic });
          if (r.ok) setF({ ...f, title: "", details: "", venueName: "" });
        });
      }}>
        <h2 className="font-extrabold">{e.suggest}</h2>
        <div><Label htmlFor="et">{e.name}</Label><Input id="et" value={f.title} onChange={(x) => set("title", x.target.value)} required minLength={3} maxLength={140} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label htmlFor="ec">{e.category}</Label><select id="ec" value={f.category} onChange={(x) => set("category", x.target.value)} className={sel}>{CATS.map((c) => <option key={c} value={c}>{e.cats[c]}</option>)}</select></div>
          <div><Label htmlFor="es">{e.starts}</Label><Input id="es" type="datetime-local" value={f.startsAt} onChange={(x) => set("startsAt", x.target.value)} required dir="ltr" className="text-start" /></div>
        </div>
        <div><Label htmlFor="ev">{e.venue}</Label><Input id="ev" value={f.venueName} onChange={(x) => set("venueName", x.target.value)} maxLength={120} /></div>
        <div><Label htmlFor="ed">{e.details}</Label><Textarea id="ed" value={f.details} onChange={(x) => set("details", x.target.value)} maxLength={2000} /></div>
        <Button type="submit" disabled={pending}>{e.suggest}</Button>
        {msg && <p role={msg.ok ? "status" : "alert"} className={cn("text-sm font-semibold", msg.ok ? "text-success" : "text-destructive")}>{msg.text}</p>}
      </form>
    </Card>
  );
}
