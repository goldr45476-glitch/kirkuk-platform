import { Database } from "lucide-react";
import Link from "next/link";
import { BusinessCard } from "@/components/business-card";
import { DynamicIcon } from "@/components/icon";
import { Badge, Card } from "@/components/ui/card";
import { getCategories, getDistricts, getDutyPharmacies } from "@/lib/data";
import { supabaseConfigured } from "@/lib/env";
import { getI18n, localized } from "@/lib/i18n/server";

export default async function HomePage() {
  const { t, locale } = await getI18n();
  const [categories, districts, duty] = await Promise.all([getCategories(), getDistricts(), getDutyPharmacies()]);
  const top = categories.filter((c) => c.parent_id === null);

  return (
    <div className="space-y-8">
      <section className="rounded-2xl bg-gradient-to-br from-primary to-primary/70 p-6 text-primary-foreground md:p-10">
        <h1 className="text-2xl font-extrabold md:text-4xl">{t.appName}</h1>
        <p className="mt-2 max-w-xl text-primary-foreground/90 md:text-lg">{t.tagline}</p>
      </section>

      {!supabaseConfigured && (
        <Card className="flex items-start gap-3 border-accent/60 bg-accent/10 p-4">
          <Database className="mt-0.5 size-5 shrink-0" aria-hidden />
          <div>
            <p className="font-bold">{t.home.setupTitle}</p>
            <p className="text-sm text-muted-foreground">{t.home.setupBody}</p>
          </div>
        </Card>
      )}

      {top.length > 0 && (
        <section aria-labelledby="cats">
          <h2 id="cats" className="mb-3 text-lg font-extrabold">{t.home.categories}</h2>
          <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5">
            {top.map((c) => (
              <li key={c.id}>
                <Link href={`/categories/${c.slug}`} className="flex h-full flex-col items-center gap-2 rounded-xl border bg-card p-3 text-center transition hover:-translate-y-0.5 hover:shadow-md">
                  <span className="grid size-12 place-items-center rounded-xl text-white" style={{ background: c.color ?? "hsl(var(--primary))" }}>
                    <DynamicIcon icon={c.icon} className="size-6" aria-hidden />
                  </span>
                  <span className="text-xs font-bold leading-tight sm:text-sm">{localized(c, locale)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {supabaseConfigured && (
        <section aria-labelledby="duty">
          <h2 id="duty" className="mb-3 flex items-center gap-2 text-lg font-extrabold">
            {t.home.duty} <Badge tone="success">{duty.length}</Badge>
          </h2>
          {duty.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t.home.dutyEmpty}</p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {duty.map((b) => <BusinessCard key={b.id} b={b} t={t} locale={locale} />)}
            </div>
          )}
        </section>
      )}

      {districts.length > 0 && (
        <section aria-labelledby="dists">
          <h2 id="dists" className="mb-3 text-lg font-extrabold">{t.home.districts}</h2>
          <ul className="flex flex-wrap gap-2">
            {districts.map((d) => (
              <li key={d.id}><Badge className="px-3 py-1.5 text-sm">{localized(d, locale)}</Badge></li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
