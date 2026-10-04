// Accessibility audit (axe-core, WCAG 2 A/AA + best practices) of the main public pages, light + dark, mobile viewport.
// Needs a running app with data and Playwright's core + a Chromium binary:
//   PLAYWRIGHT_CORE=/path/to/playwright-core CHROME=/path/to/chrome node scripts/a11y.mjs http://localhost:3000
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_CORE ?? "playwright-core");
const axe = readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");
const base = (process.argv[2] ?? "http://localhost:3000").replace(/\/$/, "");
const pages = ["/", "/where", "/offers", "/events", "/search?q=مطعم", "/map", "/collections", "/pricing", "/login", "/categories", "/real-estate", "/cars", "/jobs", "/live/pharmacies", "/privacy", "/offline"];
const b = await chromium.launch({ executablePath: process.env.CHROME });
let bad = 0;
for (const scheme of ["light", "dark"]) {
  const c = await b.newContext({ viewport: { width: 390, height: 844 }, colorScheme: scheme });
  for (const path of pages) {
    const p = await c.newPage();
    await p.goto(base + path, { waitUntil: "networkidle" }).catch(() => {});
    await p.evaluate(axe);
    const r = await p.evaluate(() => axe.run({ runOnly: ["wcag2a", "wcag2aa", "best-practice"] }));
    for (const v of r.violations) { bad++; console.log(`${scheme} ${path}: ${v.id} [${v.impact}] ${v.help}\n   ${v.nodes.slice(0, 2).map((n) => n.target.join(" ")).join("\n   ")}`); }
    await p.close();
  }
}
await b.close();
console.log(bad ? `${bad} violation(s)` : "a11y OK (0 violations)");
process.exit(bad ? 1 : 0);
