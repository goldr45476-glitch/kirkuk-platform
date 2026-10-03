import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { Badge } from "@/components/ui/card";
import { AmenitiesEditor, GalleryEditor, HoursEditor, InfoEditor, OffersEditor, ProductsEditor, SpecialHoursEditor } from "@/features/dashboard/editors";
import { StatsPanel } from "@/features/dashboard/stats-panel";
import { getCity } from "@/lib/city";
import { getAmenities, getCurrentProfile, getDistricts } from "@/lib/data";
import { getBusinessStats, getDashboardBusiness } from "@/lib/data-dashboard";
import { getI18n, localized } from "@/lib/i18n/server";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t.dash.title, robots: { index: false } };
}

export default async function DashboardPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ days?: string }> }) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const profile = await getCurrentProfile();
  if (!profile) redirect(`/login?next=/dashboard/${id}`);
  const b = await getDashboardBusiness(id);
  const isStaff = profile.role === "admin" || profile.role === "moderator";
  if (!b || (b.owner_id !== profile.id && !isStaff)) notFound();

  const days = [7, 30, 90].includes(Number((await searchParams).days)) ? Number((await searchParams).days) : 30;
  const [{ t, locale }, stats, districts, amenities, city] = await Promise.all([getI18n(), getBusinessStats(id, days), getDistricts(), getAmenities(), getCity()]);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Link href="/dashboard" className="text-sm font-semibold text-primary">← {t.dash.myPlaces}</Link>
        <h1 className="me-auto text-2xl font-extrabold">{b.name}</h1>
        <Badge tone={b.status === "active" ? "success" : b.status === "pending" ? "accent" : "muted"}>{t.dash.status[b.status]}</Badge>
        {b.status === "active" && <Link href={`/business/${b.slug}`} className="inline-flex items-center gap-1 text-sm font-bold text-primary"><ExternalLink className="size-4" aria-hidden />{t.dash.viewPage}</Link>}
      </div>
      {b.status === "pending" && <p className="rounded-xl bg-accent/15 p-3 text-sm font-semibold">{t.dash.wip}</p>}
      {b.status === "suspended" && <p className="rounded-xl bg-destructive/10 p-3 text-sm font-semibold text-destructive">{t.dash.suspended}</p>}
      {!b.last_verified_at && <p className="rounded-xl bg-muted p-3 text-xs text-muted-foreground">{t.dash.verifyHint}</p>}

      {stats && <StatsPanel s={stats} id={id} t={t} />}
      <InfoEditor b={b} t={t} districts={districts.map((d) => ({ id: d.id, label: localized(d, locale) }))} center={{ lat: city?.center_lat ?? 35.4681, lng: city?.center_lng ?? 44.3922 }} />
      <HoursEditor b={b} t={t} />
      <SpecialHoursEditor b={b} t={t} />
      <AmenitiesEditor b={b} t={t} amenities={amenities.map((a) => ({ key: a.key, label: a.name[locale] ?? a.name.ar ?? a.key }))} />
      <ProductsEditor b={b} t={t} />
      <GalleryEditor b={b} t={t} />
      <OffersEditor b={b} t={t} />
    </div>
  );
}
