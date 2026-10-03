// Dry-runs the SQL migrations + seed on an in-memory Postgres (PGlite) with
// stubs for Supabase's auth/storage schemas. Usage: node scripts/check-migration.mjs
import { PGlite } from "@electric-sql/pglite";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";
import { readFileSync, readdirSync } from "node:fs";

const db = new PGlite({ extensions: { pg_trgm } });
await db.exec(`
  create schema auth; create schema storage;
  create table auth.users (id uuid primary key default gen_random_uuid(), phone text, raw_user_meta_data jsonb default '{}');
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.uid', true), '')::uuid $$;
  create table storage.buckets (id text primary key, name text, public bool, file_size_limit int, allowed_mime_types text[]);
  create table storage.objects (id uuid default gen_random_uuid(), bucket_id text, name text);
  create function storage.foldername(n text) returns text[] language sql as $$ select string_to_array(n, '/') $$;
  create publication supabase_realtime;
  create role anon; create role authenticated;
`);
for (const f of readdirSync("supabase/migrations").sort()) {
  await db.exec(readFileSync(`supabase/migrations/${f}`, "utf8"));
  console.log("ok", f);
}
try { await db.exec(readFileSync("supabase/seed.sql", "utf8")); console.log("ok seed"); } catch (e) { if (!/ENOENT/.test(e.message)) throw e; }
console.log((await db.query("select ar_normalize('مُحَمَّد أحمد إبراهيم مدرسة') as n")).rows[0]);
