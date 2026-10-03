"use client";

import { ImagePlus, Trash2 } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label, Textarea } from "@/components/ui/input";
import { OfferForm } from "@/features/now/forms";
import { uploadImage } from "@/features/feed/upload";
import { LocationPicker, type LatLng } from "@/features/suggest/location-picker-loader";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { DashboardBusiness } from "@/lib/data-dashboard";
import { cn } from "@/lib/utils";
import * as A from "./actions";

const sel = "h-11 w-full rounded-lg border border-input bg-card px-3 text-base";
type Res = { ok: boolean };

/** Runs a server action, refreshes data, and shows a transient result line. */
function useRun(t: Dictionary) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const run = (fn: () => Promise<Res & { error?: string }>, okText = t.dash.saved) => start(async () => {
    const r = await fn();
    setMsg(r.ok ? { ok: true, text: okText } : { ok: false, text: r.error === "rate_limited" ? t.post.errors.rate_limited : t.post.errors.generic });
    if (r.ok) router.refresh();
  });
  const line = msg && <p role={msg.ok ? "status" : "alert"} className={cn("text-sm font-semibold", msg.ok ? "text-success" : "text-destructive")}>{msg.text}</p>;
  return { pending, run, line };
}

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <Card className="space-y-4 p-4"><h2 className="font-extrabold">{title}</h2>{children}</Card>
);

function ImageField({ label, value, onChange, t }: { label: string; value: string | null; onChange: (u: string) => void; t: Dictionary }) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <div className="flex items-center gap-3">
        <div className="relative size-16 overflow-hidden rounded-xl bg-muted">{value && <Image src={value} alt="" fill sizes="64px" className="object-cover" />}</div>
        <input ref={ref} type="file" accept="image/*" hidden onChange={async (e) => { const f = e.target.files?.[0]; if (!f) return; setBusy(true); try { onChange((await uploadImage(f, "business-media")).url); } catch {} setBusy(false); }} />
        <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => ref.current?.click()}><ImagePlus aria-hidden />{busy ? t.common.loading : t.dash.upload}</Button>
      </div>
    </div>
  );
}

export function InfoEditor({ b, t, districts, center }: { b: DashboardBusiness; t: Dictionary; districts: { id: number; label: string }[]; center: LatLng }) {
  const d = t.dash, { run, pending, line } = useRun(t);
  const [f, setF] = useState({ name: b.name, description: b.description ?? "", phone: b.phone ?? "", whatsapp: b.whatsapp ?? "", website: b.website ?? "", address: b.address ?? "", districtId: b.district_id ? String(b.district_id) : "", priceLevel: b.price_level ? String(b.price_level) : "" });
  const [pos, setPos] = useState<LatLng | null>(b.lat != null && b.lng != null ? { lat: b.lat, lng: b.lng } : null);
  const [logo, setLogo] = useState(b.logo_url); const [cover, setCover] = useState(b.cover_url);
  const set = (k: keyof typeof f, v: string) => setF((x) => ({ ...x, [k]: v }));
  const onPick = useCallback((v: LatLng) => setPos(v), []);
  const field = (k: keyof typeof f, label: string, extra: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div><Label htmlFor={`i-${k}`}>{label}</Label><Input id={`i-${k}`} value={f[k]} onChange={(e) => set(k, e.target.value)} {...extra} /></div>
  );
  return (
    <Section title={d.info}>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); run(() => A.updateInfoAction(b.id, {
        ...f, districtId: f.districtId ? Number(f.districtId) : null, priceLevel: f.priceLevel ? Number(f.priceLevel) : null, lat: pos?.lat ?? null, lng: pos?.lng ?? null, logoUrl: logo, coverUrl: cover })); }}>
        <div className="grid grid-cols-2 gap-3"><ImageField label={d.logo} value={logo} onChange={setLogo} t={t} /><ImageField label={d.cover} value={cover} onChange={setCover} t={t} /></div>
        {field("name", t.suggest.name, { required: true, maxLength: 120 })}
        <div><Label htmlFor="i-desc">{t.suggest.description}</Label><Textarea id="i-desc" value={f.description} onChange={(e) => set("description", e.target.value)} maxLength={2000} /></div>
        <div className="grid grid-cols-2 gap-3">
          {field("phone", t.suggest.phone, { type: "tel", dir: "ltr", className: "text-start" })}
          {field("whatsapp", d.whatsapp, { type: "tel", dir: "ltr", className: "text-start" })}
        </div>
        {field("website", d.website, { type: "url", dir: "ltr", className: "text-start", placeholder: "https://" })}
        {field("address", t.suggest.address, { maxLength: 200 })}
        <div className="grid grid-cols-2 gap-3">
          <div><Label htmlFor="i-dist">{t.suggest.district}</Label><select id="i-dist" value={f.districtId} onChange={(e) => set("districtId", e.target.value)} className={sel}><option value="">—</option>{districts.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}</select></div>
          <div><Label htmlFor="i-pl">{d.priceLevel}</Label><select id="i-pl" value={f.priceLevel} onChange={(e) => set("priceLevel", e.target.value)} className={sel}><option value="">—</option>{[1, 2, 3, 4].map((n) => <option key={n} value={n}>{"$".repeat(n)}</option>)}</select></div>
        </div>
        <div><Label>{d.location}</Label><LocationPicker value={pos} onChange={onPick} center={center} hint={t.suggest.tapMap} myLocation={t.suggest.myLocation} /></div>
        <Button type="submit" disabled={pending}>{d.save}</Button>{line}
      </form>
    </Section>
  );
}

