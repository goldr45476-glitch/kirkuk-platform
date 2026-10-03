import { WhereWizard } from "@/features/now/where-wizard";
import { amenityLabels } from "@/features/now/actions";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t.where.title, description: t.now.whereSub };
}

export default async function WherePage() {
  const { t, locale } = await getI18n();
  const amenities = await amenityLabels();
  return (
    <div className="space-y-4">
      <header className="mx-auto max-w-xl">
        <h1 className="text-2xl font-extrabold">{t.where.title}</h1>
        <p className="text-sm text-muted-foreground">{t.now.whereSub}</p>
      </header>
      <WhereWizard t={t} locale={locale} amenities={amenities} />
    </div>
  );
}
