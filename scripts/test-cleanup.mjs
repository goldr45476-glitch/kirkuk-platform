// RLS + social flow checks, executed as the `authenticated` role. Run: node scripts/test-social.mjs
import { PGlite } from "@electric-sql/pglite";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";
import { readFileSync, readdirSync } from "node:fs";
import assert from "node:assert/strict";

const db = new PGlite({ extensions: { pg_trgm } });
await db.exec(`
  create role anon; create role authenticated;
  create schema auth; create schema storage;
  create table auth.users (id uuid primary key default gen_random_uuid(), phone text, raw_user_meta_data jsonb default '{}');
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.uid', true), '')::uuid $$;
  create table storage.buckets (id text primary key, name text, public bool, file_size_limit int, allowed_mime_types text[]);
  create table storage.objects (id uuid default gen_random_uuid(), bucket_id text, name text);
  create function storage.foldername(n text) returns text[] language sql as $$ select string_to_array(n, '/') $$;
  create publication supabase_realtime;`);
for (const f of readdirSync("supabase/migrations").sort()) await db.exec(readFileSync(`supabase/migrations/${f}`, "utf8"));
await db.exec(readFileSync("supabase/seed.sql", "utf8"));
await db.exec(`grant usage on schema public, auth to anon, authenticated;
  grant all on all tables in schema public to anon, authenticated; grant all on all sequences in schema public to anon, authenticated;
  grant execute on all functions in schema public to anon, authenticated; grant execute on function auth.uid() to anon, authenticated;`);

const q = async (sql, p) => (await db.query(sql, p)).rows;
const count = async (t, w = "true") => Number((await q(`select count(*) c from ${t} where ${w}`))[0].c);
const cleanup = readFileSync("supabase/cleanup-demo.sql", "utf8");

// a REAL business, a real user and real content that must survive
await db.query(`insert into auth.users (id, phone, raw_user_meta_data) values ('00000000-0000-0000-0000-000000000001','+9647700000001','{"full_name":"Real"}')`);
const cat = (await q(`select id from categories where slug='cafes'`))[0].id;
const realBiz = (await q(`insert into businesses (slug,name,category_id,status,owner_id) values ('real-cafe','مقهى حقيقي',$1,'active','00000000-0000-0000-0000-000000000001') returning id`, [cat]))[0].id;
await db.query(`insert into reviews (business_id, user_id, rating) values ($1,'00000000-0000-0000-0000-000000000001',5)`, [realBiz]);
await db.query(`insert into listings (user_id, kind, title) values ('00000000-0000-0000-0000-000000000001','job','إعلان حقيقي')`);
await db.query(`insert into events (title, starts_at, status) values ('فعالية حقيقية', now() + interval '3 days', 'published')`);

assert.ok((await count("businesses")) >= 35 && (await count("collections")) >= 5 && (await count("listings")) >= 15);

// refuses without the confirmation flag
let refused = false; try { await db.exec(cleanup); } catch (e) { refused = /Refusing to run/.test(e.message); }
assert.ok(refused, "refuses to run without app.confirm_cleanup");
assert.ok((await count("businesses")) >= 35, "nothing deleted when refused");

await db.exec(`set app.confirm_cleanup = 'yes'`);
await db.exec(cleanup);
assert.equal(await count("businesses"), 1, "only the real business is left");
assert.equal(await count("businesses", "slug='real-cafe'"), 1);
assert.equal(await count("collections"), 0); assert.equal(await count("ads"), 0); assert.equal(await count("offers"), 0);
assert.equal(await count("business_hours"), 0); assert.equal(await count("products_services"), 0); assert.equal(await count("pharmacy_duty"), 0);
assert.equal(await count("events"), 1, "demo events removed, real event kept");
assert.equal(await count("listings"), 1, "demo listings removed (via demo users), real listing kept");
assert.equal(await count("reviews"), 1, "demo reviews removed, real review kept");
assert.equal(await count("auth.users", "id::text like '00000000-0000-0000-0000-0000000000d%'"), 0, "demo users removed");
assert.equal(await count("auth.users", "id = '00000000-0000-0000-0000-000000000001'"), 1, "real user kept");
assert.equal((await q(`select rating_count from businesses where id=$1`, [realBiz]))[0].rating_count, 1, "real business keeps its rating");
assert.ok((await count("categories")) >= 40 && (await count("districts")) === 14 && (await count("plans")) === 3 && (await count("amenities")) >= 10 && (await count("cities")) === 1, "reference data kept");
await db.exec(cleanup);   // idempotent
assert.equal(await count("businesses"), 1);
console.log("cleanup OK");
