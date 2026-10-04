// Writes docs/translations-review.csv (key, ar, ku, tr, en) for native-speaker review (Kurdish / Turkmen).
// Usage: node scripts/export-translations.mjs   (needs Node >= 22.18, which strips TypeScript types natively)
import { mkdirSync, writeFileSync } from "node:fs";
const { dictionaries } = await import("../src/lib/i18n/dictionaries.ts");
const flat = (o, p = "") => (typeof o === "string" ? [[p, o]] : Array.isArray(o) ? o.flatMap((x, i) => flat(x, `${p}[${i}]`)) : Object.entries(o).flatMap(([k, v]) => flat(v, p ? `${p}.${k}` : k)));
const maps = Object.fromEntries(["ar", "ku", "tr", "en"].map((l) => [l, new Map(flat(dictionaries[l]))]));
const esc = (s) => `"${String(s ?? "").replace(/"/g, '""')}"`;
const lines = [["key", "ar", "ku_review", "tr_review", "en"].join(",")];
for (const key of maps.ar.keys()) lines.push([key, maps.ar.get(key), maps.ku.get(key), maps.tr.get(key), maps.en.get(key)].map(esc).join(","));
mkdirSync("docs", { recursive: true });
writeFileSync("docs/translations-review.csv", "﻿" + lines.join("\n") + "\n");
console.log(`wrote docs/translations-review.csv (${lines.length - 1} strings)`);
