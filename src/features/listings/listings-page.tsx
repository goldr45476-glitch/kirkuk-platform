import { Plus, Wrench } from "lucide-react";
import Link from "next/link";
import { ListingCard } from "@/components/listing-card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { LISTINGS_PAGE, getDistricts, searchListings } from "@/lib/data";
import { getI18n, localized } from "@/lib/i18n/server";
import { EMPLOYMENT, KIND_ROUTE, PROPERTY_TYPES, VEHICLE_TYPES, type ListingKind } from "@/lib/listings";
import type { ListingFilters } from "@/lib/types";

type Raw = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const num = (v: string | undefined) => (v && Number.isFinite(+v) ? +v : undefined);
const SORTS = ["newest", "price_asc", "price_desc"] as const;
const sel = "h-11 w-full rounded-lg border border-input bg-card px-3 text-base";

export async function ListingsPage({ kind, raw }: { kind: ListingKind; raw: Raw }) {
  const { t, locale } = await getI18n();
  const L = t.listings;
  const sort = one(raw.sort);
  const f: ListingFilters = {
    q: one(raw.q)?.slice(0, 100), deal: one(raw.deal), type: one(raw.type), district: num(one(raw.district)), currency: one(raw.currency),
    minPrice: num(one(raw.minPrice)), maxPrice: num(one(raw.maxPrice)), minArea: num(one(raw.minArea)), minRooms: num(one(raw.minRooms)),
    minYear: num(one(raw.minYear)), employment: one(raw.employment), sort: SORTS.find((s) => s === sort), page: Math.max(1, Math.floor(num(one(raw.page)) ?? 1)),
  };
  const [districts, { rows, total }] = await Promise.all([getDistricts(), searchListings(kind, f)]);
  const dName = new Map(districts.map((d) => [d.id, localized(d, locale)]));
  const hasFilters = !!(f.deal || f.type || f.district || f.currency || f.minPrice || f.maxPrice || f.minArea || f.minRooms || f.minYear || f.employment || f.sort);
  const pages = Math.ceil(total / LISTINGS_PAGE);
  const base = KIND_ROUTE[kind];
  const link = (page: number) => {
    const u = new URLSearchParams();
    for (const [k, v] of Object.entries(raw)) { const x = one(v); if (x && k !== "page") u.set(k, x); }
    u.set("page", String(page));
    return `${base}?${u}`;
  };

  const dealOpts = kind === "property" ? ["sale", "rent"] : kind === "vehicle" ? ["sale", "wanted"] : [];
  const typeOpts: { v: string; l: string }[] =
    kind === "property" ? PROPERTY_TYPES.map((v) => ({ v, l: L.types[v] })) :
    kind === "vehicle" ? VEHICLE_TYPES.map((v) => ({ v, l: L.types[v] })) :
    [{ v: "offer", l: L.jobTypes.offer }, { v: "seeking", l: L.jobTypes.seeking }];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold">{L.kinds[kind]}</h1>
        <Button asChild size="sm"><Link href={`/listings/new?kind=${kind}`}><Plus aria-hidden />{L.post}</Link></Button>
      </div>

      <form method="get" action={base} className="space-y-3 rounded-xl border bg-card p-4">
        <Input name="q" type="search" defaultValue={f.q} placeholder={L.search} aria-label={L.search} />
        <details open={hasFilters} className="group">
          <summary className="cursor-pointer select-none text-sm font-bold text-primary">{L.filters}</summary>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {dealOpts.length > 0 && (
            <div><Label htmlFor="deal">{L.f.deal}</Label>
              <select id="deal" name="deal" defaultValue={f.deal ?? ""} className={sel}><option value="">{L.any}</option>{dealOpts.map((d) => <option key={d} value={d}>{L.deal[d as "sale"]}</option>)}</select></div>
          )}
          <div><Label htmlFor="type">{L.f.type}</Label>
            <select id="type" name="type" defaultValue={f.type ?? ""} className={sel}><option value="">{L.any}</option>{typeOpts.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}</select></div>
          {kind === "job" && (
            <div><Label htmlFor="employment">{L.f.employment}</Label>
              <select id="employment" name="employment" defaultValue={f.employment ?? ""} className={sel}><option value="">{L.any}</option>{EMPLOYMENT.map((e) => <option key={e} value={e}>{L.employment[e]}</option>)}</select></div>
          )}
          <div><Label htmlFor="district">{L.f.district}</Label>
            <select id="district" name="district" defaultValue={f.district ?? ""} className={sel}><option value="">{L.any}</option>{districts.map((d) => <option key={d.id} value={d.id}>{localized(d, locale)}</option>)}</select></div>
          {kind !== "job" && (<>
            <div><Label htmlFor="currency">{L.f.currency}</Label>
              <select id="currency" name="currency" defaultValue={f.currency ?? ""} className={sel}><option value="">{L.any}</option><option value="IQD">{L.currencies.IQD}</option><option value="USD">{L.currencies.USD}</option></select></div>
            <div><Label htmlFor="minPrice">{L.f.minPrice}</Label><Input id="minPrice" name="minPrice" type="number" min={0} inputMode="numeric" defaultValue={f.minPrice} /></div>
            <div><Label htmlFor="maxPrice">{L.f.maxPrice}</Label><Input id="maxPrice" name="maxPrice" type="number" min={0} inputMode="numeric" defaultValue={f.maxPrice} /></div>
          </>)}
          {kind === "property" && (<>
            <div><Label htmlFor="minArea">{L.f.minArea}</Label><Input id="minArea" name="minArea" type="number" min={0} inputMode="numeric" defaultValue={f.minArea} /></div>
            <div><Label htmlFor="minRooms">{L.f.minRooms}</Label><Input id="minRooms" name="minRooms" type="number" min={0} inputMode="numeric" defaultValue={f.minRooms} /></div>
          </>)}
          {kind === "vehicle" && <div><Label htmlFor="minYear">{L.f.minYear}</Label><Input id="minYear" name="minYear" type="number" min={1950} inputMode="numeric" defaultValue={f.minYear} /></div>}
          <div><Label htmlFor="sort">{t.search.sort}</Label>
            <select id="sort" name="sort" defaultValue={f.sort ?? "newest"} className={sel}>{SORTS.map((s) => <option key={s} value={s}>{L.sort[s]}</option>)}</select></div>
        </div>
        </details>
        <div className="flex gap-2"><Button type="submit">{L.apply}</Button><Button asChild variant="ghost"><a href={base}>{L.reset}</a></Button></div>
      </form>

      {kind === "vehicle" && (
        <Link href="/categories/car-services" className="flex items-center gap-2 rounded-xl border bg-card p-3 text-sm font-bold hover:bg-muted"><Wrench className="size-5 text-primary" aria-hidden />{L.workshops}</Link>
      )}

      <p className="text-sm text-muted-foreground" aria-live="polite">{total} {L.results}</p>
      {rows.length === 0 ? <p className="py-12 text-center text-muted-foreground">{L.noResults}</p> : (
        <div className="grid gap-3 lg:grid-cols-2">
          {rows.map((l) => <ListingCard key={l.id} l={l} t={t} locale={locale} district={l.district_id ? dName.get(l.district_id) : undefined} />)}
        </div>
      )}
      {pages > 1 && (
        <nav className="flex items-center justify-between" aria-label="pagination">
          {f.page! > 1 ? <Link className="font-semibold text-primary" href={link(f.page! - 1)}>{t.search.prev}</Link> : <span />}
          <span className="text-sm text-muted-foreground">{f.page} / {pages}</span>
          {f.page! < pages ? <Link className="font-semibold text-primary" href={link(f.page! + 1)}>{t.search.next}</Link> : <span />}
        </nav>
      )}
    </div>
  );
}
