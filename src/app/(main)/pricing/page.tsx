import { Check, MessageCircle, Sparkles } from "lucide-react";
import Link from "next/link";
import { Badge, Card } from "@/components/ui/card";
import { SubscriptionPanel, type PanelBusiness } from "@/features/money/subscription-panel";
import { getCurrentProfile, getPlans, getSubscriptionsFor } from "@/lib/data";
import { getOwnedBusinesses } from "@/lib/data-dashboard";
import { getI18n } from "@/lib/i18n/server";
import { formatDate } from "@/lib/time";
import { cn } from "@/lib/utils";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t.money.title, description: t.money.subtitle, openGraph: { images: [{ url: "/og-default.png" }] } };
}

export default async function PricingPage() {
  const { t, locale } = await getI18n();
  const m = t.money;
  const [plans, profile, owned] = await Promise.all([getPlans(), getCurrentProfile(), getOwnedBusinesses()]);
  const subs = await getSubscriptionsFor(owned.map((b) => b.id));
  const wa = process.env.NEXT_PUBLIC_CONTACT_WHATSAPP;
  const name = (p: (typeof plans)[number]) => m.planNames[p.code] ?? p.name_ar;
  const features = (p: (typeof plans)[number]): string[] => (Array.isArray(p.features) ? (p.features as string[]) : p.features[locale] ?? p.features.en ?? p.features.ar ?? []);
  const panel: PanelBusiness[] = owned.filter((b) => b.status !== "suspended").map((b) => {
    const active = subs.find((s) => s.business_id === b.id && s.status === "active" && (!s.ends_at || new Date(s.ends_at) > new Date()));
    const pend = subs.find((s) => s.business_id === b.id && s.status === "pending");
    return { id: b.id, name: b.name, activePlan: active?.plan.code ?? "free", activeUntil: active?.ends_at ?? null, pending: pend ? { id: pend.id, plan: pend.plan.code } : null };
  });
  const paid = plans.filter((p) => p.price_iqd > 0).map((p) => ({ code: p.code as "pro" | "featured", name: name(p), price: p.price_iqd, days: p.duration_days }));

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="space-y-1 text-center">
        <h1 className="text-2xl font-extrabold md:text-3xl">{m.title}</h1>
        <p className="text-muted-foreground">{m.subtitle}</p>
      </header>
      <ul className="grid gap-4 md:grid-cols-3">
        {plans.map((p) => (
          <li key={p.id}><Card className={cn("flex h-full flex-col gap-3 p-5", p.is_featured_tier && "border-accent shadow-md")}>
            <div className="flex items-center justify-between"><h2 className="text-lg font-extrabold">{name(p)}</h2>{p.is_featured_tier && <Badge tone="accent"><Sparkles className="size-3" aria-hidden />{t.common.featured}</Badge>}</div>
            <p className="text-3xl font-extrabold text-primary">{p.price_iqd === 0 ? m.free : new Intl.NumberFormat("en-US").format(p.price_iqd)}
              {p.price_iqd > 0 && <span className="block text-xs font-medium text-muted-foreground">{m.perMonth.replace("{n}", String(p.duration_days))}</span>}</p>
            <ul className="space-y-1.5 text-sm">{features(p).map((f) => <li key={f} className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />{f}</li>)}</ul>
          </Card></li>
        ))}
      </ul>

      <Card className="space-y-2 bg-muted p-4 text-sm">
        <p>{m.howToPay}</p>
        {wa && <a href={`https://wa.me/${wa.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 font-bold text-primary"><MessageCircle className="size-4" aria-hidden />{m.contact}</a>}
      </Card>

      <section aria-labelledby="mine" className="space-y-3">
        <h2 id="mine" className="text-lg font-extrabold">{m.upgrade}</h2>
        {!profile ? <Link href="/login?next=/pricing" className="block rounded-xl bg-muted p-4 text-center text-sm font-bold text-primary">{m.loginOwner}</Link>
          : panel.length === 0 ? <p className="rounded-xl bg-muted p-4 text-center text-sm"><Link className="font-bold text-primary underline" href="/suggest">{m.noBusiness}</Link></p>
          : panel.map((b) => <SubscriptionPanel key={b.id} business={b} plans={paid} t={t} activeLabel={b.activeUntil ? m.activeUntil.replace("{date}", formatDate(b.activeUntil, locale)) : ""} />)}
      </section>
    </div>
  );
}
