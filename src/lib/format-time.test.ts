import { describe, expect, it } from "vitest";
import { dayOffset, dayPart, formatClock } from "./format-time";

describe("format-time", () => {
  it("formats wall-clock times", () => {
    expect(formatClock("23:30:00", "en")).toBe("11:30 PM");
    expect(formatClock("09:05:00", "en")).toBe("9:05 AM");
  });
  it("greeting by Baghdad hour (UTC+3)", () => {
    expect(dayPart(new Date("2026-10-03T03:00:00Z"))).toBe("morning");   // 06:00
    expect(dayPart(new Date("2026-10-03T10:00:00Z"))).toBe("afternoon"); // 13:00
    expect(dayPart(new Date("2026-10-03T16:00:00Z"))).toBe("evening");   // 19:00
    expect(dayPart(new Date("2026-10-03T21:30:00Z"))).toBe("night");     // 00:30
    expect(dayPart(new Date("2026-10-03T01:00:00Z"))).toBe("night");     // 04:00
  });
  it("day offsets use Baghdad calendar days", () => {
    const now = new Date("2026-10-03T20:00:00Z"); // 23:00 Baghdad, Oct 3
    expect(dayOffset("2026-10-03T20:30:00Z", now)).toBe(0); // 23:30 Baghdad, still Oct 3
    expect(dayOffset("2026-10-03T21:30:00Z", now)).toBe(1); // 00:30 Baghdad = Oct 4
    expect(dayOffset("2026-10-05T10:00:00Z", now)).toBe(2);
  });
});
