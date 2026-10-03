import { Droplets, Fuel, MapPin, Phone, Pill } from "lucide-react";
import { notFound } from "next/navigation";
import { BusinessCard } from "@/components/business-card";
import { Badge, Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { DutyForm, StatusReport } from "@/features/business/live-status";
import { getCurrentProfile, getDistricts, getDutyRoster, getMyPharmacies, getServiceStatus, searchBusinesses } from "@/lib/data";
import { getI18n, localized } from "@/lib/i18n/server";
import { timeAgo } from "@/lib/time";
import { cn } from "@/lib/utils";

const TYPES = ["pharmacies", "fuel", "water"] as const;
type LiveType = (typeof TYPES)[number];
const ICON = { pharmacies: Pill, fuel: Fuel, water: Droplets } as const;

export async function generateMetadata({ params }: { params: Promise<{ type: string }> }) {
  const { type } = await params;
  const { t } = await getI18n();
  return TYPES.includes(type as LiveType) ? { title: t.live[type as LiveType] } : {};
}

export default async function LivePage({ params }: { params: Promise<{ type: string }> }) {
  const { type } = await params;
  if (!TYPES.includes(type as LiveType)) notFound();
  const kind = type as LiveType;
  const { t, locale } = await getI18n();
  const lt = t.live;
  const Icon = ICON[kind];

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <span className="grid size-11 place-items-center rounded-xl bg-primary/12 text-primary"><Icon className="size-6" aria-hidden /></span>
        <h1 className="text-2xl font-extrabold">{lt[kind]}</h1>
      </div>
      <nav className="flex gap-2 overflow-x-auto" aria-label={lt.title}>
        {TYPES.map((k) => (
          <a key={k} href={`/live/${k}`} aria-current={k === kind ? "page" : undefined}
            className={cn("shrink-0 rounded-full border px-3 py-1.5 text-sm font-semibold", k === kind ? "border-transparent bg-primary text-primary-foreground" : "bg-card hover:bg-muted")}>{lt[k]}</a>
        ))}
      </nav>
      {kind === "pharmacies" ? <Pharmacies /> : <Stations kind={kind} />}
    </div>
  );
}

async function Pharmacies() {
  const { t, locale } = await getI18n();
  const lt = t.live;
  const [roster, mine, all] = await Promise.all([getDutyRoster(), getMyPharmacies(), searchBusinesses({ category: "pharmacies", sort: "rating" })]);
  const onDutyIds = new Set([...roster.today, ...roster.tomorrow].map((b) => b.id));
  const others = all.rows.filter((b) => !onDutyIds.has(b.id));
  const section = (title: string, list: typeof roster.today) => (
    <section className="space-y-3">
      <h2 className="flex items-center gap-2 text-lg font-extrabold">{title} <Badge tone="success">{list.length}</Badge></h2>
      {list.length === 0 ? <p className="text-sm text-muted-foreground">{lt.noDuty}</p> : <div className="grid gap-3 md:grid-cols-2">{list.map((b) => <BusinessCard key={b.id} b={b} t={t} locale={locale} />)}</div>}
    </section>
  );
  return (
    <>
      {section(lt.dutyToday, roster.today)}
      {section(lt.dutyTomorrow, roster.tomorrow)}
      {mine.length > 0 && <DutyForm pharmacies={mine} t={t} />}
      {others.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-extrabold">{lt.allPharmacies}</h2>
          <div className="grid gap-3 md:grid-cols-2">{others.map((b) => <BusinessCard key={b.id} b={b} t={t} locale={locale} />)}</div>
        </section>
      )}
    </>
  );
}

async function Stations({ kind }: { kind: "fuel" | "water" }) {
  const { t, locale } = await getI18n();
  const lt = t.live;
  const [rows, districts, profile] = await Promise.all([getServiceStatus(kind), getDistricts(), getCurrentProfile()]);
  const dName = new Map(districts.map((d) => [d.id, localized(d, locale)]));
  const tone = { available: "success", unavailable: "muted", queue: "accent" } as const;
  return (
    <>
      <p className="text-sm text-muted-foreground">{lt.hint}</p>
      {rows.length === 0 ? <p className="py-10 text-center text-muted-foreground">{t.common.empty}</p> : (
        <div className="grid gap-3 md:grid-cols-2">
          {rows.map((s) => (
            <Card key={s.id} className="space-y-3 p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="truncate font-bold">{s.name}</h3>
                  <p className="flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="size-3.5" aria-hidden />{s.district_id ? dName.get(s.district_id) : ""}{s.address ? ` · ${s.address}` : ""}</p>
                </div>
                {s.phone && <a href={`tel:${s.phone}`} aria-label={t.common.call} className={cn(buttonVariants({ size: "icon", variant: "outline" }), "shrink-0")}><Phone aria-hidden /></a>}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {s.status ? (
                  <>
                    <Badge tone={tone[s.status]}>{lt.status[s.status]}{s.status === "queue" && s.queue_level != null ? ` · ${lt.queue[s.queue_level]}` : ""}</Badge>
                    <span className="text-xs text-muted-foreground"><time dateTime={s.reported_at!} suppressHydrationWarning>{lt.updated} {timeAgo(s.reported_at!, locale)}</time> · {s.recent_reports} {lt.reports}</span>
                  </>
                ) : <span className="text-xs text-muted-foreground">{lt.noReports}</span>}
                {s.is_open && <Badge tone="success">{t.common.openNow}</Badge>}
              </div>
              <StatusReport businessId={s.id} loggedIn={!!profile} t={t} />
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
