import { Eye, MapPinned, Phone, Star, Users } from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { BusinessStats } from "@/lib/data-dashboard";
import { cn } from "@/lib/utils";

/** KPI tiles + a tiny CSS bar chart (views vs contacts per day). No chart library on purpose (weak networks). */
export function StatsPanel({ s, id, t }: { s: BusinessStats; id: string; t: Dictionary }) {
  const d = t.dash;
  const tot = (k: string) => s.totals[k] ?? 0;
  const tiles = [
    { Icon: Eye, label: d.views, v: tot("view") },
    { Icon: Phone, label: d.contacts, v: tot("call") + tot("whatsapp") },
    { Icon: MapPinned, label: d.directions, v: tot("directions") },
    { Icon: Users, label: d.followers, v: s.followers },
    { Icon: Star, label: d.rating, v: s.rating_count ? `${Number(s.rating_avg).toFixed(1)} (${s.rating_count})` : "—" },
  ];
  const max = Math.max(1, ...s.daily.map((x) => x.views + x.contacts));
  return (
    <Card className="space-y-4 p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-extrabold">{d.stats}</h2>
        <div className="flex gap-1 text-xs font-bold">
          {[7, 30, 90].map((n) => <Link key={n} href={`/dashboard/${id}?days=${n}`} className={cn("rounded-full px-3 py-1", s.days === n ? "bg-primary text-primary-foreground" : "bg-muted")}>{n}</Link>)}
        </div>
      </div>
      <p className="text-xs text-muted-foreground">{d.lastDays.replace("{n}", String(s.days))}</p>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {tiles.map(({ Icon, label, v }) => (
          <li key={label} className="rounded-xl bg-muted p-3"><Icon className="mb-1 size-4 text-primary" aria-hidden /><p className="text-xl font-extrabold">{v}</p><p className="text-xs text-muted-foreground">{label}</p></li>
        ))}
      </ul>
      <div className="flex h-28 items-end gap-px" role="img" aria-label={`${d.views} / ${d.contacts}`}>
        {s.daily.map((x) => (
          <div key={x.day} className="flex h-full flex-1 flex-col justify-end" title={`${x.day}: ${x.views} / ${x.contacts}`}>
            <div className="bg-accent" style={{ height: `${(x.contacts / max) * 100}%` }} />
            <div className="bg-primary/70" style={{ height: `${(x.views / max) * 100}%` }} />
          </div>
        ))}
      </div>
      <p className="flex gap-4 text-xs text-muted-foreground"><span><i className="me-1 inline-block size-2 rounded-sm bg-primary/70" />{d.views}</span><span><i className="me-1 inline-block size-2 rounded-sm bg-accent" />{d.contacts}</span></p>
    </Card>
  );
}