export function HoursEditor({ b, t }: { b: DashboardBusiness; t: Dictionary }) {
  const d = t.dash, { run, pending, line } = useRun(t);
  const names = d.dayNames.split(",");
  const byDay = new Map(b.hours.map((h) => [h.day_of_week, h]));
  const [rows, setRows] = useState(() => [6, 0, 1, 2, 3, 4, 5].map((day) => {
    const h = byDay.get(day);
    return { day, closed: h ? h.is_closed : false, open: h?.open_time?.slice(0, 5) ?? "09:00", close: h?.close_time?.slice(0, 5) ?? "21:00" };
  }));
  const upd = (i: number, patch: Partial<(typeof rows)[number]>) => setRows((r) => r.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const same = () => setRows((r) => r.map((x) => ({ ...x, closed: r[0].closed, open: r[0].open, close: r[0].close })));
  return (
    <Section title={d.hours}>
      <ul className="space-y-2">
        {rows.map((r, i) => (
          <li key={r.day} className="grid grid-cols-[1fr_1fr_auto] items-center gap-2 text-sm">
            <span className="col-span-3 font-semibold">{names[r.day]}</span>
            <Input type="time" value={r.open} disabled={r.closed} onChange={(e) => upd(i, { open: e.target.value })} aria-label={d.open} dir="ltr" className="h-10 text-start" />
            <Input type="time" value={r.close} disabled={r.closed} onChange={(e) => upd(i, { close: e.target.value })} aria-label={d.close} dir="ltr" className="h-10 text-start" />
            <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={r.closed} onChange={(e) => upd(i, { closed: e.target.checked })} className="size-4 accent-[hsl(var(--primary))]" />{d.closedDay}</label>
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted-foreground">{d.allDay}: 00:00 → 00:00 · 18:00 → 03:00 ✓</p>
      <div className="flex gap-2"><Button variant="outline" size="sm" type="button" onClick={same}>= {names[6]}</Button><Button disabled={pending} onClick={() => run(() => A.saveHoursAction(b.id, rows))}>{d.save}</Button></div>{line}
    </Section>
  );
}

export function SpecialHoursEditor({ b, t }: { b: DashboardBusiness; t: Dictionary }) {
  const d = t.dash, { run, pending, line } = useRun(t);
  const [f, setF] = useState({ label: "", from: "", to: "", closed: true, open: "10:00", close: "20:00" });
  return (
    <Section title={d.special}>
      {b.special.length > 0 && (
        <ul className="divide-y text-sm">
          {b.special.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-2 py-2">
              <span><b>{s.label ?? ""}</b> <span dir="ltr">{s.date_from} → {s.date_to}</span> · {s.is_closed ? d.closedDay : `${s.open_time?.slice(0, 5)}–${s.close_time?.slice(0, 5)}`}</span>
              <button aria-label={d.remove} onClick={() => run(() => A.deleteSpecialHoursAction(b.id, s.id))} className="text-muted-foreground hover:text-destructive"><Trash2 className="size-4" aria-hidden /></button>
            </li>
          ))}
        </ul>
      )}
      <form className="grid grid-cols-2 gap-3" onSubmit={(e) => { e.preventDefault(); run(() => A.addSpecialHoursAction(b.id, { label: f.label, from: f.from, to: f.to || f.from, closed: f.closed, open: f.closed ? null : f.open, close: f.closed ? null : f.close })); }}>
        <div className="col-span-2"><Label htmlFor="s-l">{d.label}</Label><Input id="s-l" value={f.label} maxLength={60} onChange={(e) => setF({ ...f, label: e.target.value })} /></div>
        <div><Label htmlFor="s-f">{d.from}</Label><Input id="s-f" type="date" required value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} /></div>
        <div><Label htmlFor="s-t">{d.to}</Label><Input id="s-t" type="date" value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })} /></div>
        <label className="col-span-2 flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={f.closed} onChange={(e) => setF({ ...f, closed: e.target.checked })} className="size-5 accent-[hsl(var(--primary))]" />{d.closedDay}</label>
        {!f.closed && (<><Input type="time" value={f.open} onChange={(e) => setF({ ...f, open: e.target.value })} dir="ltr" className="text-start" aria-label={d.open} /><Input type="time" value={f.close} onChange={(e) => setF({ ...f, close: e.target.value })} dir="ltr" className="text-start" aria-label={d.close} /></>)}
        <Button type="submit" disabled={pending} className="col-span-2">{d.add}</Button>
      </form>{line}
    </Section>
  );
}

