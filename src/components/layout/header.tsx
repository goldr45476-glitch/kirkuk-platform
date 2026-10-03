import Link from "next/link";
import { MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getI18n } from "@/lib/i18n/server";
import { NotificationBell } from "@/features/notifications/bell";
import { getCurrentProfile, getUnreadCount } from "@/lib/data";
import { LocaleSwitcher } from "./locale-switcher";
import { ThemeToggle } from "./theme-toggle";

export async function Header() {
  const { t, locale } = await getI18n();
  const profile = await getCurrentProfile();
  const unread = profile ? await getUnreadCount() : 0;
  return (
    <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur">
      <div className="container flex h-14 items-center gap-2">
        <Link href="/" className="flex items-center gap-2 font-extrabold text-primary">
          <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground"><MapPin className="size-4" aria-hidden /></span>
          <span className="text-lg">{t.appName}</span>
        </Link>
        <nav className="ms-6 hidden items-center gap-1 md:flex" aria-label="main">
          <Link className="rounded-lg px-3 py-2 text-sm font-semibold hover:bg-muted" href="/">{t.nav.home}</Link>
          <Link className="rounded-lg px-3 py-2 text-sm font-semibold hover:bg-muted" href="/categories">{t.nav.categories}</Link>
          <Link className="rounded-lg px-3 py-2 text-sm font-semibold hover:bg-muted" href="/search">{t.nav.search}</Link>
          <Link className="rounded-lg px-3 py-2 text-sm font-semibold hover:bg-muted" href="/map">{t.nav.map}</Link>
          <Link className="rounded-lg px-3 py-2 text-sm font-semibold hover:bg-muted" href="/real-estate">{t.listings.kinds.property}</Link>
          <Link className="rounded-lg px-3 py-2 text-sm font-semibold hover:bg-muted" href="/cars">{t.listings.kinds.vehicle}</Link>
          <Link className="rounded-lg px-3 py-2 text-sm font-semibold hover:bg-muted" href="/jobs">{t.listings.kinds.job}</Link>
          <Link className="rounded-lg px-3 py-2 text-sm font-semibold hover:bg-muted" href="/live/pharmacies">{t.live.title}</Link>
        </nav>
        <div className="ms-auto flex items-center gap-1">
          <LocaleSwitcher current={locale} label={t.common.language} />
          <ThemeToggle label={t.common.theme} />
          {profile && <NotificationBell userId={profile.id} initial={unread} label={t.nav.notifications} />}
          {profile ? (
            <Link href="/account" className="ms-1 grid size-9 place-items-center rounded-full bg-primary/15 text-sm font-bold text-primary" aria-label={t.nav.account}>
              {(profile.full_name || "؟").trim().charAt(0)}
            </Link>
          ) : (
            <Button asChild size="sm" className="ms-1"><Link href="/login">{t.nav.login}</Link></Button>
          )}
        </div>
      </div>
    </header>
  );
}
