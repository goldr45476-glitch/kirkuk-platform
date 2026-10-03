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
const city = (await q(`select id from cities where slug='kirkuk'`))[0].id;
const cat = (await q(`select id from categories where slug='restaurants'`))[0].id;

// Deterministic fixtures: one 24h family restaurant (budget 2), one always-closed, one far away.
const mk = async (slug, lat, lng, opts = {}) => {
  const b = (await q(`insert into businesses (slug,name,category_id,status,lat,lng,rating_avg,price_level) values ($1,$2,$3,'active',$4,$5,4.5,$6) returning id`, [slug, slug, cat, lat, lng, opts.price ?? 2]))[0].id;
  await q(`insert into business_hours (business_id, day_of_week, open_time, close_time, is_closed) select $1, d, $2, $3, $4 from generate_series(0,6) d`, [b, opts.open ?? "00:00", opts.close ?? "00:00", !!opts.closed]);
  return b;
};
const near = await mk("fx-near", 35.4700, 44.3900);
const closed = await mk("fx-closed", 35.4700, 44.3910, { closed: true });
const far = await mk("fx-far", 35.60, 44.60);
await q(`insert into suitability (business_id, audience, budget_band) values ($1,'family',2), ($2,'family',2), ($3,'family',2), ($1,'couple',3)`, [near, closed, far]);
await q(`insert into business_amenities values ($1,'kids')`, [near]);

const rec = async (args) => q(`select * from recommend_places(p_city => $1, ${args})`, [city]);
let r = await rec(`p_audience => 'family', p_budget => 2`);
const names = r.map((x) => x.name);
assert.ok(names.includes("fx-near") && names.includes("fx-far"), "open + family + budget match");
assert.ok(!names.includes("fx-closed"), "closed places are never recommended");
assert.equal(r[0].audience, "family"); assert.ok(Array.isArray(r[0].amenities));
r = await rec(`p_audience => 'family', p_budget => 1`);
assert.ok(!r.some((x) => x.name.startsWith("fx-")), "budget 1 excludes budget-2 places");
r = await rec(`p_audience => 'couple', p_budget => 2`); assert.ok(!r.some((x) => x.name === "fx-near"), "couple band 3 > budget 2");
r = await rec(`p_audience => 'couple', p_budget => 3`); assert.ok(r.some((x) => x.name === "fx-near"));
r = await rec(`p_audience => 'friends'`); assert.ok(!r.some((x) => x.name.startsWith("fx-")), "no suitability row for friends");
r = await rec(`p_audience => 'family', p_max_km => 5, p_lat => 35.47, p_lng => 44.39`);
assert.ok(r.some((x) => x.name === "fx-near") && !r.some((x) => x.name === "fx-far"), "distance filter");
assert.ok(r[0].distance_km < 1, "distance computed from the given origin");
r = await rec(`p_audience => 'family', p_exclude => ARRAY['${near}']::uuid[]`); assert.ok(!r.some((x) => x.name === "fx-near"), "exclude list (surprise me again)");
r = await rec(`p_audience => 'family', p_random => true`); assert.equal(r.length, 1, "surprise me returns exactly one");
r = await rec(`p_audience => null`); assert.ok(r.length > 0 && !r.some((x) => x.name === "fx-closed"));
// only food/malls are "go out" candidates
const ph = await rec(`p_audience => null, p_limit => 20`); assert.ok(!ph.some((x) => /صيدلية/.test(x.name)), "pharmacies are not leisure picks");

// ---- open now
let on = await q(`select * from get_open_now($1, null, null, 50)`, [city]);
assert.ok(on.some((x) => x.name === "fx-near") && !on.some((x) => x.name === "fx-closed"));
assert.ok(on.some((x) => x.slug === "hospital-azadi"), "24h hospital is open now");
on = await q(`select * from get_open_now($1, 35.47, 44.39, 3)`, [city]);
assert.equal(on.length, 3); assert.ok(on[0].distance_km <= on[1].distance_km && on[1].distance_km <= on[2].distance_km, "nearest first");

// ---- offers / events / new
let off = await q(`select * from get_offers_live($1)`, [city]);
assert.equal(off.length, 4); assert.ok(new Date(off[0].ends_at) <= new Date(off[1].ends_at), "ending soonest first");
await q(`insert into offers (business_id, title, starts_at, ends_at) values ($1,'منتهي', now() - interval '3 days', now() - interval '1 day')`, [near]);
await q(`insert into offers (business_id, title, starts_at, ends_at) values ($1,'قادم', now() + interval '1 day', now() + interval '2 days')`, [near]);
assert.equal((await q(`select * from get_offers_live($1)`, [city])).length, 4, "expired and future offers excluded");
assert.equal((await q(`select * from get_offers_live($1, 10, $2)`, [city, near])).length, 0, "per-business filter");
let ev = await q(`select * from get_events_upcoming($1)`, [city]);
assert.equal(ev.length, 3); assert.ok(new Date(ev[0].starts_at) <= new Date(ev[1].starts_at));
assert.equal((await q(`select * from get_events_upcoming($1, 2)`, [city])).length, 2, "days window"); assert.equal((await q(`select * from get_events_upcoming($1, 1)`, [city])).length, 0);
await q(`insert into events (title, starts_at, status) values ('معلّقة', now() + interval '1 hour', 'pending')`);
await q(`insert into events (title, starts_at, ends_at, status) values ('انتهت', now() - interval '5 hours', now() - interval '2 hours', 'published')`);
assert.equal((await q(`select * from get_events_upcoming($1)`, [city])).length, 3, "pending and past events excluded");
const nw = await q(`select * from get_new_places($1)`, [city]);
assert.equal(nw.filter((x) => !x.name.startsWith("fx-")).length, 6, "recent places only"); assert.ok(new Date(nw[0].created_at) >= new Date(nw[1].created_at));
console.log("now discovery OK");
