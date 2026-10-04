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

const MOD = "00000000-0000-0000-0000-0000000000bb", U1 = "00000000-0000-0000-0000-000000000001";
await db.query(`insert into auth.users (id) values ($1), ($2)`, [MOD, U1]); await db.query(`update profiles set role='moderator' where id=$1`, [MOD]);
const as = async (uid, fn) => { await db.exec(`set role authenticated; select set_config('request.uid', '${uid ?? ""}', false)`); try { return await fn(); } finally { await db.exec(`reset role`); } };
const q = async (sql, p) => (await db.query(sql, p)).rows;
const fails = async (fn, msg, re) => { let err; try { await fn(); } catch (e) { err = e; } assert.ok(err, msg); if (re) assert.match(err.message, re, msg); };
const imp = async (rows, dry = true) => (await as(MOD, () => q(`select import_businesses($1::jsonb, $2) r`, [JSON.stringify(rows), dry])))[0].r;
const before = Number((await q(`select count(*) c from businesses`))[0].c);

await fails(() => as(U1, () => db.query(`select import_businesses('[]'::jsonb)`)), "users cannot import", /not_allowed/);
await fails(() => as(MOD, () => db.query(`select import_businesses('{}'::jsonb)`)), "array required", /bad_input/);

const good = { name: "مطعم النخيل الجديد", category: "restaurants", district: "asri", phone: "07705551234", address: "قرب الجسر", lat: "35.488", lng: "44.399", open: "10:00", close: "23:00", price_level: "2" };
const rows = [
  good,
  { name: "ك", category: "restaurants" },                                              // 2 name
  { name: "مكان بقسم خاطئ", category: "nope" },                                       // 3 category
  { name: "مكان بحي خاطئ", category: "cafes", district: "atlantis" },                 // 4 district
  { name: "إحداثيات ناقصة", category: "cafes", lat: "35.4" },                          // 5 coords
  { name: "بعيد عن المدينة", category: "cafes", lat: "33.3", lng: "44.4" },            // 6 far
  { name: "ساعات خاطئة", category: "cafes", open: "9am", close: "11pm" },              // 7 hours
  { name: "سعر خاطئ", category: "cafes", price_level: "9" },                           // 8 price
  { name: "كافيه الأرجيلة والشاي", category: "cafes", phone: "07701000003" },           // 9 duplicate of seed (same name+phone)
  { ...good },                                                                         // 10 duplicate inside batch
  { name: "مخبز الفجر", category: "bakeries", phone: "0770 222 3344" },               // 11 valid, phone normalised
  { name: "مكتبة بلا هاتف", category: "shops" },                                       // 12 valid minimal
];
const dry = await imp(rows);
assert.equal(dry.total, 12); assert.equal(dry.dry_run, true); assert.equal(dry.valid, 3); assert.equal(dry.inserted, 0);
assert.deepEqual(dry.errors.map((e) => [e.row, e.code]), [[2, "name"], [3, "category"], [4, "district"], [5, "coords"], [6, "far_from_city"], [7, "hours"], [8, "price"]]);
assert.deepEqual(dry.duplicates.map((d) => d.row), [9, 10]);
assert.equal(Number((await q(`select count(*) c from businesses`))[0].c), before, "dry run writes nothing");

const real = await imp(rows, false);
assert.equal(real.inserted, 3);
assert.equal(Number((await q(`select count(*) c from businesses`))[0].c), before + 3);
const b = (await q(`select * from businesses where name='مطعم النخيل الجديد'`))[0];
assert.equal(b.status, "active"); assert.equal(b.is_verified, false); assert.equal(b.last_verified_at, null, "imports are not verified");
assert.equal(b.phone, "07705551234"); assert.equal(b.price_level, 2);
assert.equal(Number((await q(`select count(*) c from business_hours where business_id=$1`, [b.id]))[0].c), 7);
assert.equal((await q(`select phone from businesses where name='مخبز الفجر'`))[0].phone, "07702223344", "phone normalised");
assert.equal(Number((await q(`select count(*) c from business_hours where business_id=(select id from businesses where name='مكتبة بلا هاتف')`))[0].c), 0, "no hours when not provided");
const again = await imp(rows, false); assert.equal(again.inserted, 0, "re-importing the same file adds nothing");
assert.equal(again.duplicates.length, 5, "now the three imported rows are duplicates too (2 + 3)");
assert.equal(Number((await q(`select count(*) c from audit_log where action='import_businesses'`))[0].c), 2);
assert.equal((await q(`select name from search_businesses(p_q => 'النخيل الجديد') limit 1`))[0].name, "مطعم النخيل الجديد", "imported places are searchable immediately");
await fails(() => as(MOD, () => db.query(`select import_businesses($1::jsonb)`, [JSON.stringify(Array.from({ length: 1001 }, () => ({ name: "x" })))])), "row cap", /too_many_rows/);
console.log("bulk import OK");