const AUD = ["family", "couple", "friends", "kids", "solo"] as const;
export function AmenitiesEditor({ b, t, amenities }: { b: DashboardBusiness; t: Dictionary; amenities: { key: string; label: string }[] }) {
  const d = t.dash, { run, pending, line } = useRun(t);
  const [keys, setKeys] = useState(new Set(b.amenities));
  const [suit, setSuit] = useState<Record<string, number>>(Object.fromEntries(b.suitability.map((s) => [s.audience, s.budget_band ?? 2])));
  const toggle = (k: string) => setKeys((s) => { const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); return n; });
  return (
    <Section title={d.amenities}>
      <div className="flex flex-wrap gap-2">
        {amenities.map((a) => (
          <button key={a.key} type="button" aria-pressed={keys.has(a.key)} onClick={() => toggle(a.key)}
            className={cn("rounded-full border px-3 py-1.5 text-sm font-semibold", keys.has(a.key) ? "border-transparent bg-primary text-primary-foreground" : "bg-card hover:bg-muted")}>{a.label}</button>
        ))}
      </div>
      <h3 className="pt-2 text-sm font-extrabold">{d.suitability}</h3>
      <ul className="space-y-2">
        {AUD.map((a) => (
          <li key={a} className="flex items-center gap-3 text-sm">
            <label className="flex flex-1 items-center gap-2 font-semibold"><input type="checkbox" checked={a in suit} onChange={(e) => setSuit((s) => { const n = { ...s }; e.target.checked ? (n[a] = 2) : delete n[a]; return n; })} className="size-5 accent-[hsl(var(--primary))]" />{t.where.audiences[a]}</label>
            {a in suit && <select aria-label={d.budgetFor} value={suit[a]} onChange={(e) => setSuit((s) => ({ ...s, [a]: Number(e.target.value) }))} className="h-9 rounded-lg border border-input bg-card px-2">{[1, 2, 3, 4].map((n) => <option key={n} value={n}>{"$".repeat(n)}</option>)}</select>}
          </li>
        ))}
      </ul>
      <Button disabled={pending} onClick={() => run(() => A.saveAmenitiesAction(b.id, { keys: [...keys], suitability: Object.entries(suit).map(([audience, band]) => ({ audience: audience as (typeof AUD)[number], band })) }))}>{d.save}</Button>{line}
    </Section>
  );
}

