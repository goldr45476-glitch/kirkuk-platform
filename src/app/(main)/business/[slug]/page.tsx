import { BadgeCheck, Clock, Globe, MapPin, MessageCircle, Phone, Star } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { Badge, Card } from "@/components/ui/card";
import { FollowShare, ReportWrongInfo, TrackView, TrackedLink } from "@/features/business/business-actions";
import { ReviewsSection } from "@/features/business/reviews";
import { PostCard } from "@/features/feed/post-card";
import { getBusinessBySlug, getCurrentProfile, getFeed, getReviews, isFollowing } from "@/lib/data";
import { SITE_URL } from "@/lib/env";
import { WEEK_ORDER, dayState, todayBaghdad } from "@/lib/hours";
import { getI18n, localized } from "@/lib/i18n/server";
import { timeAgo } from "@/lib/time";
import { cn } from "@/lib/utils";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const b = await getBusinessBySlug(slug);
  if (!b) return {};
  const desc = (b.description ?? "").slice(0, 160);
  const url = `/business/${b.slug}`;
  return {
    title: b.name,
    description: desc,
    alternates: { canonical: url },
    openGraph: { title: b.name, description: desc, url, type: "website", images: b.cover_url ?? b.logo_url ? [{ url: (b.cover_url ?? b.logo_url)! }] : undefined },
    twitter: { card: "summary_large_image", title: b.name, description: desc },
  };
}

const waLink = (n: string) => `https://wa.me/${n.replace(/\D/g, "").replace(/^0/, "964")}`;
const fmtPrice = (n: number, locale: string) => new Intl.NumberFormat(locale === "ar" ? "ar-IQ" : locale === "ku" ? "ckb-IQ" : locale === "tr" ? "tr-TR" : "en-US").format(n);

