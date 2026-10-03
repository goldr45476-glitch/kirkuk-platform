import { describe, expect, it } from "vitest";
import { timeAgo } from "./time";

describe("timeAgo", () => {
  const now = Date.parse("2026-10-03T12:00:00Z");
  it("minutes", () => expect(timeAgo("2026-10-03T11:55:00Z", "en", now)).toBe("5 minutes ago"));
  it("hours", () => expect(timeAgo("2026-10-03T09:00:00Z", "en", now)).toBe("3 hours ago"));
  it("days", () => expect(timeAgo("2026-09-30T12:00:00Z", "en", now)).toBe("3 days ago"));
  it("arabic renders", () => expect(timeAgo("2026-10-03T11:55:00Z", "ar", now)).toMatch(/دقائق|دقيقة/));
});
