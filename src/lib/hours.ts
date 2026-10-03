import type { BusinessHour } from "@/lib/types";

/** Display order: Iraqi week starts on Saturday. day_of_week: 0 = Sunday. */
export const WEEK_ORDER = [6, 0, 1, 2, 3, 4, 5] as const;

export const hhmm = (t: string | null) => (t ? t.slice(0, 5) : "");

export type DayState = { kind: "closed" } | { kind: "24h" } | { kind: "range"; from: string; to: string } | { kind: "unknown" };

export function dayState(h: BusinessHour | undefined): DayState {
  if (!h) return { kind: "unknown" };
  if (h.is_closed || !h.open_time || !h.close_time) return { kind: "closed" };
  if (h.open_time === h.close_time) return { kind: "24h" };
  return { kind: "range", from: hhmm(h.open_time), to: hhmm(h.close_time) };
}

/** Day-of-week (0 = Sunday) in Asia/Baghdad right now. */
export function todayBaghdad(now = new Date()): number {
  const name = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Baghdad", weekday: "short" }).format(now);
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(name);
}
