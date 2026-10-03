import { redirect } from "next/navigation";
import { ListingForm } from "@/features/listings/listing-form";
import { getCurrentProfile, getDistricts } from "@/lib/data";
import { supabaseConfigured } from "@/lib/env";
import { getI18n, localized } from "@/lib/i18n/server";
import type { ListingKind } from "@/lib/listings";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t.listings.post, robots: { index: false } };
}

export default async function NewListingPage({ searchParams }: { searchParams: Promise<{ kind?: string }> }) {
  const { kind: k } = await searchParams;
  const kind: ListingKind = k === "vehicle" || k === "job" ? k : "property";
  if (supabaseConfigured && !(await getCurrentProfile())) redirect(`/login?next=${encodeURIComponent(`/listings/new?kind=${kind}`)}`);
  const [{ t, locale }, districts] = await Promise.all([getI18n(), getDistricts()]);
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-2xl font-extrabold">{t.listings.post} — {t.listings.kinds[kind]}</h1>
      <ListingForm kind={kind} t={t} districts={districts.map((d) => ({ id: d.id, name: localized(d, locale) }))} />
    </div>
  );
}
