// Sanity checks for search_businesses against the seed. Run: node scripts/test-search.mjs
import { PGlite } from "@electric-sql/pglite";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";
import { readFileSync, readdirSync } from "node:fs";
import assert from "node:assert/strict";

const db = new PGlite({ extensions: { pg_trgm } });
await db.exec(`
  create schema auth; create schema storage;
  create table auth.users (id uuid primary key default gen_random_uuid(), phone text, raw_user_meta_data jsonb default '{}');
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.uid', true), '')::uuid $$;
  create table storage.buckets (id text primary key, name text, public bool, file_size_limit int, allowed_mime_types text[]);
  create table storage.objects (id uuid default gen_random_uuid(), bucket_id text, name text);
  create function storage.foldername(n text) returns text[] language sql as $$ select string_to_array(n, '/') $$;
  create publication supabase_realtime; create role anon; create role authenticated;`);
for (const f of readdirSync("supabase/migrations").sort()) await db.exec(readFileSync(`supabase/migrations/${f}`, "utf8"));
await db.exec(readFileSync("supabase/seed.sql", "utf8"));

const s = async (args) => (await db.query(`select * from search_businesses(${args})`)).rows;
const names = (r) => r.map((x) => x.name);

let r = await s(`'مطعم القلعه'`);                     assert.ok(names(r)[0].includes("القلعة"), "ta marbuta tolerant");
r = await s(`'مُطْعَم'`);                              assert.ok(r.length >= 2, "tashkeel tolerant");
r = await s(`'صيدليه الامل'`);                         assert.equal(r[0].name, "صيدلية الأمل", "alef/ha variants");
r = await s(`'صيدلية الاملل'`);                        assert.equal(r[0].name, "صيدلية الأمل", "typo tolerant");
r = await s(`null, 'pharmacies'`);                     assert.equal(r.length, 4, "category");
r = await s(`null, 'health'`);                         assert.ok(r.length === 4, "parent category includes children");
r = await s(`null, null, (select id from districts where slug='tisin')`); assert.ok(r.length >= 3, "district");
r = await s(`null, null, null, 0, false, true`);       assert.ok(r.every((x) => x.is_verified), "verified");
r = await s(`null, 'pharmacies', null, 0, false, false, 35.4660, 44.3930, 'nearest'`);
assert.ok(r[0].distance_km <= r[1].distance_km, "nearest ordering");
r = await s(`null, null, null, 0, false, false, null, null, 'relevance', 5`);
assert.ok(r[0].is_featured && Number(r[0].total_count) >= 34, "featured first + total_count");
const open24 = await s(`'مستشفى', null, null, 0, true`); assert.ok(open24.length >= 1 && open24.some((x) => x.name.includes("مستشفى")), "24h hospital is always open now"); assert.ok(open24.every((x) => x.is_open === true), "open-now filter only returns open places");
console.log("search OK");
