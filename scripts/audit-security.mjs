// Static security audit of the schema, run on in-memory Postgres after all migrations.
// Fails (exit 1) on: tables without RLS, RLS tables without any policy, SECURITY DEFINER functions without a pinned
// search_path, internal helpers callable by anon/authenticated, and writable policies with no check clause.
// Usage: node scripts/audit-security.mjs
import { PGlite } from "@electric-sql/pglite";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";
import { readFileSync, readdirSync } from "node:fs";

const db = new PGlite({ extensions: { pg_trgm } });
await db.exec(`
  create role anon; create role authenticated; create schema auth; create schema storage;
  create table auth.users (id uuid primary key default gen_random_uuid(), phone text, raw_user_meta_data jsonb default '{}');
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.uid', true), '')::uuid $$;
  create table storage.buckets (id text primary key, name text, public bool, file_size_limit int, allowed_mime_types text[]);
  create table storage.objects (id uuid default gen_random_uuid(), bucket_id text, name text);
  create function storage.foldername(n text) returns text[] language sql as $$ select string_to_array(n, '/') $$;
  create publication supabase_realtime;
  -- Supabase default privileges: new functions/tables in public are usable by clients unless the migration revokes
  alter default privileges in schema public grant execute on functions to anon, authenticated;`);
for (const f of readdirSync("supabase/migrations").sort()) await db.exec(readFileSync(`supabase/migrations/${f}`, "utf8"));

if (process.env.AUDIT_EXTRA_SQL) await db.exec(process.env.AUDIT_EXTRA_SQL);   // self-test hook: inject deliberate violations
const q = async (sql) => (await db.query(sql)).rows;
const problems = [];
const warn = [];

// 1) every public table has RLS enabled
for (const t of await q(`select relname from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' and not c.relrowsecurity order by 1`))
  problems.push(`table public.${t.relname} has RLS DISABLED`);

// 2) RLS tables must have at least one policy (otherwise they're silently unreadable — usually a mistake) unless intentionally service-only
const SERVICE_ONLY = new Set(["push_subscriptions_unused"]);
const noPol = await q(`select c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' and c.relrowsecurity and not exists (select 1 from pg_policy p where p.polrelid=c.oid) order by 1`);
for (const t of noPol) if (!SERVICE_ONLY.has(t.relname)) problems.push(`table public.${t.relname} has RLS but NO policies`);

// 3) SECURITY DEFINER functions must pin search_path
for (const f of await q(`select p.proname, pg_get_function_identity_arguments(p.oid) args, p.proconfig from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.prosecdef order by 1`))
  if (!(f.proconfig ?? []).some((c) => c.startsWith("search_path="))) problems.push(`SECURITY DEFINER ${f.proname}(${f.args}) has no pinned search_path`);

// 4) internal helpers must NOT be callable by clients
for (const name of ["audit", "_notify_system", "queue_expiring_offer_alerts", "pending_push", "mark_pushed"]) {
  const r = await q(`select has_function_privilege('authenticated', p.oid, 'execute') a, has_function_privilege('anon', p.oid, 'execute') b from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='${name}'`);
  for (const x of r) if (x.a || x.b) problems.push(`internal helper ${name}() is executable by clients`);
}

// 5) staff/admin RPCs must check the role in their body
const GUARDED = ["approve_submission", "reject_submission", "review_claim", "moderate_report", "moderate_event", "set_business_state", "admin_set_user", "staff_add_business", "admin_overview", "activate_subscription", "cancel_subscription", "import_businesses", "mark_verified", "review_verification"];
for (const name of GUARDED) {
  const r = await q(`select pg_get_functiondef(p.oid) d from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='${name}'`);
  if (r.length === 0) problems.push(`expected function ${name} is missing`);
  for (const x of r) if (!/is_staff\(\)|is_admin\(\)/.test(x.d)) problems.push(`${name}() does not check is_staff()/is_admin()`);
}

// 6) policies that allow writes must constrain rows (USING / WITH CHECK present) — "true" check on write is a smell
for (const p of await q(`select tablename, policyname, cmd, qual, with_check from pg_policies where schemaname='public' and cmd in ('INSERT','UPDATE','DELETE','ALL') order by 1,2`)) {
  const body = `${p.qual ?? ""} ${p.with_check ?? ""}`.trim();
  if (p.cmd === "INSERT" && (!p.with_check || p.with_check === "true")) problems.push(`policy ${p.tablename}.${p.policyname}: INSERT without a real WITH CHECK`);
  if (["UPDATE", "DELETE", "ALL"].includes(p.cmd) && (!p.qual || p.qual === "true")) problems.push(`policy ${p.tablename}.${p.policyname}: ${p.cmd} with USING (true)`);
}

// 7) anon must not be able to write anywhere through RLS (policies granting writes to anon-only expressions)
for (const t of await q(`select tablename, policyname from pg_policies where schemaname='public' and cmd in ('INSERT','UPDATE','DELETE','ALL') and (qual ~ 'auth.uid\\(\\) is null' or with_check ~ 'auth.uid\\(\\) is null')`))
  problems.push(`policy ${t.tablename}.${t.policyname} allows writes for logged-out users`);

// 8) informational: counts
const tables = (await q(`select count(*)::int c from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r'`))[0].c;
const policies = (await q(`select count(*)::int c from pg_policies where schemaname='public'`))[0].c;
const definers = (await q(`select count(*)::int c from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.prosecdef`))[0].c;

console.log(`audited: ${tables} tables, ${policies} policies, ${definers} SECURITY DEFINER functions`);
for (const w of warn) console.log("WARN", w);
if (problems.length) { console.error("\nSECURITY AUDIT FAILED:\n - " + problems.join("\n - ")); process.exit(1); }
console.log("security audit OK");