export default async function BusinessPage({ params }: Props) {
  const { slug } = await params;
  const b = await getBusinessBySlug(slug);
  if (!b) notFound();
  const { t, locale } = await getI18n();
  const [following, posts, profile, reviews] = await Promise.all([isFollowing(b.id), getFeed({ business: b.id, limit: 5 }), getCurrentProfile(), getReviews(b.id)]);
  const today = todayBaghdad();
  const hoursByDay = new Map(b.hours.map((h) => [h.day_of_week, h]));
  const bt = t.business;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: b.name,
    description: b.description ?? undefined,
    url: `${SITE_URL}/business/${b.slug}`,
    image: b.cover_url ?? b.logo_url ?? undefined,
    telephone: b.phone ?? undefined,
    address: { "@type": "PostalAddress", streetAddress: b.address ?? undefined, addressLocality: "Kirkuk", addressCountry: "IQ" },
    geo: b.lat != null && b.lng != null ? { "@type": "GeoCoordinates", latitude: b.lat, longitude: b.lng } : undefined,
    aggregateRating: b.rating_count > 0 ? { "@type": "AggregateRating", ratingValue: b.rating_avg, reviewCount: b.rating_count } : undefined,
    openingHoursSpecification: b.hours
      .filter((h) => !h.is_closed && h.open_time && h.close_time)
      .map((h) => ({
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][h.day_of_week],
        opens: h.open_time!.slice(0, 5),
        closes: h.close_time === h.open_time ? "23:59" : h.close_time!.slice(0, 5),
      })),
  };

  return (
    <article className="mx-auto max-w-3xl space-y-5">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <TrackView id={b.id} />

      <div className="overflow-hidden rounded-2xl border bg-card">
        <div className="relative h-32 bg-gradient-to-br from-primary to-primary/60 sm:h-48">
          {b.cover_url && <Image src={b.cover_url} alt="" fill sizes="(min-width: 768px) 768px, 100vw" className="object-cover" priority />}
        </div>
        <div className="px-4 pb-4">
          <div className="-mt-10 flex items-end gap-3">
            <div className="relative grid size-20 shrink-0 place-items-center overflow-hidden rounded-2xl border-4 border-card bg-primary/15 text-3xl font-extrabold text-primary">
              {b.logo_url ? <Image src={b.logo_url} alt="" fill sizes="80px" className="object-cover" /> : b.name.charAt(0)}
            </div>
            <div className="mb-1 flex flex-wrap gap-1">
              {b.is_featured && <Badge tone="accent">{t.common.featured}</Badge>}
              <Badge tone={b.is_open ? "success" : "muted"}><Clock className="size-3" aria-hidden />{b.is_open === null ? t.trust.hoursUnknown : b.is_open ? bt.open : bt.closedNow}</Badge>
            </div>
          </div>
          <h1 className="mt-3 flex items-center gap-2 text-2xl font-extrabold">
            {b.name}
            {b.is_verified && <BadgeCheck className="size-6 text-primary" aria-label={t.common.verified} />}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            {b.rating_count > 0 && <span className="inline-flex items-center gap-1"><Star className="size-4 fill-accent text-accent" aria-hidden />{Number(b.rating_avg).toFixed(1)} ({b.rating_count})</span>}
            {b.district && <span className="inline-flex items-center gap-1"><MapPin className="size-4" aria-hidden />{localized(b.district, locale)}</span>}
            <span>{b.followers_count} {bt.followers}</span>
            <span>{b.views_count} {bt.views}</span>
          </div>

          <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className={b.last_verified_at ? "font-semibold text-success" : undefined}>
              {b.last_verified_at ? t.trust.verifiedAgo.replace("{when}", timeAgo(b.last_verified_at, locale)) : t.trust.neverVerified}
            </span>
            {b.price_level && <span aria-label={t.trust.priceLevel}>{"$".repeat(b.price_level)}<span className="opacity-30">{"$".repeat(4 - b.price_level)}</span></span>}
            <ReportWrongInfo businessId={b.id} loggedIn={!!profile} t={t} />
          </p>

          <div className="mt-4 grid grid-cols-2 gap-2">
            {b.phone && <TrackedLink id={b.id} href={`tel:${b.phone}`} className={cn(buttonVariants({ size: "lg" }))}><Phone aria-hidden />{t.common.call}</TrackedLink>}
            {b.whatsapp && <TrackedLink id={b.id} event="whatsapp" href={waLink(b.whatsapp)} external className={cn(buttonVariants({ size: "lg", variant: "success" }))}><MessageCircle aria-hidden />{t.common.whatsapp}</TrackedLink>}
          </div>
          <div className="mt-2">
            <FollowShare businessId={b.id} slug={b.slug} name={b.name} initialFollowing={following} t={bt} />
          </div>
        </div>
      </div>

      {b.description && (
        <Card className="p-4"><h2 className="mb-2 font-extrabold">{bt.about}</h2><p className="whitespace-pre-line leading-relaxed text-muted-foreground">{b.description}</p></Card>
      )}

      {b.products.length > 0 && (
        <Card className="p-4">
          <h2 className="mb-3 font-extrabold">{bt.products}</h2>
          <ul className="divide-y">
            {b.products.map((p) => (
              <li key={p.id} className="flex items-start justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className={cn("font-semibold", !p.is_available && "text-muted-foreground line-through")}>{p.name}</p>
                  {p.description && <p className="text-sm text-muted-foreground">{p.description}</p>}
                </div>
                {p.price != null && <span className="shrink-0 font-bold text-primary">{fmtPrice(p.price, locale)} {bt.currency[p.currency]}</span>}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {b.images.length > 0 && (
        <Card className="p-4">
          <h2 className="mb-3 font-extrabold">{bt.gallery}</h2>
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {b.images.map((im) => (
              <li key={im.id} className="relative aspect-square overflow-hidden rounded-lg">
                <Image src={im.url} alt={im.caption ?? b.name} fill sizes="(min-width: 640px) 240px, 50vw" className="object-cover" loading="lazy" />
              </li>
            ))}
          </ul>
        </Card>
      )}

      <ReviewsSection businessId={b.id} slug={b.slug} reviews={reviews} avg={Number(b.rating_avg)} count={b.rating_count} userId={profile?.id ?? null}
        isOwner={!!profile && profile.id === b.owner_id} t={t} locale={locale} />

      {posts.length > 0 && (
        <section aria-labelledby="posts-h" className="space-y-3">
          <h2 id="posts-h" className="font-extrabold">{t.feed.title}</h2>
          {posts.map((p) => <PostCard key={p.id} post={p} t={t} locale={locale} userId={profile?.id ?? null} />)}
        </section>
      )}

      <Card className="p-4">
        <h2 className="mb-3 flex items-center gap-2 font-extrabold"><Clock className="size-5" aria-hidden />{bt.hours}</h2>
        <ul className="space-y-1.5 text-sm">
          {WEEK_ORDER.map((d) => {
            const st = dayState(hoursByDay.get(d));
            return (
              <li key={d} className={cn("flex justify-between rounded-md px-2 py-1.5", d === today && "bg-primary/10 font-bold")}>
                <span>{bt.days[d]}</span>
                <span dir="ltr">
                  {st.kind === "range" ? `${st.from} – ${st.to}` : st.kind === "24h" ? bt.open24 : bt.closed}
                </span>
              </li>
            );
          })}
        </ul>
      </Card>

      {(b.address || b.website || (b.lat != null && b.lng != null)) && (
        <Card className="space-y-3 p-4">
          <h2 className="font-extrabold">{bt.address}</h2>
          {b.address && <p className="text-muted-foreground">{b.address}</p>}
          <div className="flex flex-wrap gap-2">
            {b.lat != null && b.lng != null && (
              <TrackedLink id={b.id} event="directions" external className={buttonVariants({ variant: "outline", size: "sm" })}
                href={`https://www.openstreetmap.org/directions?to=${b.lat}%2C${b.lng}#map=17/${b.lat}/${b.lng}`}>
                <MapPin aria-hidden />{bt.openInMaps}
              </TrackedLink>
            )}
            {b.website && /^https?:\/\//.test(b.website) && (
              <a className={buttonVariants({ variant: "outline", size: "sm" })} target="_blank" rel="noopener noreferrer nofollow" href={b.website}>
                <Globe aria-hidden />{b.website.replace(/^https?:\/\//, "")}
              </a>
            )}
          </div>
        </Card>
      )}
    </article>
  );
}
