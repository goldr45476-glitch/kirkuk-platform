import Link from "next/link";
import { notFound } from "next/navigation";
import { BusinessCard } from "@/components/business-card";
import { AdCard } from "@/components/ad-card";
import { spreadFeatured } from "@/lib/spread";
import { getAds, getBusinessesByCategoryIds, getCategories } from "@/lib/data";
import { getI18n, localized } from "@/lib/i18n/server";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { locale } = await getI18n();
  const cat = (await getCategories()).find((c) => c.slug === slug);
  return { title: cat ? localized(cat, locale) : undefined };
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { t, locale } = await getI18n();
  const all = await getCategories();
  const cat = all.find((c) => c.slug === slug);
  if (!cat) notFound();

  const subs = all.filter((c) => c.parent_id === cat.id);
  const [rawBusinesses, [ad]] = await Promise.all([getBusinessesByCategoryIds([cat.id, ...subs.map((s) => s.id)]), getAds("category", cat.id, 1)]);
  const businesses = spreadFeatured(rawBusinesses);

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-extrabold">{localized(cat, locale)}</h1>
      {subs.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label={t.category.sub}>
          {subs.map((s) => (
            <li key={s.id}>
              <Link href={`/categories/${s.slug}`} className="inline-block rounded-full border bg-card px-3 py-1.5 text-sm font-semibold hover:bg-primary/10">{localized(s, locale)}</Link>
            </li>
          ))}
        </ul>
      )}
      {ad && <AdCard ad={ad} label={t.money.sponsored} />}
      {businesses.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">{t.category.noBusinesses}</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {businesses.map((b) => <BusinessCard key={b.id} b={b} t={t} locale={locale} />)}
        </div>
      )}
    </div>
  );
}
