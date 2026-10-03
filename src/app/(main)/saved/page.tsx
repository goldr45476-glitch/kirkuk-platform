import { Bookmark, Clock, MapPin } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ListingCard } from "@/components/listing-card";
import { EventCard, OfferCard } from "@/components/now-cards";
import { Badge, Card } from "@/components/ui/card";
import { SaveButton } from "@/features/saved/saved-context";
import { getCurrentProfile, getDistricts, getSaved } from "@/lib/data";
import { formatClock } from "@/lib/format-time";
import { getI18n, localized } from "@/lib/i18n/server";
import { cn } from "@/lib/utils";

const TABS = ["places", "offers", "events", "listings"] as const;
type Tab = (typeof TABS)[number];

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t.misc.saved.title, robots: { index: false } };
}

export default async function SavedPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  if (!(await getCurrentProfile())) redirect("/login?next=/saved");
  const { t, locale } = await getI18n();
  const st = t.misc.saved;
  const [bundle, districts, sp] = await Promise.all([getSaved(), getDistricts(), searchParams]);
  const tab: Tab = TABS.find((x) => x === sp.tab) ?? "places";
  const dName = new Map(districts.map((d) => [d.id, localized(d, locale)]));
  const labels = { save: st.save, saved: st.isSaved, login: st.loginToSave };
  const soon = (iso: string) => new Date(iso).getTime() - Date.now() < 36e5 * 24;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="flex items-center gap-2 text-2xl font-extrabold"><Bookmark className="size-6 text-primary" aria-hidden />{st.title}</h1>
      <nav role="tablist" aria-label={st.title} className="grid grid-cols-4 rounded-xl bg-muted p-1 text-center text-xs font-bold sm:text-sm">
        {TABS.map((k) => (
          <Link key={k} role="tab" aria-selected={tab === k} href={`/saved?tab=${k}`} className={cn("rounded-lg py-2", tab === k ? "bg-card shadow-sm" : "text-muted-foreground")}>
            {st[k]}{bundle[k].length > 0 && <span className="ms-1 text-primary">{bundle[k].length}</span>}
          </Link>
        ))}
      </nav>

      {bundle[tab].length === 0 ? (
        <div className="space-y-2 py-12 text-center"><p className="font-bold">{st.empty}</p><p className="text-sm text-muted-foreground">{st.hint}</p></div>
      ) : tab === "places" ? (
        <ul className="space-y-3">
          {bundle.places.map((p) => (
            <li key={p.id}><Card className="relative flex items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <h3 className="truncate font-bold"><Link href={`/business/${p.slug}`} className="after:absolute after:inset-0">{p.name}</Link></h3>
                <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  {p.district_id && <span className="inline-flex items-center gap-1"><MapPin className="size-3" aria-hidden />{dName.get(p.district_id)}</span>}
                  {p.is_open !== null && <span className={cn("inline-flex items-center gap-1 font-semibold", p.is_open ? "text-success" : "")}><Clock className="size-3" aria-hidden />{p.is_open ? (p.closes_at ? t.now.closesAt.replace("{time}", formatClock(p.closes_at, locale)) : t.now.openNow) : t.business.closedNow}</span>}
                </p>
              </div>
              <SaveButton kind="business" id={p.id} labels={labels} />
            </Card></li>
          ))}
        </ul>
      ) : tab === "offers" ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {bundle.offers.map((o) => (
            <div key={o.id} className="space-y-1">
              <OfferCard wide t={t} locale={locale} o={{ id: o.id, title: o.title, details: o.details, image_url: null, starts_at: o.ends_at, ends_at: o.ends_at, business_id: "", business_slug: o.business_slug, business_name: o.business_name, logo_url: null, phone: null, district_id: null }} />
              {soon(o.ends_at) && <Badge tone="accent">{st.endsSoon}</Badge>}
            </div>
          ))}
        </div>
      ) : tab === "events" ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {bundle.events.map((e) => (
            <div key={e.id} className={cn("space-y-1", e.past && "opacity-60")}>
              <EventCard wide t={t} locale={locale} e={{ id: e.id, title: e.title, details: e.details, category: e.category, starts_at: e.starts_at, ends_at: e.ends_at, venue_name: e.venue_name, venue_slug: e.venue_slug, lat: null, lng: null, image_url: null }} />
              {e.past && <Badge>{st.past}</Badge>}
            </div>
          ))}
        </div>
      ) : (
        <div className="grid gap-3">
          {bundle.listings.map((l) => <ListingCard key={l.id} l={{ ...l, is_featured: false, total_count: 0 }} t={t} locale={locale} district={l.district_id ? dName.get(l.district_id) : undefined} />)}
        </div>
      )}
    </div>
  );
}
