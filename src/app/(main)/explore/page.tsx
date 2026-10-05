import { Briefcase, Building2, Car, Compass, Droplets, Fuel, Map as MapIcon, Pill } from "lucide-react";
import Link from "next/link";
import { BusinessCard } from "@/components/business-card";
import { DynamicIcon } from "@/components/icon";
import { Badge } from "@/components/ui/card";
import { EventCard, NewPlaceCard, OfferCard, OpenNowCard, Row } from "@/components/now-cards";
import { cityName, getCity } from "@/lib/city";
import { listCollections, getCategories, getDistricts, getDutyPharmacies, getLiveOffers, getNewPlaces, getOpenNow, getUpcomingEvents } from "@/lib/data";
import { supabaseConfigured } from "@/lib/env";
import { getI18n, localized } from "@/lib/i18n/server";
import { categoryHref } from "@/lib/category-href";

export const metadata = { title: "Explore" };

export default async function ExplorePage() {
  const { t, locale } = await getI18n();
  const [categories, districts, duty, city, openNow, offers, events, fresh, collections] = await Promise.all([
    getCategories(), getDistricts(), getDutyPharmacies(), getCity(), getOpenNow(10), getLiveOffers(8), getUpcomingEvents(7, 8), getNewPlaces(8), listCollections(6),
  ]);
  const dName = new Map(districts.map((d) => [d.id, localized(d, locale)]));
  const cname = cityName(city, locale) || t.appName;
  const top = categories.filter((c) => c.parent_id === null);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-extrabold">{t.explore.title}</h1>
        <p className="text-sm text-muted-foreground">{t.explore.sub}</p>
      </header>
      <Link href="/map" className="flex items-center gap-3 rounded-2xl border bg-card p-4 font-bold hover:bg-muted"><MapIcon className="size-6 text-primary" aria-hidden />{t.nav.map}</Link>

      {supabaseConfigured && (
        <>
          <Link href="/where" className="flex items-center gap-4 rounded-2xl bg-gradient-to-br from-accent to-accent/70 p-5 text-accent-foreground shadow-md transition hover:-translate-y-0.5">
            <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-black/10"><Compass className="size-8" aria-hidden /></span>
            <span><span className="block text-xl font-extrabold">{t.now.whereCard}</span><span className="block text-sm font-medium opacity-80">{t.now.whereSub}</span></span>
          </Link>

          <Row title={t.now.openNow} href="/search?open=1" seeAll={t.now.seeAll}>
            {openNow.length === 0 ? <p className="text-sm text-muted-foreground">{t.now.noOpen}</p> : openNow.map((p) => <OpenNowCard key={p.id} p={p} t={t} locale={locale} district={p.district_id ? dName.get(p.district_id) : undefined} />)}
          </Row>
          {offers.length > 0 && <Row title={`🔥 ${t.now.offersToday}`} href="/offers" seeAll={t.now.seeAll}>{offers.map((o) => <OfferCard key={o.id} o={o} t={t} locale={locale} />)}</Row>}
          {events.length > 0 && <Row title={`📅 ${t.now.events}`} href="/events" seeAll={t.now.seeAll}>{events.map((e) => <EventCard key={e.id} e={e} t={t} locale={locale} />)}</Row>}
          {collections.length > 0 && (
            <Row title={`✨ ${t.misc.collections.title}`} href="/collections" seeAll={t.now.seeAll}>
              {collections.map((c) => (
                <Link key={c.id} href={`/collections/${c.slug}`} className="flex w-60 shrink-0 snap-start flex-col gap-1.5 rounded-2xl border bg-gradient-to-br from-primary/10 to-card p-4 shadow-sm">
                  <h3 className="font-extrabold leading-snug">{c.title}</h3>
                  <p className="text-xs font-semibold text-primary">{c.item_count} {t.misc.collections.places}</p>
                  {c.preview?.length ? <p className="line-clamp-2 text-xs text-muted-foreground">{c.preview.join("، ")}</p> : null}
                </Link>
              ))}
            </Row>
          )}
          {fresh.length > 0 && <Row title={`🆕 ${t.now.newPlaces.replace("{city}", cname)}`}>{fresh.map((p) => <NewPlaceCard key={p.id} p={p} t={t} locale={locale} district={p.district_id ? dName.get(p.district_id) : undefined} />)}</Row>}
        </>
      )}

      {top.length > 0 && (
        <section aria-labelledby="cats">
          <h2 id="cats" className="mb-3 text-lg font-extrabold">{t.home.categories}</h2>
          <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5">
            {top.map((c) => (
              <li key={c.id}>
                <Link href={categoryHref(c.slug)} className="flex h-full flex-col items-center gap-2 rounded-xl border bg-card p-3 text-center transition hover:-translate-y-0.5 hover:shadow-md">
                  <span className="grid size-12 place-items-center rounded-xl text-white" style={{ background: c.color ?? "hsl(var(--primary))" }}>
                    <DynamicIcon icon={c.icon} className="size-6" aria-hidden />
                  </span>
                  <span className="text-xs font-bold leading-tight sm:text-sm">{localized(c, locale)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {supabaseConfigured && (
        <section aria-label={t.home2.classifieds} className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {([
            ["/real-estate", Building2, t.listings.kinds.property], ["/cars", Car, t.listings.kinds.vehicle], ["/jobs", Briefcase, t.listings.kinds.job],
            ["/live/pharmacies", Pill, t.live.pharmacies], ["/live/fuel", Fuel, t.live.fuel], ["/live/water", Droplets, t.live.water],
          ] as const).map(([href, Icon, label]) => (
            <Link key={href} href={href} className="flex flex-col items-center gap-1.5 rounded-xl border bg-card p-3 text-center text-xs font-bold hover:bg-muted">
              <Icon className="size-6 text-primary" aria-hidden />{label}
            </Link>
          ))}
        </section>
      )}


      {supabaseConfigured && (
  <section aria-labelledby="duty">
    <h2 id="duty" className="mb-3 flex items-center gap-2 text-lg font-extrabold">
      <Link href="/live/pharmacies" className="hover:underline">{t.home.duty}</Link> <Badge tone="success">{duty.length}</Badge>
    </h2>
    {duty.length === 0 ? (
      <p className="text-sm text-muted-foreground">{t.home.dutyEmpty}</p>
    ) : (
      <div className="grid gap-3">
        {duty.map((b) => <BusinessCard key={b.id} b={b} t={t} locale={locale} />)}
      </div>
    )}
  </section>
)}

{districts.length > 0 && (
  <section aria-labelledby="dists">
    <h2 id="dists" className="mb-3 text-lg font-extrabold">{t.home.districts}</h2>
    <ul className="flex flex-wrap gap-2">
      {districts.map((d) => (
        <li key={d.id}><Badge className="px-3 py-1.5 text-sm">{localized(d, locale)}</Badge></li>
      ))}
    </ul>
  </section>
)}
    </div>
  );
}
