import Link from "next/link";
import type { Dictionary } from "@/lib/i18n/dictionaries";

export function Footer({ t }: { t: Dictionary }) {
  const l = t.misc.legal;
  return (
    <footer className="container pb-24 pt-6 text-xs text-muted-foreground md:pb-10">
      <nav aria-label="legal" className="flex flex-wrap gap-x-4 gap-y-2 border-t pt-4 font-semibold">
        <Link href="/privacy" className="hover:text-foreground">{l.privacy}</Link>
        <Link href="/terms" className="hover:text-foreground">{l.terms}</Link>
        <Link href="/content-policy" className="hover:text-foreground">{l.content}</Link>
        <Link href="/pricing" className="hover:text-foreground">{t.money.pricing}</Link>
        <Link href="/suggest" className="hover:text-foreground">{l.suggest}</Link>
      </nav>
      <p className="mt-2">© {new Date().getFullYear()} {t.appName} — {l.rights}</p>
    </footer>
  );
}
