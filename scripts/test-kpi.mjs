// Makes sure every statement in docs/kpi.sql runs against the real schema + seed (values are not asserted).
import { PGlite } from "@electric-sql/pglite";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";
import { readFileSync, readdirSync } from "node:fs";
const db = new PGlite({ extensions: { pg_trgm } });
await db.exec(`create role anon; create role authenticated; create schema auth; create schema storage;
  create table auth.users (id uuid primary key default gen_random_uuid(), phone text, raw_user_meta_data jsonb default '{}');
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.uid', true), '')::uuid $$;
  create table storage.buckets (id text primary key, name text, public bool, file_size_limit int, allowed_mime_types text[]);
  create table storage.objects (id uuid default gen_random_uuid(), bucket_id text, name text);
  create function storage.foldername(n text) returns text[] language sql as $$ select string_to_array(n, '/') $$;
  create publication supabase_realtime;`);
for (const f of readdirSync("supabase/migrations").sort()) await db.exec(readFileSync(`supabase/migrations/${f}`, "utf8"));
await db.exec(readFileSync("supabase/seed.sql", "utf8"));
const biz = (await db.query(`select id from businesses limit 1`)).rows[0].id;
await db.query(`select track_event('view','business',$1)`, [biz]); await db.query(`select track_event('call','business',$1)`, [biz]);
const stmts = readFileSync("docs/kpi.sql", "utf8").split(/;\s*\n/).map((s) => s.replace(/^(\s*--.*\n)+/gm, "").trim()).filter(Boolean);
let n = 0;
for (const s of stmts) { try { await db.query(s); n++; } catch (e) { console.error("FAILED:\n" + s.slice(0, 200) + "\n→ " + e.message); process.exit(1); } }
console.log(`kpi queries OK (${n} statements)`);
