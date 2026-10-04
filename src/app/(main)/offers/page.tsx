import { OfferCard } from "@/components/now-cards";
import { OfferForm } from "@/features/now/forms";
import { getCurrentProfile, getLiveOffers, getMyBusinesses } from "@/lib/data";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t.offers.title };
}

export default async function OffersPage() {
  const { t, locale } = await getI18n();
  const [offers, profile, mine] = await Promise.all([getLiveOffers(50), getCurrentProfile(), getMyBusinesses()]);
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <h1 className="text-2xl font-extrabold">{t.offers.title}</h1>
      {offers.length === 0 ? <p className="py-10 text-center text-muted-foreground">{t.offers.empty}</p> : (
        <div className="grid gap-3 sm:grid-cols-2"><h2 className="sr-only">{t.offers.title}</h2>{offers.map((o) => <OfferCard key={o.id} o={o} t={t} locale={locale} wide />)}</div>
      )}
      {profile && mine.length > 0 ? <OfferForm businesses={mine} t={t} /> : !profile ? null : <p className="text-sm text-muted-foreground">{t.offers.loginOwner}</p>}
    </div>
  );
}
