// Post-deploy smoke test. Usage: node scripts/smoke.mjs https://your-domain   (or http://localhost:3000)
const base = (process.argv[2] ?? "http://localhost:3000").replace(/\/$/, "");
let failed = 0;
const results = [];
const check = async (name, fn) => {
  const t0 = Date.now();
  try { const note = await fn(); results.push(["PASS", name, `${Date.now() - t0}ms`, note ?? ""]); }
  catch (e) { failed++; results.push(["FAIL", name, `${Date.now() - t0}ms`, e.message]); }
};
const get = (p, opts = {}) => fetch(base + p, { redirect: "manual", ...opts });
const ok = (c, m) => { if (!c) throw new Error(m); };

await check("health endpoint", async () => { const r = await get("/api/health"); ok(r.status === 200, `status ${r.status}`); ok((await r.json()).ok === true, "ok:false"); });
await check("home renders RTL Arabic", async () => { const r = await get("/"); const h = await r.text(); ok(r.status === 200, `status ${r.status}`); ok(/<html[^>]*lang="ar"[^>]*dir="rtl"/.test(h), "missing lang/dir"); ok(h.length > 5000, "suspiciously small page"); });
await check("search page", async () => { const r = await get("/search?q=%D9%85%D8%B7%D8%B9%D9%85"); ok(r.status === 200, `status ${r.status}`); });
await check("core public pages", async () => { for (const p of ["/where", "/offers", "/events", "/collections", "/map", "/categories", "/pricing", "/real-estate", "/cars", "/jobs", "/live/pharmacies", "/privacy", "/terms", "/content-policy", "/login", "/offline"]) { const r = await get(p); ok(r.status === 200, `${p} -> ${r.status}`); } return "16 pages"; });
await check("security headers", async () => { const r = await get("/"); for (const h of ["x-content-type-options", "x-frame-options", "referrer-policy", "permissions-policy"]) ok(r.headers.get(h), `missing ${h}`); ok(!r.headers.get("x-powered-by"), "x-powered-by leaks framework"); });
await check("HTTPS + HSTS (non-local)", async () => { if (/localhost|127\.0\.0\.1/.test(base)) return "skipped (local)"; ok(base.startsWith("https://"), "not https"); const r = await get("/"); if (!r.headers.get("strict-transport-security")) throw new Error("no HSTS header (set it at the proxy/CDN)"); });
await check("sitemap.xml", async () => { const r = await get("/sitemap.xml"); const x = await r.text(); ok(r.status === 200 && x.includes("<urlset"), "not a sitemap"); ok((x.match(/<loc>/g) ?? []).length >= 10, "too few URLs"); return `${(x.match(/<loc>/g) ?? []).length} urls`; });
await check("robots.txt hides private areas", async () => { const t = await (await get("/robots.txt")).text(); ok(/Disallow: \/admin/.test(t) && /Sitemap:/.test(t), "robots incomplete"); });
await check("PWA manifest", async () => { const r = await get("/manifest.webmanifest"); const m = await r.json(); ok(m.display === "standalone" && m.icons?.length >= 3 && m.start_url === "/", "manifest incomplete"); });
await check("service worker + icons", async () => { const s = await get("/sw.js"); ok(s.status === 200 && /javascript/.test(s.headers.get("content-type") ?? ""), "sw.js"); ok(/no-cache|no-store/.test(s.headers.get("cache-control") ?? ""), "sw.js must not be cached"); for (const p of ["/icons/icon-192.png", "/icons/icon-512.png", "/icons/maskable-512.png", "/og-default.png"]) ok((await get(p)).status === 200, p); });
await check("unknown path is a real 404", async () => { const r = await get("/definitely-not-a-page-" + Date.now()); ok(r.status === 404, `status ${r.status}`); });
await check("private routes redirect guests to login", async () => { for (const p of ["/account", "/saved", "/dashboard", "/admin", "/notifications", "/suggest"]) { const r = await get(p); const loc = r.headers.get("location") ?? ""; ok([301, 302, 303, 307, 308].includes(r.status) && loc.includes("/login"), `${p} -> ${r.status} ${loc}`); } return "6 routes"; });
await check("ad redirect rejects garbage ids", async () => { const r = await get("/ad/not-a-uuid"); ok(r.status === 307 && !(r.headers.get("location") ?? "").includes("not-a-uuid"), `status ${r.status}`); });
await check("auth callback without code does not 500", async () => { const r = await get("/auth/callback"); ok(r.status < 500, `status ${r.status}`); });
await check("open-redirect guard on login ?next=", async () => {
  // the router echoes the URL in its own state; what matters is the value handed to the login form
  const r = await get("/login?next=//evil.example"); ok(r.status === 200, `status ${r.status}`);
  const h = await r.text();
  ok(!/next\\":\\"(\/\/|https?:)/.test(h), "login form received an external next");
  ok(/next\\":\\"\/account\\"/.test(h) || !/configured\\":true/.test(h), "login form did not fall back to /account");
});

console.log(`\nSmoke test against ${base}\n`);
for (const [s, n, t, note] of results) console.log(`${s === "PASS" ? "✓" : "✗"} ${n.padEnd(46)} ${t.padStart(7)}  ${note}`);
console.log(failed ? `\n${failed} check(s) FAILED` : "\nall checks passed");
process.exit(failed ? 1 : 0);
