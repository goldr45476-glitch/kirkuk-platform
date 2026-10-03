import { BadgeCheck, ChevronLeft, Plus } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Badge, Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getCurrentProfile } from "@/lib/data";
import { getOwnedBusinesses } from "@/lib/data-dashboard";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t.dash.title, robots: { index: false } };
}

export default async function DashboardHome() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login?next=/dashboard");
  const { t } = await getI18n();
  const list = await getOwnedBusinesses();
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center justify-between"><h1 className="text-2xl font-extrabold">{t.dash.myPlaces}</h1>
        <Button asChild size="sm"><Link href="/suggest"><Plus aria-hidden />{t.suggest.title}</Link></Button></div>
      {list.length === 0 ? <p className="rounded-xl bg-muted p-6 text-center text-sm text-muted-foreground">{t.dash.none}</p> : (
        <ul className="space-y-3">
          {list.map((b) => (
            <li key={b.id}>
              <Link href={`/dashboard/${b.id}`}>
                <Card className="flex items-center gap-3 p-4 transition hover:bg-muted">
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1 font-bold"><span className="truncate">{b.name}</span>{b.last_verified_at && <BadgeCheck className="size-4 text-primary" aria-label={t.common.verified} />}</p>
                    <p className="text-xs text-muted-foreground">{b.followers_count} {t.business.followers}{b.rating_count > 0 && ` · ★ ${Number(b.rating_avg).toFixed(1)} (${b.rating_count})`}</p>
                  </div>
                  <Badge tone={b.status === "active" ? "success" : b.status === "pending" ? "accent" : "muted"}>{t.dash.status[b.status]}</Badge>
                  <ChevronLeft className="size-5 rtl:rotate-0 ltr:rotate-180" aria-hidden />
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
