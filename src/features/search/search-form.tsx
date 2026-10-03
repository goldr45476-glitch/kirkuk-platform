"use client";

import { LocateFixed, Search, SlidersHorizontal } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { SearchParams } from "@/lib/types";

export interface Option { value: string; label: string }

const selectCls = "h-11 w-full rounded-lg border border-input bg-card px-3 text-base";

/** Plain GET form (works without JS). JS only adds the "near me" geolocation. */
export function SearchForm({ t, values, categories, districts }: {
  t: Dictionary["search"]; values: SearchParams; categories: Option[]; districts: Option[];
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [geo, setGeo] = useState<"idle" | "busy" | "denied">("idle");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    values.lat != null && values.lng != null ? { lat: values.lat, lng: values.lng } : null,
  );
  const [open, setOpen] = useState(
    !!(values.category || values.district || values.minRating || values.open || values.verified || values.sort),
  );

  const nearMe = () => {
    if (!navigator.geolocation) return setGeo("denied");
    setGeo("busy");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: +pos.coords.latitude.toFixed(5), lng: +pos.coords.longitude.toFixed(5) });
        setGeo("idle");
        // wait for hidden inputs to render, then submit with sort=nearest
        setTimeout(() => {
          const sort = formRef.current?.elements.namedItem("sort") as HTMLSelectElement | null;
          if (sort) sort.value = "nearest";
          formRef.current?.requestSubmit();
        }, 0);
      },
      () => setGeo("denied"),
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  };

  return (
    <form ref={formRef} method="get" action="/search" className="space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute start-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input name="q" type="search" defaultValue={values.q} placeholder={t.placeholder} className="ps-10" aria-label={t.title} enterKeyHint="search" />
        </div>
        <Button type="submit" className="shrink-0">{t.submit}</Button>
        <Button type="button" variant="outline" size="icon" aria-expanded={open} aria-label={t.filters} onClick={() => setOpen(!open)}>
          <SlidersHorizontal aria-hidden />
        </Button>
      </div>

      {coords && (<><input type="hidden" name="lat" value={coords.lat} /><input type="hidden" name="lng" value={coords.lng} /></>)}

      <div hidden={!open} className="grid gap-3 rounded-xl border bg-card p-4 hidden:hidden sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Label htmlFor="category">{t.category}</Label>
          <select id="category" name="category" defaultValue={values.category ?? ""} className={selectCls}>
            <option value="">{t.anyCategory}</option>
            {categories.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <Label htmlFor="district">{t.district}</Label>
          <select id="district" name="district" defaultValue={values.district ?? ""} className={selectCls}>
            <option value="">{t.anyDistrict}</option>
            {districts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <Label htmlFor="rating">{t.minRating}</Label>
          <select id="rating" name="rating" defaultValue={values.minRating ?? ""} className={selectCls}>
            <option value="">{t.anyRating}</option>
            {[4.5, 4, 3, 2].map((r) => <option key={r} value={r}>{r} {t.ratingUp}</option>)}
          </select>
        </div>
        <div>
          <Label htmlFor="sort">{t.sort}</Label>
          <select id="sort" name="sort" defaultValue={values.sort ?? "relevance"} className={selectCls}>
            {(Object.keys(t.sorts) as (keyof typeof t.sorts)[]).map((k) => <option key={k} value={k}>{t.sorts[k]}</option>)}
          </select>
        </div>
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input type="checkbox" name="open" value="1" defaultChecked={values.open} className="size-5 accent-[hsl(var(--primary))]" />{t.openNow}
        </label>
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input type="checkbox" name="verified" value="1" defaultChecked={values.verified} className="size-5 accent-[hsl(var(--primary))]" />{t.verifiedOnly}
        </label>
        <div className="flex gap-2 sm:col-span-2 lg:justify-end">
          <Button type="button" variant="accent" onClick={nearMe} disabled={geo === "busy"}>
            <LocateFixed aria-hidden />{geo === "busy" ? t.locating : t.nearMe}
          </Button>
          <Button type="button" variant="ghost" asChild><a href="/search">{t.reset}</a></Button>
        </div>
      </div>
      {geo === "denied" && <p role="alert" className="text-sm font-semibold text-destructive">{t.locationDenied}</p>}
    </form>
  );
}
