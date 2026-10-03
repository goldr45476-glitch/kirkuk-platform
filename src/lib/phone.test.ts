import { describe, expect, it } from "vitest";
import { normalizeIraqiPhone } from "./phone";

describe("normalizeIraqiPhone", () => {
  it.each([
    ["07701234567", "+9647701234567"],
    ["7701234567", "+9647701234567"],
    ["+964 770 123 4567", "+9647701234567"],
    ["009647701234567", "+9647701234567"],
    ["٠٧٧٠١٢٣٤٥٦٧", "+9647701234567"],
  ])("%s -> %s", (i, o) => expect(normalizeIraqiPhone(i)).toBe(o));

  it.each(["", "0770123", "05701234567", "abc", "077012345678"])("rejects %s", (i) =>
    expect(normalizeIraqiPhone(i)).toBeNull(),
  );
});
