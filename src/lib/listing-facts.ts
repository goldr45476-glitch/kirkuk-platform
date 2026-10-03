import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { ListingCardRow } from "@/lib/types";

const INTL: Record<string, string> = { ar: "ar-IQ", ku: "ckb-IQ", tr: "tr-TR", en: "en-US" };

export const formatPrice = (price: number | null, currency: "IQD" | "USD", t: Dictionary, locale: string) =>
  price == null ? t.listings.negotiable : `${new Intl.NumberFormat(INTL[locale] ?? "en-US").format(price)} ${t.listings.currencies[currency]}`;

const lookup = (m: Record<string, string>, k: unknown) => (typeof k === "string" ? m[k] ?? k : undefined);

/** Short human-readable facts shown on cards and in the details page. */
export function listingFacts(l: Pick<ListingCardRow, "kind" | "details">, t: Dictionary): string[] {
  const d = l.details, L = t.listings, out: (string | undefined)[] = [];
  if (l.kind === "property") {
    out.push(lookup(L.deal, d.deal), lookup(L.types, d.type), d.area_m2 ? `${d.area_m2} ${L.areaUnit}` : undefined, d.rooms ? `${d.rooms} ${L.rooms}` : undefined);
  } else if (l.kind === "vehicle") {
    out.push(lookup(L.deal, d.deal), lookup(L.types, d.type), [d.make, d.model, d.year].filter(Boolean).join(" ") || undefined, d.mileage_km ? `${d.mileage_km} ${L.km}` : undefined);
  } else {
    out.push(lookup(L.jobTypes, d.type), lookup(L.employment, d.employment), d.salary ? String(d.salary) : undefined);
  }
  return out.filter((x): x is string => !!x);
}
