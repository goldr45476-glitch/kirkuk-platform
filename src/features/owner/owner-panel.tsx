import { BadgeCheck, Eye, Megaphone, Pencil, Phone, Plus, Sparkles, Store, Users } from "lucide-react";
import Link from "next/link";
import { Avatar } from "@/components/avatar";
import { CitadelLogo } from "@/components/citadel-logo";
import { Badge } from "@/components/ui/card";
import type { BusinessStats, OwnedBusiness } from "@/lib/data-dashboard";
import type { Dictionary } from "@/lib/i18n/dictionaries";

/** What a business owner sees first on the home page: their places, last-7-day numbers and one-tap actions. */
export function OwnerPanel({ owned, stats, name, t }: { owned: OwnedBusiness[]; stats: Record<string, BusinessStats | null>; name: string; t: Dictionary }) {
  const o = t.owner, d = t.dash;
  const tile = "flex items-center gap-2 rounded-xl bg-white/15 px-4 py-2.5 backdrop-blur transition hover:bg-white/25";
  return (
    <section aria-label={o.panel} className="relative space-y-4 overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary to-primary/70 p-5 text-primary-foreground shadow-lg shadow-primary/25 md:p-8">
      <CitadelLogo className="pointer-events-none absolute -bottom-6 -start-6 size-44 opacity-[.10] md:size-60" gate="transparent" sun="transparent" />
      <span className="pointer-events-none absolute -end-16 -top-20 size-56 rounded-full bg-accent/30 blur-2xl" aria-hidden />
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-1.5 text-sm font-semibold text-primary-foreground/85"><Store className="size-4" aria-hidden />{o.panel}</p>
          <h1 className="mt-1 text-2xl font-extrabold leading-tight md:text-3xl">{o.hello} {name} 👋</h1>
          <p className="mt-1 text-sm text-primary-foreground/80">{o.shareHint}</p>
        </div>
        <Link href="/?as=visitor" className="shrink-0 rounded-full bg-white/15 px-3 py-1.5 text-xs font-bold backdrop-blur hover:bg-white/25">{o.visitorView}</Link>
      </div>

      <ul className="relative grid gap-3 md:grid-cols-2">
        {owned.slice(0, 4).map((b) => {
          const s = stats[b.id];
          const tot = (k: string) => s?.totals[k] ?? 0;
          return (
            <li key={b.id} className="space-y-3 rounded-2xl bg-card p-4 text-card-foreground shadow-md">
              <div className="flex items-center gap-3">
                <Avatar src={b.logo_url} name={b.name} size={44} square />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1 font-extrabold"><span className="truncate">{b.name}</span>{b.last_verified_at && <BadgeCheck className="size-4 shrink-0 text-primary" aria-label={t.common.verified} />}</p>
                  <p className="text-xs text-muted-foreground">{b.rating_count > 0 ? `★ ${Number(b.rating_avg).toFixed(1)} (${b.rating_count})` : o.last7}</p>
                </div>
                <Badge tone={b.status === "active" ? "success" : b.status === "pending" ? "accent" : "muted"}>{d.status[b.status]}</Badge>
              </div>
              {b.status === "pending" && <p className="rounded-lg bg-accent/15 p-2 text-xs font-semibold text-accent-foreground dark:text-accent">{d.wip}</p>}
              <ul className="grid grid-cols-3 gap-2 text-foreground">
                {[[Eye, d.views, tot("view")], [Phone, d.contacts, tot("call") + tot("whatsapp")], [Users, d.followers, b.followers_count]].map(([Icon, label, v]) => {
                  const I = Icon as typeof Eye;
                  return (
                    <li key={label as string} className="flex flex-col items-center gap-0.5 rounded-xl bg-muted px-2 py-2 text-center">
                      <I className="size-4 text-primary" aria-hidden /><span className="text-lg font-extrabold leading-none">{v as number}</span><span className="text-[11px] text-muted-foreground">{label as string}</span>
                    </li>
                  );
                })}
              </ul>
              <div className="flex flex-wrap gap-2 text-xs font-bold">
                <Link href={`/dashboard/${b.id}`} className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-2 text-primary-foreground"><Pencil className="size-3.5" aria-hidden />{o.editPage}</Link>
                <Link href={`/dashboard/${b.id}`} className="inline-flex items-center gap-1 rounded-full bg-accent px-3 py-2 text-accent-foreground"><Sparkles className="size-3.5" aria-hidden />{o.newOffer}</Link>
                <Link href={`/business/${b.slug}`} className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-2">{d.viewPage}</Link>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="relative flex flex-wrap gap-2 text-sm font-bold">
        <Link href="/reels/new" className={tile}><Plus className="size-4" aria-hidden />{o.newReel}</Link>
        <Link href="/suggest" className={tile}><Store className="size-4" aria-hidden />{o.addPlace}</Link>
        <Link href="/pricing" className="flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-accent-foreground shadow-sm"><Megaphone className="size-4" aria-hidden />{o.advertise}</Link>
      </div>
    </section>
  );
}
