import { describe, expect, it } from "vitest";
import { dayState, todayBaghdad } from "./hours";

const h = (o: string | null, c: string | null, closed = false) => ({ day_of_week: 0, open_time: o, close_time: c, is_closed: closed });

describe("hours", () => {
  it("range", () => expect(dayState(h("09:00:00", "17:30:00"))).toEqual({ kind: "range", from: "09:00", to: "17:30" }));
  it("24h", () => expect(dayState(h("00:00:00", "00:00:00"))).toEqual({ kind: "24h" }));
  it("closed", () => expect(dayState(h(null, null, true))).toEqual({ kind: "closed" }));
  it("unknown", () => expect(dayState(undefined)).toEqual({ kind: "unknown" }));
  it("Baghdad is UTC+3", () => {
    // Fri 22:00 UTC is already Saturday 01:00 in Baghdad
    expect(todayBaghdad(new Date("2026-10-02T22:00:00Z"))).toBe(6);
  });
});
