"use client";

import { ImagePlus, X } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label, Textarea } from "@/components/ui/input";
import { uploadImage } from "@/features/feed/upload";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { EMPLOYMENT, PROPERTY_TYPES, VEHICLE_TYPES, type ListingKind } from "@/lib/listings";
import { createListingAction } from "./actions";

const sel = "h-11 w-full rounded-lg border border-input bg-card px-3 text-base";

export function ListingForm({ kind, t, districts }: { kind: ListingKind; t: Dictionary; districts: { id: number; name: string }[] }) {
  const router = useRouter();
  const L = t.listings;
  const file = useRef<HTMLInputElement>(null);
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const pick = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true); setError(null);
    try {
      const room = 6 - images.length;
      const urls: string[] = [];
      for (const f of Array.from(files).filter((f) => f.type.startsWith("image/")).slice(0, room)) urls.push((await uploadImage(f, "post-media")).url);
      setImages((p) => [...p, ...urls]);
    } catch { setError(L.uploadError); }
    setUploading(false);
    if (file.current) file.current.value = "";
  };

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const g = (k: string) => String(fd.get(k) ?? "");
    const details: Record<string, string> = {};
    for (const k of ["deal", "type", "employment", "area_m2", "rooms", "baths", "floor", "make", "model", "year", "mileage_km", "fuel", "salary"]) if (fd.has(k)) details[k] = g(k);
    setError(null);
    start(async () => {
      const r = await createListingAction({
        kind, title: g("title"), description: g("description"), price: g("price") as unknown as number, currency: g("currency") as "IQD",
        districtId: (g("district") || null) as unknown as number | null, phone: g("phone"), images, details,
      });
      if (!r.ok) return setError(r.error === "rate_limited" || r.error === "account_banned" ? t.post.errors[r.error] : r.error === "invalid" ? L.invalid : t.post.errors.generic);
      router.push(`/listings/${r.data!.id}`);
    });
  };

  const field = (name: string, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div><Label htmlFor={name}>{label}</Label><Input id={name} name={name} {...props} /></div>
  );

  return (
    <form onSubmit={submit} className="space-y-4">
      <Card className="space-y-4 p-4">
        {kind === "property" && (
          <div className="grid grid-cols-2 gap-3">
            <div><Label htmlFor="deal">{L.f.deal}</Label><select id="deal" name="deal" className={sel}><option value="sale">{L.deal.sale}</option><option value="rent">{L.deal.rent}</option></select></div>
            <div><Label htmlFor="type">{L.f.type}</Label><select id="type" name="type" className={sel}>{PROPERTY_TYPES.map((v) => <option key={v} value={v}>{L.types[v]}</option>)}</select></div>
          </div>
        )}
        {kind === "vehicle" && (
          <div className="grid grid-cols-2 gap-3">
            <div><Label htmlFor="deal">{L.f.deal}</Label><select id="deal" name="deal" className={sel}><option value="sale">{L.deal.sale}</option><option value="wanted">{L.deal.wanted}</option></select></div>
            <div><Label htmlFor="type">{L.f.type}</Label><select id="type" name="type" className={sel}>{VEHICLE_TYPES.map((v) => <option key={v} value={v}>{L.types[v]}</option>)}</select></div>
          </div>
        )}
        {kind === "job" && (
          <div className="grid grid-cols-2 gap-3">
            <div><Label htmlFor="type">{L.f.type}</Label><select id="type" name="type" className={sel}><option value="offer">{L.jobTypes.offer}</option><option value="seeking">{L.jobTypes.seeking}</option></select></div>
            <div><Label htmlFor="employment">{L.f.employment}</Label><select id="employment" name="employment" className={sel}>{EMPLOYMENT.map((v) => <option key={v} value={v}>{L.employment[v]}</option>)}</select></div>
          </div>
        )}

        {field("title", L.f.title, { required: true, minLength: 3, maxLength: 160 })}
        <div><Label htmlFor="description">{L.f.description}</Label><Textarea id="description" name="description" maxLength={4000} /></div>

        {kind === "property" && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {field("area_m2", L.f.area, { type: "number", min: 0, required: true, inputMode: "numeric" })}
            {field("rooms", L.f.rooms, { type: "number", min: 0, inputMode: "numeric" })}
            {field("baths", L.f.baths, { type: "number", min: 0, inputMode: "numeric" })}
            {field("floor", L.f.floor, { type: "number", min: 0, inputMode: "numeric" })}
          </div>
        )}
        {kind === "vehicle" && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {field("make", L.f.make)}{field("model", L.f.model)}
            {field("year", L.f.year, { type: "number", min: 1950, max: 2100, inputMode: "numeric" })}
            {field("mileage_km", L.f.mileage, { type: "number", min: 0, inputMode: "numeric" })}
            {field("fuel", L.f.fuel)}
          </div>
        )}
        {kind === "job" ? field("salary", L.f.salary) : null}

        <div className="grid grid-cols-2 gap-3">
          {kind !== "job" && field("price", L.f.price, { type: "number", min: 0, inputMode: "numeric" })}
          <div><Label htmlFor="currency">{L.f.currency}</Label><select id="currency" name="currency" className={sel}><option value="IQD">{L.currencies.IQD}</option><option value="USD">{L.currencies.USD}</option></select></div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><Label htmlFor="district">{L.f.district}</Label><select id="district" name="district" className={sel}><option value="">—</option>{districts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></div>
          {field("phone", L.f.phone, { type: "tel", required: true, dir: "ltr", className: "text-start", autoComplete: "tel", placeholder: "07701234567" })}
        </div>
      </Card>

      <Card className="space-y-3 p-4">
        <p className="font-bold">{L.f.photos}</p>
        {images.length > 0 && (
          <ul className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {images.map((u, i) => (
              <li key={u} className="relative aspect-square overflow-hidden rounded-lg">
                <Image src={u} alt="" fill sizes="25vw" className="object-cover" />
                <button type="button" aria-label={t.composer.remove} onClick={() => setImages((l) => l.filter((_, j) => j !== i))} className="absolute end-1 top-1 grid size-6 place-items-center rounded-full bg-black/60 text-white"><X className="size-3.5" aria-hidden /></button>
              </li>
            ))}
          </ul>
        )}
        <input ref={file} type="file" accept="image/*" multiple hidden onChange={(e) => pick(e.target.files)} />
        <Button type="button" variant="outline" disabled={uploading || images.length >= 6} onClick={() => file.current?.click()}><ImagePlus aria-hidden />{uploading ? t.common.loading : t.composer.addPhotos}</Button>
      </Card>

      {error && <p role="alert" className="text-sm font-semibold text-destructive">{error}</p>}
      <Button type="submit" size="lg" className="w-full" disabled={pending || uploading}>{pending ? t.composer.publishing : L.post}</Button>
    </form>
  );
}
