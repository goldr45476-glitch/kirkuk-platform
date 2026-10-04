import { describe, expect, it } from "vitest";
import { spreadFeatured } from "./spread";

const mk = (n: number, feat: number[]) => Array.from({ length: n }, (_, i) => ({ id: i, is_featured: feat.includes(i) }));

describe("spreadFeatured", () => {
  it("never puts two featured rows inside the same window of 5", () => {
    const out = spreadFeatured([...mk(3, [0, 1, 2]).map((x) => ({ ...x, is_featured: true })), ...Array.from({ length: 12 }, (_, i) => ({ id: 10 + i, is_featured: false }))]);
    const pos = out.map((x, i) => (x.is_featured ? i : -1)).filter((i) => i >= 0);
    expect(pos).toEqual([0, 5, 10]);
  });
  it("keeps order within groups and all rows", () => {
    const rows = mk(10, [4, 7]); const out = spreadFeatured(rows);
    expect(out).toHaveLength(10); expect(new Set(out.map((x) => x.id)).size).toBe(10);
    expect(out.filter((x) => x.is_featured).map((x) => x.id)).toEqual([4, 7]);
    expect(out.filter((x) => !x.is_featured).map((x) => x.id)).toEqual([0, 1, 2, 3, 5, 6, 8, 9]);
  });
  it("is a no-op without featured or without regular rows", () => {
    const a = mk(4, []); expect(spreadFeatured(a)).toBe(a);
    const b = mk(2, [0, 1]); expect(spreadFeatured(b)).toBe(b);
  });
  it("appends leftover featured rows at the end when regular rows run out", () => {
    const out = spreadFeatured([...mk(1, []).map((x) => ({ ...x, id: 100 })), ...mk(3, [0, 1, 2]).map((x) => ({ ...x, is_featured: true }))]);
    expect(out.map((x) => x.is_featured)).toEqual([true, false, true, true]);
  });
});
