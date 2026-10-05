import Link from "next/link";
import { MapPin, Search } from "lucide-react";
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
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="container flex h-14 items-center gap-2">
        <Link href="/" className="flex min-w-0 shrink items-center gap-2 whitespace-nowrap font-extrabold text-primary">
          <span className="grid size-8 place-items-center rounded-xl bg-gradient-to-br from-primary to-accent text-white shadow-sm"><MapPin className="size-4" aria-hidden /></span>
          <span className="max-w-[9rem] truncate text-base sm:max-w-none sm:text-lg">{t.appName}</span>
        </Link>
        <nav className="ms-4 hidden min-w-0 flex-1 items-center gap-1 overflow-hidden md:flex" aria-label="main">
          <Link className="rounded-lg px-3 py-2 text-sm font-semibold hover:bg-muted whitespace-nowrap" href="/">{t.nav.home}</Link>
          <Link className="rounded-lg px-3 py-2 text-sm font-semibold hover:bg-muted whitespace-nowrap" href="/reels">{t.nav.reels}</Link>
          <Link className="rounded-lg px-3 py-2 text-sm font-semibold hover:bg-muted whitespace-nowrap" href="/explore">{t.nav.explore}</Link>
          <Link className="hidden lg:block rounded-lg px-3 py-2 text-sm font-semibold hover:bg-muted whitespace-nowrap" href="/where">{t.nav.where}</Link>
          <Link className="hidden xl:block rounded-lg px-3 py-2 text-sm font-semibold hover:bg-muted whitespace-nowrap" href="/categories">{t.nav.categories}</Link>
          <Link className="hidden 2xl:block rounded-lg px-3 py-2 text-sm font-semibold hover:bg-muted whitespace-nowrap" href="/offers">{t.nav.offers}</Link>
          <Link className="hidden 2xl:block rounded-lg px-3 py-2 text-sm font-semibold hover:bg-muted whitespace-nowrap" href="/events">{t.nav.events}</Link>
        </nav>
        <div className="ms-auto flex shrink-0 items-center gap-1">
          <Link href="/search" aria-label={t.search.title} className="hidden size-9 items-center justify-center rounded-lg hover:bg-muted sm:inline-flex sm:size-10"><Search className="size-5" aria-hidden /></Link>
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
