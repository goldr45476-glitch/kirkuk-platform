import { BadgeCheck, Clock, MapPin, Phone, Share2, Star } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { SaveButton } from "@/features/saved/saved-context";
import { getCollection, getDistricts } from "@/lib/data";
import { SITE_URL } from "@/lib/env";
import { formatClock } from "@/lib/format-time";
import { getI18n, localized } from "@/lib/i18n/server";
import { cn } from "@/lib/utils";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const c = await getCollection((await params).slug);
  if (!c) return {};
  return { title: c.title, description: c.description ?? undefined, alternates: { canonical: `/collections/${c.slug}` },
    openGraph: { title: c.title, description: c.description ?? undefined, type: "article", images: [{ url: "/og-default.png" }] } };
}

export default async function CollectionPage({ params }: Props) {
  const c = await getCollection((await params).slug);
  if (!c) notFound();
  const [{ t, locale }, districts] = await Promise.all([getI18n(), getDistricts()]);
  const dName = new Map(districts.map((d) => [d.id, localized(d, locale)]));
  const labels = { save: t.misc.saved.save, saved: t.misc.saved.isSaved, login: t.misc.saved.loginToSave };
  const url = `${SITE_URL}/collections/${c.slug}`;
  const jsonLd = { "@context": "https://schema.org", "@type": "ItemList", name: c.title, itemListElement: c.items.map((b, i) => ({ "@type": "ListItem", position: i + 1, url: `${SITE_URL}/business/${b.slug}`, name: b.name })) };

  return (
    <article className="mx-auto max-w-2xl space-y-5">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <Link href="/collections" className="text-sm font-semibold text-primary">← {t.misc.collections.back}</Link>
      <header className="space-y-2">
        <h1 className="text-2xl font-extrabold leading-snug md:text-3xl">{c.title}</h1>
        {c.description && <p className="text-muted-foreground">{c.description}</p>}
        {c.status === "draft" && <Badge tone="accent">draft</Badge>}
        <a href={`https://wa.me/?text=${encodeURIComponent(`${c.title}\n${url}`)}`} target="_blank" rel="noopener noreferrer" className={cn(buttonVariants({ variant: "success", size: "sm" }))}><Share2 aria-hidden />{t.misc.collections.shareWa}</a>
      </header>
      <ol className="space-y-3">
        {c.items.map((b, i) => (
          <li key={b.id}><Card className="relative flex gap-3 p-4">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary text-sm font-extrabold text-primary-foreground" aria-hidden>{i + 1}</span>
            <div className="min-w-0 flex-1 space-y-1.5">
              <h2 className="flex items-center gap-1 font-bold leading-snug"><Link href={`/business/${b.slug}`} className="truncate after:absolute after:inset-0">{b.name}</Link>{b.is_verified && <BadgeCheck className="size-4 shrink-0 text-primary" aria-label={t.common.verified} />}</h2>
              {b.note && <p className="text-sm font-semibold text-primary">{b.note}</p>}
              <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                {b.district_id && <span className="inline-flex items-center gap-1"><MapPin className="size-3" aria-hidden />{dName.get(b.district_id)}</span>}
                {b.rating_count > 0 && <span className="inline-flex items-center gap-1"><Star className="size-3 fill-accent text-accent" aria-hidden />{Number(b.rating_avg).toFixed(1)}</span>}
                {b.price_level && <span>{"$".repeat(b.price_level)}</span>}
                {b.is_open !== null && <span className={cn("inline-flex items-center gap-1 font-semibold", b.is_open && "text-success")}><Clock className="size-3" aria-hidden />{b.is_open ? (b.closes_at ? t.now.closesAt.replace("{time}", formatClock(b.closes_at, locale)) : t.now.openNow) : t.business.closedNow}</span>}
              </p>
              {b.phone && <a href={`tel:${b.phone}`} className="relative z-10 inline-flex items-center gap-1 text-sm font-bold text-primary"><Phone className="size-4" aria-hidden />{t.common.call}</a>}
            </div>
            <SaveButton kind="business" id={b.id} labels={labels} />
          </Card></li>
        ))}
      </ol>
    </article>
  );
}
