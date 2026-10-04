import { Briefcase, Building2, Car, Compass, Database, Droplets, Fuel, Pill, Search } from "lucide-react";
import Link from "next/link";
import { BusinessCard } from "@/components/business-card";
import { DynamicIcon } from "@/components/icon";
import { Badge, Card } from "@/components/ui/card";
import { Composer } from "@/features/feed/composer";
import { FeedList } from "@/features/feed/feed-list";
import { StoriesRow } from "@/features/feed/stories";
import { EventCard, NewPlaceCard, OfferCard, OpenNowCard, Row } from "@/components/now-cards";
import { cityName, getCity } from "@/lib/city";
import { dayPart } from "@/lib/format-time";
import { FEED_PAGE, listCollections, getCategories, getCurrentProfile, getDistricts, getDutyPharmacies, getFeed, getLiveOffers, getMyBusinesses, getAds, getNewPlaces, getOpenNow, getStoryRings, getUpcomingEvents } from "@/lib/data";
import { supabaseConfigured } from "@/lib/env";
import { getI18n, localized } from "@/lib/i18n/server";
import { categoryHref } from "@/lib/category-href";

export default async function HomePage({ searchParams }: { searchParams: Promise<{ feed?: string }> }) {
  const mode = (await searchParams).feed === "following" ? "following" : "all";
  const { t, locale } = await getI18n();
  const [categories, districts, duty, profile, rings, myBiz, posts, city, openNow, offers, events, fresh, collections, feedAds] = await Promise.all([
    getCategories(), getDistricts(), getDutyPharmacies(), getCurrentProfile(), getStoryRings(), getMyBusinesses(), getFeed({ mode }),
    getCity(), getOpenNow(10), getLiveOffers(8), getUpcomingEvents(7, 8), getNewPlaces(8), listCollections(6), getAds("feed", null, 3),
  ]);
  const dName = new Map(districts.map((d) => [d.id, localized(d, locale)]));
  const cname = cityName(city, locale) || t.appName;
  const intents = [
    ["eat", "/search?category=food&open=1", "🍽️"], ["coffee", "/search?category=cafes&open=1", "☕"], ["shop", "/search?category=shops", "🛍️"],
    ["pharmacy", "/live/pharmacies", "💊"], ["doctor", "/search?category=health&open=1", "🩺"], ["kids", "/search?q=%D8%A3%D8%B7%D9%81%D8%A7%D9%84", "🧒"],
  ] as const;
  const top = categories.filter((c) => c.parent_id === null);

  return (
    <div className="space-y-8">
      <section className="rounded-2xl bg-gradient-to-br from-primary to-primary/70 p-6 text-primary-foreground md:p-10">
        <p className="text-sm font-semibold text-primary-foreground/85">{t.now.greet[dayPart()]} 👋</p>
        <h1 className="mt-1 text-2xl font-extrabold md:text-4xl">{t.now.headline.replace("{city}", cname)}</h1>
        <form action="/search" className="relative mt-5 max-w-xl" role="search">
          <Search className="pointer-events-none absolute start-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <input name="q" type="search" placeholder={t.search.placeholder} aria-label={t.search.title} enterKeyHint="search"
            className="h-12 w-full rounded-xl bg-card ps-10 pe-4 text-base text-card-foreground shadow-lg placeholder:text-muted-foreground" />
        </form>
      </section>

      {!supabaseConfigured && (
        <Card className="flex items-start gap-3 border-accent/60 bg-accent/10 p-4">
          <Database className="mt-0.5 size-5 shrink-0" aria-hidden />
          <div>
            <p className="font-bold">{t.home.setupTitle}</p>
            <p className="text-sm text-muted-foreground">{t.home.setupBody}</p>
          </div>
        </Card>
      )}

      {supabaseConfigured && (
        <>
          <section aria-label={t.now.whatToDo} className="space-y-3">
            <h2 className="text-lg font-extrabold">{t.now.whatToDo}</h2>
            <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
              {intents.map(([k, href, emoji]) => (
                <li key={k} className="shrink-0">
                  <Link href={href} className="flex items-center gap-2 rounded-full border bg-card px-4 py-2.5 text-sm font-bold hover:bg-muted"><span aria-hidden>{emoji}</span>{t.now.intents[k]}</Link>
                </li>
              ))}
            </ul>
          </section>

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

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-4">
          <StoriesRow rings={rings} t={t} myBusinesses={myBiz} />
          {profile ? (
            <Composer t={t} userName={profile.full_name} avatar={profile.avatar_url} businesses={myBiz} />
          ) : supabaseConfigured && (
            <Card className="p-4 text-center text-sm"><Link href="/login" className="font-bold text-primary underline">{t.composer.loginPrompt}</Link></Card>
          )}
          {supabaseConfigured && (
            <>
              <div role="tablist" aria-label={t.feed.title} className="grid grid-cols-2 rounded-xl bg-muted p-1 text-center text-sm font-bold">
                <Link role="tab" aria-selected={mode === "all"} href="/" className={mode === "all" ? "rounded-lg bg-card py-2 shadow-sm" : "py-2 text-muted-foreground"}>{t.feed.tabAll}</Link>
                <Link role="tab" aria-selected={mode === "following"} href={profile ? "/?feed=following" : "/login?next=/%3Ffeed=following"} className={mode === "following" ? "rounded-lg bg-card py-2 shadow-sm" : "py-2 text-muted-foreground"}>{t.feed.tabFollowing}</Link>
              </div>
              <FeedList key={mode} initial={posts} mode={mode} t={t} locale={locale} userId={profile?.id ?? null} pageSize={FEED_PAGE} emptyText={mode === "following" ? t.feed.followingEmpty : t.feed.empty} ads={mode === "all" ? feedAds : []} />
            </>
          )}
        </div>
        <aside className="space-y-8">
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
        </aside>
      </div>
    </div>
  );
}
