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

const id = (n) => `00000000-0000-0000-0000-00000000000${n}`;
for (const n of [1, 2, 3]) await db.query(`insert into auth.users (id, phone, raw_user_meta_data) values ($1, $2, $3)`, [id(n), `+96477000000${n}`, JSON.stringify({ full_name: `User ${n}` })]);
await db.query(`insert into profiles (id, role) values ('00000000-0000-0000-0000-0000000000aa','admin') on conflict do nothing`).catch(() => {});
await db.query(`insert into auth.users (id) values ('00000000-0000-0000-0000-0000000000aa') on conflict do nothing`);
await db.query(`update profiles set role='admin' where id='00000000-0000-0000-0000-0000000000aa'`);
await db.query(`update businesses set owner_id = $1 where slug = 'cafe-asri'`, [id(1)]);
const as = async (n, fn) => { await db.exec(`set role authenticated; select set_config('request.uid', '${n === "admin" ? "00000000-0000-0000-0000-0000000000aa" : n ? id(n) : ""}', false)`); try { return await fn(); } finally { await db.exec(`reset role`); } };
const q = async (sql, p) => (await db.query(sql, p)).rows;
const fails = async (fn, msg) => { let ok = false; try { await fn(); } catch { ok = true; } assert.ok(ok, msg); };
const biz = (await q(`select id from businesses where slug='cafe-asri'`))[0].id;
const open = async (at, b = biz) => (await q(`select is_open_now($1, $2::timestamptz) o`, [b, at]))[0].o;

// ---- cities
const kirkuk = (await q(`select id, timezone from cities where slug='kirkuk'`))[0];
assert.equal(kirkuk.timezone, "Asia/Baghdad");
assert.equal((await q(`select count(*)::int c from businesses where city_id <> $1`, [kirkuk.id]))[0].c, 0, "all content defaults to Kirkuk");
await q(`insert into cities (slug, name, center_lat, center_lng, timezone) values ('erbil','{"ar":"أربيل"}',36.19,44.01,'Asia/Baghdad')`);
const erbil = (await q(`select id from cities where slug='erbil'`))[0].id;
assert.equal((await q(`select count(*)::int c from search_businesses(p_city => $1)`, [erbil]))[0].c, 0, "other city is empty");
assert.ok((await q(`select count(*)::int c from search_businesses(p_city => $1, p_limit => 100)`, [kirkuk.id]))[0].c >= 30, "kirkuk city search");

// ---- open now (cafe-asri: 08:00-00:00 every day; Baghdad = UTC+3)
assert.equal(await open("2026-10-03T08:00:00Z"), true, "11:00 Baghdad open");          // 11:00 local
assert.equal(await open("2026-10-03T20:30:00Z"), true, "23:30 Baghdad open");
assert.equal(await open("2026-10-03T22:30:00Z"), false, "01:30 Baghdad: closed at 00:00");
assert.equal(await open("2026-10-04T03:00:00Z"), false, "06:00 Baghdad closed");

// overnight venue 18:00-03:00 and unknown-hours venue
const night = (await q(`insert into businesses (slug,name,category_id,status) values ('night-test','ليلي',(select id from categories where slug='cafes'),'active') returning id`))[0].id;
await q(`insert into business_hours (business_id, day_of_week, open_time, close_time) select $1, d, '18:00', '03:00' from generate_series(0,6) d`, [night]);
assert.equal(await open("2026-10-03T22:30:00Z", night), true, "01:30 local still open (spill from yesterday)");
assert.equal(await open("2026-10-04T01:00:00Z", night), false, "04:00 local closed");
assert.equal(await open("2026-10-03T16:00:00Z", night), true, "19:00 local open");
const nohours = (await q(`insert into businesses (slug,name,category_id,status) values ('nohours-test','بلا ساعات',(select id from categories where slug='cafes'),'active') returning id`))[0].id;
assert.equal(await open("2026-10-03T08:00:00Z", nohours), null, "no hours -> unknown, not closed");

// special hours win over regular
await q(`insert into special_hours (business_id, date_from, date_to, label, is_closed) values ($1,'2026-10-03','2026-10-03','عيد',true)`, [biz]);
assert.equal(await open("2026-10-03T08:00:00Z"), false, "special closed day");
assert.equal(await open("2026-10-04T08:00:00Z"), true, "next day normal");
await q(`insert into special_hours (business_id, date_from, date_to, open_time, close_time) values ($1,'2026-10-10','2026-10-12','20:00','23:00')`, [biz]);
assert.equal(await open("2026-10-10T08:00:00Z"), false, "11:00 local before special opening");
assert.equal(await open("2026-10-10T18:00:00Z"), true, "21:00 local inside special range");
// open-now filter excludes unknown
assert.equal((await q(`select count(*)::int c from search_businesses(p_q => 'بلا ساعات', p_open_now => true)`))[0].c, 0);

