// Pre-deploy check: environment variables, and (when Supabase is reachable) that the database is really set up.
// Usage: node --env-file=.env.local scripts/preflight.mjs      (Node >= 20.6)   — add --strict to treat warnings as failures
import { createClient } from "@supabase/supabase-js";

const strict = process.argv.includes("--strict");
const e = process.env;
let fail = 0, warn = 0;
const ok = (m) => console.log(`  ok    ${m}`);
const bad = (m) => { fail++; console.log(`  FAIL  ${m}`); };
const meh = (m) => { warn++; console.log(`  warn  ${m}`); };

console.log("Environment");
const url = e.NEXT_PUBLIC_SUPABASE_URL ?? "";
/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(url) ? ok("NEXT_PUBLIC_SUPABASE_URL") : bad("NEXT_PUBLIC_SUPABASE_URL missing or not https://<ref>.supabase.co");
(e.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").length > 20 ? ok("NEXT_PUBLIC_SUPABASE_ANON_KEY") : bad("NEXT_PUBLIC_SUPABASE_ANON_KEY missing");
const site = e.NEXT_PUBLIC_SITE_URL ?? "";
/^https:\/\//.test(site) ? ok(`NEXT_PUBLIC_SITE_URL = ${site}`) : bad("NEXT_PUBLIC_SITE_URL must be the public https:// domain (used in sitemap, OG tags, redirects)");
e.NEXT_PUBLIC_CITY ? ok(`NEXT_PUBLIC_CITY = ${e.NEXT_PUBLIC_CITY}`) : meh("NEXT_PUBLIC_CITY not set (defaults to kirkuk)");
(e.SUPABASE_SERVICE_ROLE_KEY ?? "").length > 20 ? ok("SUPABASE_SERVICE_ROLE_KEY (server only)") : meh("SUPABASE_SERVICE_ROLE_KEY missing — Web Push dispatch will return 503");
const vapid = ["NEXT_PUBLIC_VAPID_PUBLIC_KEY", "VAPID_PRIVATE_KEY", "PUSH_DISPATCH_SECRET"].filter((k) => !e[k]);
vapid.length === 0 ? ok("Web Push variables") : meh(`Web Push disabled (missing ${vapid.join(", ")})`);
if (e.PUSH_DISPATCH_SECRET && e.PUSH_DISPATCH_SECRET.length < 24) meh("PUSH_DISPATCH_SECRET is short (use 24+ random chars)");
e.NEXT_PUBLIC_CONTACT_WHATSAPP ? ok("NEXT_PUBLIC_CONTACT_WHATSAPP") : meh("NEXT_PUBLIC_CONTACT_WHATSAPP not set — pricing page has no contact button");

if (fail === 0 || process.argv.includes("--db")) {
  console.log("Database");
  try {
    const anon = createClient(url, e.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
    const city = await anon.from("cities").select("id, slug").eq("slug", e.NEXT_PUBLIC_CITY ?? "kirkuk").maybeSingle();
    if (city.error) bad(`cities: ${city.error.message} (migrations not applied?)`); else city.data ? ok(`city row '${city.data.slug}'`) : bad("no cities row for NEXT_PUBLIC_CITY");
    for (const [t, min, hint] of [["districts", 1, "run supabase/seed.sql (reference data)"], ["categories", 1, "run supabase/seed.sql"], ["plans", 1, "run supabase/seed.sql"], ["businesses", 1, "import places at /admin/import"]]) {
      const r = await anon.from(t).select("id", { count: "exact", head: true });
      r.error ? bad(`${t}: ${r.error.message}`) : (r.count ?? 0) >= min ? ok(`${t}: ${r.count} rows`) : meh(`${t} is empty — ${hint}`);
    }
    const fn = await anon.rpc("admin_overview");
    fn.error?.message?.includes("not_allowed") ? ok("RLS/RPC guards respond (admin_overview refuses anonymous)") : bad(`admin_overview should refuse anonymous callers, got: ${fn.error?.message ?? "success"}`);
    const priv = await anon.rpc("pending_push");
    priv.error ? ok("service-only functions are not callable by clients") : bad("pending_push is callable with the anon key — re-run migration 0011 grants");
    if (e.SUPABASE_SERVICE_ROLE_KEY) {
      const svc = createClient(url, e.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
      const buckets = await svc.storage.listBuckets();
      const names = (buckets.data ?? []).map((b) => b.id);
      for (const b of ["avatars", "business-media", "post-media", "verification"]) names.includes(b) ? ok(`storage bucket '${b}'`) : meh(`storage bucket '${b}' not found (found: ${names.join(", ") || "none"})`);
      const admins = await svc.from("profiles").select("id", { count: "exact", head: true }).eq("role", "admin");
      (admins.count ?? 0) > 0 ? ok(`${admins.count} admin account(s)`) : meh("no admin yet — sign in once, then run supabase/first-admin.sql");
    }
  } catch (err) { bad(`cannot reach Supabase: ${err.message}`); }
}
console.log(`\n${fail} failure(s), ${warn} warning(s)`);
process.exit(fail || (strict && warn) ? 1 : 0);
