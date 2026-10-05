import { Compass, Database, Search } from "lucide-react";
import Link from "next/link";
import { BusinessCard } from "@/components/business-card";
import { AdSlider } from "@/components/ad-slider";
import { CitadelLogo } from "@/components/citadel-logo";
import { Badge, Card } from "@/components/ui/card";
import { Composer } from "@/features/feed/composer";
import { FeedList } from "@/features/feed/feed-list";
import { StoriesRow } from "@/features/feed/stories";
import { ReelsStrip } from "@/features/reels/reels-strip";
import { cityName, getCity } from "@/lib/city";
import { dayPart } from "@/lib/format-time";
import { FEED_PAGE, getAds, getCurrentProfile, getDistricts, getDutyPharmacies, getFeed, getMyBusinesses, getReels, getStoryRings } from "@/lib/data";
import { supabaseConfigured } from "@/lib/env";
import { getI18n, localized } from "@/lib/i18n/server";

export default async function HomePage({ searchParams }: { searchParams: Promise<{ feed?: string }> }) {
  const mode = (await searchParams).feed === "following" ? "following" : "all";
  const { t, locale } = await getI18n();
  const [districts, duty, profile, rings, myBiz, posts, city, feedAds, bannerAds, reels] = await Promise.all([
    getDistricts(), getDutyPharmacies(), getCurrentProfile(), getStoryRings(), getMyBusinesses(), getFeed({ mode }),
    getCity(), getAds("feed", null, 3), getAds("home_banner", null, 6), getReels(10),
  ]);
  const cname = cityName(city, locale) || t.appName;
  const intents = [
    ["eat", "/search?category=food&open=1", "🍽️"], ["coffee", "/search?category=cafes&open=1", "☕"], ["shop", "/search?category=shops", "🛍️"],
    ["pharmacy", "/live/pharmacies", "💊"], ["doctor", "/search?category=health&open=1", "🩺"], ["kids", "/search?q=%D8%A3%D8%B7%D9%81%D8%A7%D9%84", "🧒"],
  ] as const;

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      {/* Hero: greeting + search + quick intents, above the ads slider */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary to-primary/70 p-5 text-primary-foreground shadow-lg shadow-primary/25 md:p-8">
        <CitadelLogo className="pointer-events-none absolute -bottom-6 -start-6 size-48 opacity-[.12] md:size-64" gate="transparent" flag="transparent" />
        <span className="pointer-events-none absolute -end-16 -top-20 size-56 rounded-full bg-accent/30 blur-2xl" aria-hidden />
        <div className="relative space-y-4">
          <div>
            <p className="text-sm font-semibold text-primary-foreground/85">{t.now.greet[dayPart()]} 👋</p>
            <h1 className="mt-1 text-2xl font-extrabold leading-tight md:text-4xl">{t.now.headline.replace("{city}", cname)}</h1>
          </div>
          <form action="/search" className="relative max-w-xl" role="search">
            <Search className="pointer-events-none absolute start-3.5 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <input name="q" type="search" placeholder={t.search.placeholder} aria-label={t.search.title} enterKeyHint="search"
              className="h-12 w-full rounded-2xl bg-card ps-11 pe-4 text-base text-card-foreground shadow-lg shadow-black/10 placeholder:text-muted-foreground" />
          </form>
          <ul className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 md:mx-0 md:flex-wrap md:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <li className="shrink-0"><Link href="/explore" className="flex items-center gap-2 rounded-full bg-accent px-4 py-2.5 text-sm font-extrabold text-accent-foreground shadow-sm transition hover:brightness-105"><Compass className="size-4" aria-hidden />{t.explore.title}</Link></li>
            {intents.map(([k, href, emoji]) => (
              <li key={k} className="shrink-0">
                <Link href={href} className="flex items-center gap-2 rounded-full bg-white/15 px-4 py-2.5 text-sm font-bold text-white backdrop-blur transition hover:bg-white/25"><span aria-hidden>{emoji}</span>{t.now.intents[k]}</Link>
              </li>
            ))}
          </ul>
        </div>
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

      <AdSlider ads={bannerAds} label={t.adsSlider.label} prev={t.adsSlider.prev} next={t.adsSlider.next} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-4">
          <StoriesRow rings={rings} t={t} myBusinesses={myBiz} />
          {profile ? (
            <Composer t={t} userName={profile.full_name} avatar={profile.avatar_url} businesses={myBiz} />
          ) : supabaseConfigured && (
            <Card className="p-4 text-center text-sm"><Link href="/login" className="font-bold text-primary underline">{t.composer.loginPrompt}</Link></Card>
          )}
          {supabaseConfigured && <ReelsStrip reels={reels} t={t} canPost={!!profile} />}
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
        <aside className="hidden space-y-8 lg:block">
          {supabaseConfigured && (
            <section aria-labelledby="duty">
              <h2 id="duty" className="mb-3 flex items-center gap-2 text-lg font-extrabold">
                <Link href="/live/pharmacies" className="hover:underline">{t.home.duty}</Link> <Badge tone="success">{duty.length}</Badge>
              </h2>
              {duty.length === 0 ? <p className="text-sm text-muted-foreground">{t.home.dutyEmpty}</p> : <div className="grid gap-3">{duty.map((b) => <BusinessCard key={b.id} b={b} t={t} locale={locale} />)}</div>}
            </section>
          )}
          {districts.length > 0 && (
            <section aria-labelledby="dists">
              <h2 id="dists" className="mb-3 text-lg font-extrabold">{t.home.districts}</h2>
              <ul className="flex flex-wrap gap-2">{districts.map((d) => <li key={d.id}><Badge className="px-3 py-1.5 text-sm">{localized(d, locale)}</Badge></li>)}</ul>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