export function ProductsEditor({ b, t }: { b: DashboardBusiness; t: Dictionary }) {
  const d = t.dash, { run, pending, line } = useRun(t);
  const [name, setName] = useState(""); const [price, setPrice] = useState("");
  return (
    <Section title={d.products}>
      <ul className="divide-y text-sm">
        {b.products.map((p) => (
          <li key={p.id} className="flex items-center justify-between gap-2 py-2">
            <span className="font-semibold">{p.name}</span>
            <span className="flex items-center gap-3">{p.price != null && <span className="text-primary">{new Intl.NumberFormat("en-US").format(p.price)}</span>}
              <button aria-label={d.remove} onClick={() => run(() => A.deleteProductAction(b.id, p.id))} className="text-muted-foreground hover:text-destructive"><Trash2 className="size-4" aria-hidden /></button></span>
          </li>
        ))}
      </ul>
      <form className="grid grid-cols-[1fr_8rem_auto] items-end gap-2" onSubmit={(e) => { e.preventDefault(); run(() => A.addProductAction(b.id, { name, price: price === "" ? null : Number(price) })); setName(""); setPrice(""); }}>
        <div><Label htmlFor="p-n">{d.productName}</Label><Input id="p-n" required value={name} maxLength={120} onChange={(e) => setName(e.target.value)} /></div>
        <div><Label htmlFor="p-p">{d.price}</Label><Input id="p-p" type="number" min={0} inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value)} /></div>
        <Button type="submit" disabled={pending}>{d.add}</Button>
      </form>{line}
    </Section>
  );
}

export function GalleryEditor({ b, t }: { b: DashboardBusiness; t: Dictionary }) {
  const d = t.dash, { run, pending, line } = useRun(t);
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const add = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    for (const f of Array.from(files).slice(0, 6)) { try { const u = await uploadImage(f, "business-media"); await A.addGalleryImageAction(b.id, u.url); } catch {} }
    setBusy(false); run(async () => ({ ok: true }));
  };
  return (
    <Section title={d.gallery}>
      <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {b.images.map((im) => (
          <li key={im.id} className="relative aspect-square overflow-hidden rounded-lg">
            <Image src={im.url} alt="" fill sizes="25vw" className="object-cover" />
            <button aria-label={d.remove} onClick={() => run(() => A.deleteGalleryImageAction(b.id, im.id))} className="absolute end-1 top-1 grid size-6 place-items-center rounded-full bg-black/60 text-white"><Trash2 className="size-3.5" aria-hidden /></button>
          </li>
        ))}
      </ul>
      <input ref={ref} type="file" accept="image/*" multiple hidden onChange={(e) => add(e.target.files)} />
      <Button variant="outline" disabled={busy || pending} onClick={() => ref.current?.click()}><ImagePlus aria-hidden />{busy ? t.common.loading : d.upload}</Button>{line}
    </Section>
  );
}

export function OffersEditor({ b, t }: { b: DashboardBusiness; t: Dictionary }) {
  const d = t.dash, { run, line } = useRun(t);
  const now = Date.now();
  return (
    <Section title={d.offers}>
      {b.offers.length === 0 ? <p className="text-sm text-muted-foreground">{d.noOffers}</p> : (
        <ul className="divide-y text-sm">
          {b.offers.map((o) => (
            <li key={o.id} className="flex items-center justify-between gap-2 py-2">
              <span className={cn("font-semibold", new Date(o.ends_at).getTime() < now && "text-muted-foreground line-through")}>{o.title}</span>
              <span className="flex items-center gap-2 text-xs text-muted-foreground"><time dateTime={o.ends_at} suppressHydrationWarning>{new Date(o.ends_at).toLocaleDateString()}</time>
                <button aria-label={d.remove} onClick={() => run(() => A.deleteOfferAction(b.id, o.id))} className="hover:text-destructive"><Trash2 className="size-4" aria-hidden /></button></span>
            </li>
          ))}
        </ul>
      )}
      <OfferForm businesses={[{ id: b.id, name: b.name }]} t={t} />{line}
    </Section>
  );
}
