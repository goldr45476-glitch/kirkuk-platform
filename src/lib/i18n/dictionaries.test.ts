import { describe, expect, it } from "vitest";
import { dictionaries } from "./dictionaries";

type Json = string | string[] | { [k: string]: Json };
const flatten = (o: Json, prefix = ""): [string, string][] =>
  typeof o === "string" ? [[prefix, o]] : Array.isArray(o) ? o.flatMap((x, i) => flatten(x, `${prefix}[${i}]`)) : Object.entries(o).flatMap(([k, v]) => flatten(v, prefix ? `${prefix}.${k}` : k));

const ar = new Map(flatten(dictionaries.ar as unknown as Json));
const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(",");

describe("translations", () => {
  for (const loc of ["ku", "tr", "en"] as const) {
    const d = new Map(flatten(dictionaries[loc] as unknown as Json));
    it(`${loc}: same keys as Arabic`, () => {
      expect([...d.keys()].sort()).toEqual([...ar.keys()].sort());
    });
    it(`${loc}: no empty strings`, () => {
      expect([...d.entries()].filter(([, v]) => v.trim() === "").map(([k]) => k)).toEqual([]);
    });
    it(`${loc}: {placeholders} preserved`, () => {
      const bad = [...ar.entries()].filter(([k, v]) => placeholders(v) !== placeholders(d.get(k) ?? "")).map(([k]) => k);
      expect(bad).toEqual([]);
    });
  }
  it("Arabic placeholders are all known", () => {
    const known = new Set(["city", "time", "when", "date", "n", "km", "rating", "actor", "business", "name", "word"]);
    const unknown = [...ar.values()].flatMap((v) => [...v.matchAll(/\{(\w+)\}/g)].map((m) => m[1])).filter((p) => !known.has(p));
    expect(unknown).toEqual([]);
  });
});
