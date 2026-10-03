import { MapPin, MessageCircle, Phone } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { Badge, Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { OwnerControls, ReportListing, TrackListingView } from "@/features/listings/listing-actions";
import { getCurrentProfile, getDistricts, getListing } from "@/lib/data";
import { SITE_URL } from "@/lib/env";
import { getI18n, localized } from "@/lib/i18n/server";
import { KIND_ROUTE } from "@/lib/listings";
import { formatPrice, listingFacts } from "@/lib/listing-facts";
import { formatDate } from "@/lib/time";
import { cn } from "@/lib/utils";

type Props = { params: Promise<{ id: string }> };
const valid = (id: string) => z.string().uuid().safeParse(id).success;
const waLink = (n: string) => `https://wa.me/${n.replace(/\D/g, "").replace(/^0/, "964")}`;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const l = valid(id) ? await getListing(id) : null;
  if (!l) return {};
  const desc = (l.description ?? "").slice(0, 160);
  return { title: l.title, description: desc, alternates: { canonical: `/listings/${l.id}` }, openGraph: { title: l.title, description: desc, images: l.images[0] ? [{ url: l.images[0].url }] : undefined } };
}

export default async function ListingPage({ params }: Props) {
  const { id } = await params;
  if (!valid(id)) notFound();
  const l = await getListing(id);
  if (!l) notFound();
  const [{ t, locale }, profile, districts] = await Promise.all([getI18n(), getCurrentProfile(), getDistricts()]);
  const L = t.listings;
  const district = districts.find((d) => d.id === l.district_id);
  const mine = profile?.id === l.user_id;
  const facts = listingFacts(l, t);
  const d = l.details;
  const extra: [string, unknown][] = [
    [L.f.baths, d.baths], [L.f.floor, d.floor], [L.f.fuel, d.fuel], [L.f.year, d.year], [L.f.mileage, d.mileage_km], [L.f.salary, d.salary],
  ];

  const jsonLd = l.kind === "job"
    ? { "@context": "https://schema.org", "@type": "JobPosting", title: l.title, description: l.description ?? l.title, datePosted: l.created_at, employmentType: String(d.employment ?? "").toUpperCase(),
        hiringOrganization: { "@type": "Organization", name: l.owner.full_name || "—" }, jobLocation: { "@type": "Place", address: { "@type": "PostalAddress", addressLocality: "Kirkuk", addressCountry: "IQ" } } }
    : { "@context": "https://schema.org", "@type": "Product", name: l.title, description: l.description ?? undefined, image: l.images.map((i) => i.url),
        offers: l.price != null ? { "@type": "Offer", price: l.price, priceCurrency: l.currency, availability: l.status === "active" ? "https://schema.org/InStock" : "https://schema.org/SoldOut", url: `${SITE_URL}/listings/${l.id}` } : undefined };

  return (
    <article className="mx-auto max-w-3xl space-y-4">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <TrackListingView id={l.id} />
      <Link href={KIND_ROUTE[l.kind]} className="text-sm font-semibold text-primary">← {L.kinds[l.kind]}</Link>

      {l.images.length > 0 && (
        <div className="grid gap-1 overflow-hidden rounded-2xl sm:grid-cols-3 sm:grid-rows-2">
          {l.images.slice(0, 5).map((im, i) => (
            <div key={im.id} className={cn("relative aspect-[4/3] bg-muted", i === 0 && "sm:col-span-2 sm:row-span-2 sm:aspect-auto")}>
              <Image src={im.url} alt={i === 0 ? l.title : ""} fill sizes={i === 0 ? "(min-width: 640px) 512px, 100vw" : "256px"} className="object-cover" priority={i === 0} />
            </div>
          ))}
        </div>
      )}

      <Card className="space-y-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          {l.is_featured && <Badge tone="accent">{L.featured}</Badge>}
          {l.status !== "active" && <Badge>{L.sold}</Badge>}
          {facts.map((f) => <Badge key={f} tone="primary">{f}</Badge>)}
        </div>
        <h1 className="text-2xl font-extrabold leading-snug">{l.title}</h1>
        <p className="text-2xl font-extrabold text-primary">{formatPrice(l.price, l.currency, t, locale)}</p>
        <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
          {district && <span className="inline-flex items-center gap-1"><MapPin className="size-4" aria-hidden />{localized(district, locale)}</span>}
          <span>{formatDate(l.created_at, locale)}</span><span>{l.views_count} {L.views}</span>
        </p>
      </Card>

      {l.description && <Card className="p-4"><h2 className="mb-2 font-extrabold">{L.f.description}</h2><p className="whitespace-pre-line leading-relaxed text-muted-foreground">{l.description}</p></Card>}

      {extra.some(([, v]) => v != null && v !== "") && (
        <Card className="p-4">
          <h2 className="mb-2 font-extrabold">{L.details}</h2>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            {extra.filter(([, v]) => v != null && v !== "").map(([k, v]) => (<div key={k} className="contents"><dt className="text-muted-foreground">{k}</dt><dd className="font-semibold">{String(v)}</dd></div>))}
          </dl>
        </Card>
      )}

      {l.phone && l.status === "active" && (
        <Card className="space-y-3 p-4">
          <h2 className="font-extrabold">{L.contact} — {l.owner.full_name}</h2>
          <div className="grid grid-cols-2 gap-2">
            <a href={`tel:${l.phone}`} className={buttonVariants({ size: "lg" })}><Phone aria-hidden />{t.common.call}</a>
            <a href={waLink(l.phone)} target="_blank" rel="noopener noreferrer" className={buttonVariants({ size: "lg", variant: "success" })}><MessageCircle aria-hidden />{t.common.whatsapp}</a>
          </div>
        </Card>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        {mine ? <OwnerControls id={l.id} status={l.status} t={t} redirectTo={KIND_ROUTE[l.kind]} /> : <ReportListing id={l.id} t={t} loggedIn={!!profile} />}
      </div>
    </article>
  );
}
