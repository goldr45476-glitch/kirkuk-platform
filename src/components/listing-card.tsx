import { Building2, Car, Briefcase, MapPin } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Badge, Card } from "@/components/ui/card";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { listingFacts, formatPrice } from "@/lib/listing-facts";
import { timeAgo } from "@/lib/time";
import type { ListingCardRow, Locale } from "@/lib/types";

const ICON = { property: Building2, vehicle: Car, job: Briefcase } as const;

export function ListingCard({ l, t, locale, district }: { l: ListingCardRow & { status?: string }; t: Dictionary; locale: Locale; district?: string }) {
  const Icon = ICON[l.kind];
  return (
    <Card className="relative flex animate-fade-up gap-3 overflow-hidden p-3 transition hover:shadow-md">
      <div className="relative grid size-24 shrink-0 place-items-center overflow-hidden rounded-xl bg-muted text-muted-foreground sm:size-28">
        {l.image ? <Image src={l.image} alt="" fill sizes="112px" className="object-cover" /> : <Icon className="size-8" aria-hidden />}
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        <h3 className="line-clamp-2 font-bold leading-snug">
          <Link href={`/listings/${l.id}`} className="after:absolute after:inset-0 hover:underline">{l.title}</Link>
        </h3>
        <p className="font-extrabold text-primary">{formatPrice(l.price, l.currency, t, locale)}</p>
        <div className="flex flex-wrap gap-1">
          {l.is_featured && <Badge tone="accent">{t.listings.featured}</Badge>}
          {l.status === "sold" && <Badge>{t.listings.sold}</Badge>}
          {listingFacts(l, t).slice(0, 3).map((f) => <Badge key={f}>{f}</Badge>)}
        </div>
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          {district && <span className="inline-flex items-center gap-1"><MapPin className="size-3" aria-hidden />{district}</span>}
          <time dateTime={l.created_at} suppressHydrationWarning>{timeAgo(l.created_at, locale)}</time>
        </p>
      </div>
    </Card>
  );
}
