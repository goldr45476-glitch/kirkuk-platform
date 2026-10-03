const INTL: Record<string, string> = { ar: "ar-IQ", ku: "ckb-IQ", tr: "tr-TR", en: "en-US" };

/** "23:30:00" -> "11:30 م" (localised clock; the value is a wall-clock time, so format in UTC). */
export const formatClock = (t: string, locale: string) =>
  new Intl.DateTimeFormat(INTL[locale] ?? "en-US", { hour: "numeric", minute: "2-digit", timeZone: "UTC" }).format(new Date(`1970-01-01T${t.slice(0, 5)}:00Z`));

export const formatDateTime = (iso: string, locale: string) =>
  new Intl.DateTimeFormat(INTL[locale] ?? "en-US", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Baghdad" }).format(new Date(iso));

/** Baghdad-local day bucket of an ISO instant relative to now: 0 = today, 1 = tomorrow, n > 1 = later. */
export function dayOffset(iso: string, now = new Date()): number {
  const f = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Baghdad" }).format(d);
  return Math.round((Date.parse(f(new Date(iso))) - Date.parse(f(now))) / 86_400_000);
}

export type DayPart = "morning" | "afternoon" | "evening" | "night";
/** Greeting bucket by Baghdad hour. */
export function dayPart(now = new Date()): DayPart {
  const h = Number(new Intl.DateTimeFormat("en-GB", { hour: "2-digit", hour12: false, timeZone: "Asia/Baghdad" }).format(now));
  return h >= 5 && h < 12 ? "morning" : h >= 12 && h < 17 ? "afternoon" : h >= 17 && h < 22 ? "evening" : "night";
}
