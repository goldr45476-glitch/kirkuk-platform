import { BadgeCheck, CalendarDays, Clock, MapPin, Phone, Star, Tag } from "lucide-react";
import Link from "next/link";
import { Avatar } from "@/components/avatar";
import { Badge } from "@/components/ui/card";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { dayOffset, formatClock, formatDateTime } from "@/lib/format-time";
import { timeAgo } from "@/lib/time";
import type { EventRow, Locale, NewPlaceRow, OfferRow, OpenNowRow } from "@/lib/types";
import { cn } from "@/lib/utils";

const card = "relative flex w-64 shrink-0 snap-start flex-col gap-2 rounded-2xl border bg-card p-3 shadow-sm";

/** Horizontal scroller used by every "Now" section. */
export function Row({ title, href, seeAll, children }: { title: string; href?: string; seeAll?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-extrabold">{title}</h2>
        {href && <Link href={href} className="text-sm font-bold text-primary">{seeAll}</Link>}
      </div>
      <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2">{children}</div>
    </section>
  );
}

export function OpenNowCard({ p, t, locale, district }: { p: OpenNowRow; t: Dictionary; locale: Locale; district?: string }) {
  return (
    <article className={card}>
      <div className="flex items-start gap-2">
        <Avatar name={p.name} size={40} square />
        <div className="min-w-0 flex-1">
          <h3 className="flex items-center gap-1 font-bold leading-tight">
            <Link href={`/business/${p.slug}`} className="truncate after:absolute after:inset-0">{p.name}</Link>
            {p.is_verified && <BadgeCheck className="size-4 shrink-0 text-primary" aria-label={t.common.verified} />}
          </h3>
          <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
            {district && <><MapPin className="size-3" aria-hidden />{district}</>}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        <Badge tone="success"><Clock className="size-3" aria-hidden />{p.closes_at ? t.now.closesAt.replace("{time}", formatClock(p.closes_at, locale)) : t.now.openNow}</Badge>
        {p.rating_count > 0 && <span className="inline-flex items-center gap-0.5 font-semibold"><Star className="size-3.5 fill-accent text-accent" aria-hidden />{Number(p.rating_avg).toFixed(1)}</span>}
        {p.price_level && <span className="text-muted-foreground">{"$".repeat(p.price_level)}</span>}
      </div>
      {p.last_verified_at && <p className="text-[11px] text-muted-foreground"><time suppressHydrationWarning>{t.now.verified.replace("{when}", timeAgo(p.last_verified_at, locale))}</time></p>}
      {p.phone && (
        <a href={`tel:${p.phone}`} className="relative z-10 mt-auto inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-primary text-sm font-semibold text-primary-foreground">
          <Phone className="size-4" aria-hidden />{t.common.call}
        </a>
      )}
    </article>
  );
}

export function NewPlaceCard({ p, t, locale, district }: { p: NewPlaceRow; t: Dictionary; locale: Locale; district?: string }) {
  return (
    <article className={cn(card, "w-56")}>
      <Avatar name={p.name} size={44} square />
      <h3 className="font-bold leading-tight"><Link href={`/business/${p.slug}`} className="after:absolute after:inset-0">{p.name}</Link></h3>
      <p className="flex items-center gap-1 text-xs text-muted-foreground">{district && <><MapPin className="size-3" aria-hidden />{district}</>}</p>
      <p className="mt-auto text-[11px] text-muted-foreground"><time suppressHydrationWarning>{timeAgo(p.created_at, locale)}</time></p>
    </article>
  );
}

export function OfferCard({ o, t, locale, wide }: { o: OfferRow; t: Dictionary; locale: Locale; wide?: boolean }) {
  return (
    <article className={cn(card, "border-accent/40 bg-gradient-to-br from-accent/10 to-card", wide && "w-full")}>
      <Badge tone="accent" className="self-start"><Tag className="size-3" aria-hidden />{t.offers.title}</Badge>
      <h3 className="font-extrabold leading-snug">{o.title}</h3>
      {o.details && <p className="line-clamp-2 text-sm text-muted-foreground">{o.details}</p>}
      <p className="text-xs font-semibold text-muted-foreground">
        <Link href={`/business/${o.business_slug}`} className="text-foreground after:absolute after:inset-0">{o.business_name}</Link>
        {" · "}<time suppressHydrationWarning>{t.now.endsIn.replace("{when}", timeAgo(o.ends_at, locale))}</time>
      </p>
    </article>
  );
}

export function EventCard({ e, t, locale, wide }: { e: EventRow; t: Dictionary; locale: Locale; wide?: boolean }) {
  const off = dayOffset(e.starts_at);
  const when = off === 0 ? t.now.today : off === 1 ? t.now.tomorrow : formatDateTime(e.starts_at, locale);
  const clock = new Intl.DateTimeFormat(locale === "ar" ? "ar-IQ" : locale === "ku" ? "ckb-IQ" : locale === "tr" ? "tr-TR" : "en-US", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Baghdad" }).format(new Date(e.starts_at));
  return (
    <article className={cn(card, wide && "w-full")}>
      <div className="flex items-center gap-2 text-xs font-bold text-primary"><CalendarDays className="size-4" aria-hidden />{off <= 1 ? `${when} · ${clock}` : when}</div>
      <h3 className="font-extrabold leading-snug">{e.title}</h3>
      {e.details && <p className="line-clamp-2 text-sm text-muted-foreground">{e.details}</p>}
      <div className="mt-auto flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        {e.category && <Badge>{t.events.cats[e.category as keyof typeof t.events.cats] ?? e.category}</Badge>}
        {e.venue_name && (e.venue_slug ? <Link href={`/business/${e.venue_slug}`} className="inline-flex items-center gap-1 font-semibold hover:underline"><MapPin className="size-3" aria-hidden />{e.venue_name}</Link> : <span className="inline-flex items-center gap-1"><MapPin className="size-3" aria-hidden />{e.venue_name}</span>)}
      </div>
    </article>
  );
}
