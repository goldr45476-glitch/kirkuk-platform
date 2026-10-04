import Link from "next/link";
import { EventCard } from "@/components/now-cards";
import { EventForm } from "@/features/now/forms";
import { getCurrentProfile, getUpcomingEvents } from "@/lib/data";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t.events.title };
}

export default async function EventsPage() {
  const { t, locale } = await getI18n();
  const [events, profile] = await Promise.all([getUpcomingEvents(30, 50), getCurrentProfile()]);
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <h1 className="text-2xl font-extrabold">{t.events.title}</h1>
      {events.length === 0 ? <p className="py-10 text-center text-muted-foreground">{t.events.empty}</p> : (
        <div className="grid gap-3 sm:grid-cols-2"><h2 className="sr-only">{t.events.title}</h2>{events.map((e) => <EventCard key={e.id} e={e} t={t} locale={locale} wide />)}</div>
      )}
      {profile ? <EventForm t={t} /> : <Link href="/login?next=/events" className="block rounded-xl bg-muted p-3 text-center text-sm font-bold text-primary">{t.events.loginToSuggest}</Link>}
    </div>
  );
}
