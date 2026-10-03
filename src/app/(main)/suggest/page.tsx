import { redirect } from "next/navigation";
import { SuggestForm } from "@/features/suggest/suggest-form";
import { getCity } from "@/lib/city";
import { getCategories, getCurrentProfile, getDistricts } from "@/lib/data";
import { supabaseConfigured } from "@/lib/env";
import { getI18n, localized } from "@/lib/i18n/server";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t.suggest.title, robots: { index: false } };
}

export default async function SuggestPage() {
  if (supabaseConfigured && !(await getCurrentProfile())) redirect("/login?next=/suggest");
  const { t, locale } = await getI18n();
  const [cats, districts, city] = await Promise.all([getCategories(), getDistricts(), getCity()]);
  const categories = cats.filter((c) => c.parent_id !== null || !cats.some((x) => x.parent_id === c.id))
    .map((c) => ({ id: c.id, label: localized(c, locale) })).sort((a, b) => a.label.localeCompare(b.label, locale));
  return (
    <div className="mx-auto max-w-xl space-y-4">
      <h1 className="text-2xl font-extrabold">{t.suggest.title}</h1>
      <SuggestForm t={t} categories={categories} districts={districts.map((d) => ({ id: d.id, label: localized(d, locale) }))}
        center={{ lat: city?.center_lat ?? 35.4681, lng: city?.center_lng ?? 44.3922 }} />
    </div>
  );
}
