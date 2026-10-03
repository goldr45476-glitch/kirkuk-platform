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
await db.query(`update businesses set owner_id = $1 where slug = 'pharm-noor'`, [id(1)]); // user1 owns the pharmacy
const as = async (n, fn) => { await db.exec(`set role authenticated; select set_config('request.uid', '${n ? id(n) : ""}', false)`); try { return await fn(); } finally { await db.exec(`reset role`); } };
const q = async (sql, p) => (await db.query(sql, p)).rows;
const fails = async (fn, msg) => { let ok = false; try { await fn(); } catch { ok = true; } assert.ok(ok, msg); };
const biz = (await q(`select id from businesses where slug='pharm-noor'`))[0].id;
const stats = async () => (await q(`select rating_avg::float a, rating_count c from businesses where id=$1`, [biz]))[0];

// ---- reviews
await fails(() => as(1, () => db.query(`insert into reviews (business_id,user_id,rating) values ($1,$2,5)`, [biz, id(1)])), "owner cannot review own business");
const rv = (await as(2, () => q(`insert into reviews (business_id,user_id,rating,body,owner_reply,is_hidden) values ($1,$2,4,'جيدة','fake reply',true) returning id, owner_reply, is_hidden`, [biz, id(2)])))[0];
assert.equal(rv.owner_reply, null, "reviewer cannot insert a fake owner reply"); assert.equal(rv.is_hidden, false);
await fails(() => as(2, () => db.query(`insert into reviews (business_id,user_id,rating) values ($1,$2,5)`, [biz, id(2)])), "one review per user");
await as(3, () => db.query(`insert into reviews (business_id,user_id,rating) values ($1,$2,2)`, [biz, id(3)]));
assert.deepEqual(await stats(), { a: 3, c: 2 }, "rating aggregate");
await as(2, () => db.query(`update reviews set rating=5, owner_reply='hacked', is_hidden=true where id=$1`, [rv.id]));
const after = (await q(`select rating, owner_reply, is_hidden from reviews where id=$1`, [rv.id]))[0];
assert.deepEqual([after.rating, after.owner_reply, after.is_hidden], [5, null, false], "reviewer can change rating only");
assert.deepEqual(await stats(), { a: 3.5, c: 2 });
assert.equal((await q(`select count(*)::int c from notifications where user_id=$1 and type='review'`, [id(1)]))[0].c, 2, "owner notified of reviews");
await fails(() => as(3, () => db.query(`select reply_to_review($1,'x')`, [rv.id])), "non-owner cannot reply");
await as(1, () => db.query(`select reply_to_review($1,'شكراً لك')`, [rv.id]));
assert.equal((await q(`select owner_reply from reviews where id=$1`, [rv.id]))[0].owner_reply, "شكراً لك");
assert.equal((await q(`select count(*)::int c from notifications where user_id=$1 and type='review_reply'`, [id(2)]))[0].c, 1, "reviewer notified of reply");
await as(3, () => db.query(`delete from reviews where business_id=$1 and user_id=$2`, [biz, id(3)]));
assert.deepEqual(await stats(), { a: 5, c: 1 }, "aggregate after delete");

// ---- listings search
const s1 = async (args) => (await db.query(`select * from search_listings(${args})`)).rows;
let r = await s1(`'property'`); assert.equal(r.length, 6); assert.equal(Number(r[0].total_count), 6);
r = await s1(`'property', null, 'rent'`); assert.equal(r.length, 3, "deal filter");
r = await s1(`'property', null, null, 'house'`); assert.equal(r.length, 2, "type filter");
r = await s1(`'property', null, 'sale', null, null, 'USD', null, 100000`); assert.equal(r.length, 2, "price max in USD (house 235k excluded)");
r = await s1(`'property', null, null, null, null, null, null, null, 200`); assert.equal(r.length, 3, "min area");
r = await s1(`'property', null, null, null, null, null, null, null, null, 4`); assert.equal(r.length, 2, "min rooms");
r = await s1(`'property', null, 'sale', null, null, 'USD', null, null, null, null, null, null, 'price_asc'`); assert.ok(Number(r[0].price) <= Number(r[1].price), "price asc");
r = await s1(`'vehicle', 'كورولا'`); assert.equal(r.length, 1, "text search");
r = await s1(`'vehicle', null, null, 'car', null, null, null, null, null, null, 2017`); assert.equal(r.length, 1, "min year");
r = await s1(`'job', null, null, null, null, null, null, null, null, null, null, 'part'`); assert.equal(r.length, 1, "employment");
r = await s1(`'job'`); assert.equal(r.length, 4);

// ---- listing RLS
const lst = (await as(2, () => q(`insert into listings (user_id,kind,title,details,is_featured) values ($1,'property','شقة اختبار','{"deal":"rent","type":"apartment"}',true) returning id, is_featured`, [id(2)])))[0];
assert.equal(lst.is_featured, false, "cannot self-feature");
await fails(() => as(3, () => db.query(`insert into listings (user_id,kind,title) values ($1,'job','x1')`, [id(2)])), "cannot post as another user");
await as(3, () => db.query(`update listings set title='hijack' where id=$1`, [lst.id]));
assert.equal((await q(`select title from listings where id=$1`, [lst.id]))[0].title, "شقة اختبار", "others cannot edit");
await as(2, () => db.query(`update listings set status='sold' where id=$1`, [lst.id]));
assert.equal((await as(3, () => q(`select * from listings where id=$1`, [lst.id]))).length, 0, "sold listings hidden from others");

// ---- live status
let st = await q(`select * from get_service_status('fuel')`); assert.equal(st.length, 2); assert.ok(st.every((x) => x.status === null));
const fuel = (await q(`select id from businesses where slug='fuel-asri'`))[0].id;
await as(2, () => db.query(`insert into service_status_reports (business_id,user_id,status) values ($1,$2,'unavailable')`, [fuel, id(2)]));
await as(3, () => db.query(`insert into service_status_reports (business_id,user_id,status,queue_level,note) values ($1,$2,'queue',3,'طابور طويل')`, [fuel, id(3)]));
st = await q(`select * from get_service_status('fuel') where slug='fuel-asri'`);
assert.deepEqual([st[0].status, st[0].queue_level, Number(st[0].recent_reports)], ["queue", 3, 2], "latest report wins");
await fails(() => as(3, () => db.query(`insert into service_status_reports (business_id,user_id,status) values ($1,$2,'available')`, [fuel, id(2)])), "cannot report as another user");

// ---- pharmacy duty: owner can add own pharmacy only
await as(1, () => db.query(`insert into pharmacy_duty (business_id,duty_date) values ($1, current_date + 5)`, [biz]));
const other = (await q(`select id from businesses where slug='pharm-amal'`))[0].id;
await fails(() => as(1, () => db.query(`insert into pharmacy_duty (business_id,duty_date) values ($1, current_date + 5)`, [other])), "owner cannot add duty for others");
console.log("phase 4 OK");
