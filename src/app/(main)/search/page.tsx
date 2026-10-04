import Link from "next/link";
import { BusinessCard } from "@/components/business-card";
import { SearchForm } from "@/features/search/search-form";
import { PAGE_SIZE, getCategories, getDistricts, searchBusinesses } from "@/lib/data";
import { getI18n, localized } from "@/lib/i18n/server";
import { spreadFeatured } from "@/lib/spread";
import type { SearchParams } from "@/lib/types";

type Raw = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const num = (v: string | undefined) => (v && Number.isFinite(+v) ? +v : undefined);
const SORTS = ["relevance", "nearest", "rating", "newest"] as const;

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t.search.title };
}

export default async function SearchPage({ searchParams }: { searchParams: Promise<Raw> }) {
  const raw = await searchParams;
  const { t, locale } = await getI18n();
  const sort = one(raw.sort);
  const params: SearchParams = {
    q: one(raw.q)?.slice(0, 100),
    category: one(raw.category) || undefined,
    district: num(one(raw.district)),
    minRating: num(one(raw.rating)),
    open: one(raw.open) === "1",
    verified: one(raw.verified) === "1",
    lat: num(one(raw.lat)),
    lng: num(one(raw.lng)),
    sort: SORTS.find((s) => s === sort),
    page: Math.max(1, Math.floor(num(one(raw.page)) ?? 1)),
  };

  const [cats, districts, found] = await Promise.all([getCategories(), getDistricts(), searchBusinesses(params)]);
  const { total } = found;
  const rows = !params.sort || params.sort === "relevance" ? spreadFeatured(found.rows) : found.rows;
  const catOptions = cats
    .filter((c) => c.parent_id === null)
    .flatMap((c) => [
      { value: c.slug, label: localized(c, locale) },
      ...cats.filter((s) => s.parent_id === c.id).map((s) => ({ value: s.slug, label: `— ${localized(s, locale)}` })),
    ]);
  const distOptions = districts.map((d) => ({ value: String(d.id), label: localized(d, locale) }));

  const pages = Math.ceil(total / PAGE_SIZE);
  const link = (page: number) => {
    const u = new URLSearchParams();
    for (const [k, v] of Object.entries(raw)) { const x = one(v); if (x && k !== "page") u.set(k, x); }
    u.set("page", String(page));
    return `/search?${u}`;
  };

  return (
    <div className="space-y-5">
      <h1 className="sr-only">{t.search.title}</h1>
      <SearchForm t={t.search} values={params} categories={catOptions} districts={distOptions} />
      <p className="text-sm text-muted-foreground" aria-live="polite">{total} {t.search.results}</p>
      {rows.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">{t.search.noResults}</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {rows.map((b) => <BusinessCard key={b.id} b={b} t={t} locale={locale} />)}
        </div>
      )}
      {pages > 1 && (
        <nav className="flex items-center justify-between" aria-label="pagination">
          {params.page! > 1 ? <Link className="font-semibold text-primary" href={link(params.page! - 1)}>{t.search.prev}</Link> : <span />}
          <span className="text-sm text-muted-foreground">{params.page} / {pages}</span>
          {params.page! < pages ? <Link className="font-semibold text-primary" href={link(params.page! + 1)}>{t.search.next}</Link> : <span />}
        </nav>
      )}
    </div>
  );
}