// ---- verification trust
await as(1, () => db.query(`update businesses set last_verified_at = now(), verified_by = $1 where id = $2`, [id(1), biz]));
const before = (await q(`select last_verified_at from businesses where id=$1`, [biz]))[0].last_verified_at;
assert.ok(new Date(before) < new Date(Date.now() - 86400e3), "owner cannot change last_verified_at");
await fails(() => as(1, () => db.query(`select mark_verified($1)`, [biz])), "owner cannot mark verified");
await as("admin", () => db.query(`select mark_verified($1)`, [biz]));
assert.ok(new Date((await q(`select last_verified_at from businesses where id=$1`, [biz]))[0].last_verified_at) > new Date(Date.now() - 60e3), "staff can mark verified");
assert.equal((await q(`select count(*)::int c from audit_log where action='mark_verified'`))[0].c, 1);

// ---- offers: visible only while live; owners only for own business; auto-expire
const live = (await q(`select count(*)::int c from offers`))[0].c; assert.equal(live, 4);
await q(`insert into offers (business_id, title, starts_at, ends_at) values ($1,'منتهي', now() - interval '3 days', now() - interval '1 day')`, [biz]);
assert.equal((await as(3, () => q(`select * from offers`))).length, 4, "expired offers hidden from public");
assert.equal((await as(1, () => q(`select * from offers`))).length, 5, "owner sees own expired offer");
await as(1, () => db.query(`insert into offers (business_id, title, ends_at) values ($1,'عرض جديد', now() + interval '1 day')`, [biz]));
await fails(() => as(3, () => db.query(`insert into offers (business_id, title, ends_at) values ($1,'مزيف', now() + interval '1 day')`, [biz])), "non-owner cannot add offer");
assert.equal((await q(`select city_id from offers where title='عرض جديد'`))[0].city_id, kirkuk.id, "offer city derived from business");

// ---- events: user submissions go to pending
const ev = (await as(2, () => q(`insert into events (title, starts_at, status) values ('فعالية المستخدم', now() + interval '1 day', 'published') returning id, status`)))[0];
assert.equal(ev.status, "pending", "user events are pending");
assert.equal((await as(3, () => q(`select * from events where id=$1`, [ev.id]))).length, 0, "pending hidden from others");
assert.equal((await as(3, () => q(`select * from events`))).length, 3, "published seed events visible");
await as(2, () => db.query(`update events set status='published' where id=$1`, [ev.id]));
assert.equal((await q(`select status from events where id=$1`, [ev.id]))[0].status, "pending", "creator cannot self-publish");
await as("admin", () => db.query(`update events set status='published' where id=$1`, [ev.id]));
assert.equal((await as(3, () => q(`select * from events`))).length, 4, "staff-published visible");

// ---- submissions + claims
await as(2, () => db.query(`insert into submissions (user_id, type, payload) values ($1,'new_place','{"name":"مقهى جديد"}')`, [id(2)]));
assert.equal((await as(3, () => q(`select * from submissions`))).length, 0, "submissions private");
await as(2, () => db.query(`update submissions set status='approved'`));
assert.equal((await q(`select status from submissions`))[0].status, "pending", "user cannot approve own submission");
await as(3, () => db.query(`insert into claims (business_id, user_id, phone) values ($1,$2,'07701234567')`, [biz, id(3)]));
const claim = (await q(`select id from claims limit 1`))[0].id;
await fails(() => as(3, () => db.query(`select review_claim($1, true)`, [claim])), "user cannot approve own claim");
await as("admin", () => db.query(`select review_claim($1, true)`, [claim]));
assert.equal((await q(`select owner_id from businesses where id=$1`, [biz]))[0].owner_id, id(3), "claim transfers ownership");
assert.equal((await q(`select role from profiles where id=$1`, [id(3)]))[0].role, "owner");

// ---- analytics
await as(null, () => db.query(`select track_event('call','business',$1)`, [biz]));
await as(2, () => db.query(`select track_event('directions','business',$1)`, [biz]));
await as(2, () => db.query(`select track_event('hack','business',$1)`, [biz]));
assert.equal((await as(3, () => q(`select * from analytics_events`))).length, 2, "owner (3 now) sees own business events");
assert.equal((await as(2, () => q(`select * from analytics_events`))).length, 0, "others see none");
assert.equal((await q(`select call_clicks from businesses where id=$1`, [biz]))[0].call_clicks, 1);

// ---- amenities
assert.ok((await q(`select count(*)::int c from amenities`))[0].c >= 10);
assert.equal((await q(`select count(*)::int c from business_amenities where amenity_key='wifi'`))[0].c, 2);
console.log("city foundation OK");
