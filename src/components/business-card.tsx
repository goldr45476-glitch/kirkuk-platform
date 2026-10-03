import Link from "next/link";
import { BadgeCheck, MapPin, MessageCircle, Phone, Star } from "lucide-react";
import { Badge, Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { localized } from "@/lib/i18n/server";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { Business, Locale } from "@/lib/types";
import { cn } from "@/lib/utils";

const waLink = (n: string) => `https://wa.me/${n.replace(/\D/g, "").replace(/^0/, "964")}`;

export function BusinessCard({ b, t, locale }: { b: Business; t: Dictionary; locale: Locale }) {
  return (
    <Card className="relative flex flex-col gap-3 p-4 animate-fade-up">
      <div className="flex items-start gap-3">
        <div className="grid size-12 shrink-0 place-items-center rounded-xl bg-primary/12 text-lg font-extrabold text-primary" aria-hidden>
          {b.name.charAt(0)}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="flex items-center gap-1 font-bold leading-snug">
            <Link href={`/business/${b.slug}`} className="truncate after:absolute after:inset-0 hover:underline">{b.name}</Link>
            {b.is_verified && <BadgeCheck className="size-4 shrink-0 text-primary" aria-label={t.common.verified} />}
          </h3>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {b.rating_count > 0 && (
              <span className="inline-flex items-center gap-1"><Star className="size-3.5 fill-accent text-accent" aria-hidden />{Number(b.rating_avg).toFixed(1)} ({b.rating_count})</span>
            )}
            {b.is_open != null && (
              <span className={cn("font-semibold", b.is_open ? "text-success" : "text-muted-foreground")}>{b.is_open ? t.common.openNow : t.business.closedNow}</span>
            )}
            {b.distance_km != null && <span>{b.distance_km.toFixed(1)} {t.search.km}</span>}
            {b.district && (
              <span className="inline-flex items-center gap-1"><MapPin className="size-3.5" aria-hidden />{localized(b.district, locale)}</span>
            )}
          </div>
        </div>
        {b.is_featured && <Badge tone="accent">{t.common.featured}</Badge>}
      </div>
      {b.description && <p className="line-clamp-2 text-sm text-muted-foreground">{b.description}</p>}
      {(b.phone || b.whatsapp) && (
        <div className="relative z-10 flex gap-2">
          {b.phone && (
            <a href={`tel:${b.phone}`} className={cn(buttonVariants({ size: "sm" }), "flex-1")}><Phone aria-hidden />{t.common.call}</a>
          )}
          {b.whatsapp && (
            <a href={waLink(b.whatsapp)} target="_blank" rel="noopener noreferrer" className={cn(buttonVariants({ size: "sm", variant: "success" }), "flex-1")}>
              <MessageCircle aria-hidden />{t.common.whatsapp}
            </a>
          )}
        </div>
      )}
    </Card>
  );
}
