const INTL: Record<string, string> = { ar: "ar-IQ", ku: "ckb-IQ", tr: "tr-TR", en: "en" };

/** "منذ 5 دقائق" style relative time, localised via Intl. */
export function timeAgo(iso: string, locale: string, now = Date.now()): string {
  const diff = (new Date(iso).getTime() - now) / 1000;
  const rtf = new Intl.RelativeTimeFormat(INTL[locale] ?? "en", { numeric: "auto" });
  const units: [Intl.RelativeTimeFormatUnit, number][] = [["year", 31536000], ["month", 2592000], ["day", 86400], ["hour", 3600], ["minute", 60]];
  for (const [u, s] of units) if (Math.abs(diff) >= s) return rtf.format(Math.round(diff / s), u);
  return rtf.format(Math.round(diff), "second");
}

export const formatDate = (iso: string, locale: string) =>
  new Intl.DateTimeFormat(INTL[locale] ?? "en", { dateStyle: "medium", timeZone: "Asia/Baghdad" }).format(new Date(iso));
