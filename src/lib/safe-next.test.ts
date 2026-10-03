import { describe, expect, it } from "vitest";
import { safeNext } from "./safe-next";

describe("safeNext", () => {
  it("keeps relative paths", () => expect(safeNext("/account?x=1")).toBe("/account?x=1"));
  it.each(["//evil.com", "https://evil.com", "/\\evil.com", "", null, undefined])("rejects %s", (v) =>
    expect(safeNext(v)).toBe("/"),
  );
});
