import { MapLoader } from "@/features/map/map-loader";
import { getCategories, getMapBusinesses } from "@/lib/data";
import { getI18n, localized } from "@/lib/i18n/server";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t.map.title };
}

export default async function MapPage() {
  const { t, locale } = await getI18n();
  const [businesses, cats] = await Promise.all([getMapBusinesses(), getCategories()]);
  const used = new Set(businesses.map((b) => b.root_slug));
  const categories = cats
    .filter((c) => c.parent_id === null && used.has(c.slug))
    .map((c) => ({ slug: c.slug, name: localized(c, locale), color: c.color ?? "#64748b" }));

  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-extrabold">{t.map.title}</h1>
      <MapLoader businesses={businesses} categories={categories} t={t.map} />
    </div>
  );
}
