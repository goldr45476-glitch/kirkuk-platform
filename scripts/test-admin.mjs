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
const ADMIN = "00000000-0000-0000-0000-0000000000aa", MOD = "00000000-0000-0000-0000-0000000000bb";
for (const n of [1, 2, 3]) await db.query(`insert into auth.users (id, phone, raw_user_meta_data) values ($1, $2, $3)`, [id(n), `+96477000000${n}`, JSON.stringify({ full_name: `User ${n}` })]);
for (const u of [ADMIN, MOD]) await db.query(`insert into auth.users (id) values ($1)`, [u]);
await db.query(`update profiles set role='admin' where id=$1`, [ADMIN]);
await db.query(`update profiles set role='moderator' where id=$1`, [MOD]);
const as = async (n, fn) => { const uid = n === "admin" ? ADMIN : n === "mod" ? MOD : n ? id(n) : ""; await db.exec(`set role authenticated; select set_config('request.uid', '${uid}', false)`); try { return await fn(); } finally { await db.exec(`reset role`); } };
const q = async (sql, p) => (await db.query(sql, p)).rows;
const fails = async (fn, msg) => { let ok = false; try { await fn(); } catch { ok = true; } assert.ok(ok, msg); };
const cat = (await q(`select id from categories where slug='cafes'`))[0].id;
const dist = (await q(`select id from districts where slug='asri'`))[0].id;
const notifs = (u) => q(`select data from notifications where user_id=$1 and type='system' order by created_at`, [u]).then((r) => r.map((x) => x.data.event));

// ---- submissions: new place
const pl = { name: "Cafe Nova", category_id: cat, district_id: dist, lat: 35.47, lng: 44.39, phone: "07701112222", is_owner: true };
const sid = (await as(1, () => q(`insert into submissions (user_id, type, payload) values ($1,'new_place',$2) returning id`, [id(1), pl])))[0].id;
await fails(() => as(1, () => db.query(`select approve_submission($1)`, [sid])), "user cannot approve");
await fails(() => as(1, () => db.query(`select staff_add_business('{"name":"x","category_id":1}')`)), "user cannot staff-add");
const bid = (await as("mod", () => q(`select approve_submission($1) b`, [sid])))[0].b;
let b = (await q(`select slug, status, owner_id, last_verified_at, city_id from businesses where id=$1`, [bid]))[0];
assert.equal(b.status, "active"); assert.equal(b.owner_id, id(1), "submitter marked as owner becomes owner"); assert.equal(b.last_verified_at, null, "approved submission is not yet 'verified'");
assert.match(b.slug, /^cafe-nova(-[0-9a-f]{4})?$/);
assert.equal((await q(`select role from profiles where id=$1`, [id(1)]))[0].role, "owner");
assert.deepEqual(await notifs(id(1)), ["submission_approved"]);
await fails(() => as("mod", () => db.query(`select approve_submission($1)`, [sid])), "cannot approve twice");
// arabic-only name still gets a slug
const sid2 = (await as(2, () => q(`insert into submissions (user_id, type, payload) values ($1,'new_place',$2) returning id`, [id(2), { name: "مقهى الجديد", category_id: cat }])))[0].id;
const b2 = (await as("mod", () => q(`select approve_submission($1) b`, [sid2])))[0].b;
assert.match((await q(`select slug from businesses where id=$1`, [b2]))[0].slug, /^place-[0-9a-f]{8}$/);
assert.equal((await q(`select owner_id from businesses where id=$1`, [b2]))[0].owner_id, null, "no owner unless the submitter said so");
// edit + reject
const eid = (await as(3, () => q(`insert into submissions (user_id, type, business_id, payload) values ($1,'edit',$2,$3) returning id`, [id(3), bid, { phone: "07709998888", address: "شارع جديد" }])))[0].id;
await as("admin", () => db.query(`select approve_submission($1)`, [eid]));
b = (await q(`select phone, address, name from businesses where id=$1`, [bid]))[0]; assert.deepEqual([b.phone, b.address, b.name], ["07709998888", "شارع جديد", "Cafe Nova"], "edit merges only provided fields");
const rid = (await as(3, () => q(`insert into submissions (user_id, type, payload) values ($1,'new_place',$2) returning id`, [id(3), { name: "Spam", category_id: cat }])))[0].id;
await as("mod", () => db.query(`select reject_submission($1,'مكرر')`, [rid]));
assert.equal((await q(`select status from submissions where id=$1`, [rid]))[0].status, "rejected");
assert.ok((await notifs(id(3))).includes("submission_rejected"), "submitter notified of rejection");

// ---- claims
await as(2, () => db.query(`insert into claims (business_id, user_id, phone) values ($1,$2,'07701234567')`, [b2, id(2)]));
const cid = (await q(`select id from claims limit 1`))[0].id;
await as("mod", () => db.query(`select review_claim($1,true)`, [cid]));
assert.equal((await q(`select owner_id from businesses where id=$1`, [b2]))[0].owner_id, id(2));
assert.ok((await notifs(id(2))).includes("claim_approved"));
await fails(() => as("mod", () => db.query(`select review_claim($1,false)`, [cid])), "claim already reviewed");

// ---- reports -> hide content
const post = (await as(1, () => q(`insert into posts (author_id, body) values ($1,'محتوى مسيء') returning id`, [id(1)])))[0].id;
const rep = (await as(2, () => q(`insert into reports (reporter_id, target_type, target_id, reason) values ($1,'post',$2,'inappropriate') returning id`, [id(2), post])))[0].id;
await fails(() => as(3, () => db.query(`select moderate_report($1,'hide')`, [rep])), "user cannot moderate");
await as("mod", () => db.query(`select moderate_report($1,'hide')`, [rep]));
assert.equal((await q(`select is_hidden from posts where id=$1`, [post]))[0].is_hidden, true);
assert.equal((await as(3, () => q(`select * from posts where id=$1`, [post]))).length, 0, "hidden post invisible");
assert.equal((await q(`select status from reports where id=$1`, [rep]))[0].status, "resolved");
const rev = (await as(3, () => q(`insert into reviews (business_id,user_id,rating,body) values ($1,$2,1,'فاسد') returning id`, [bid, id(3)])))[0].id;
const rep2 = (await as(2, () => q(`insert into reports (reporter_id, target_type, target_id, reason) values ($1,'review',$2,'fake') returning id`, [id(2), rev])))[0].id;
await as("mod", () => db.query(`select moderate_report($1,'hide')`, [rep2]));
assert.equal((await q(`select rating_count from businesses where id=$1`, [bid]))[0].rating_count, 0, "hidden review leaves the rating");
const rep3 = (await as(2, () => q(`insert into reports (reporter_id, target_type, target_id, reason) values ($1,'business',$2,'scam') returning id`, [id(2), b2])))[0].id;
await as("mod", () => db.query(`select moderate_report($1,'dismiss')`, [rep3]));
assert.equal((await q(`select status from businesses where id=$1`, [b2]))[0].status, "active", "dismiss leaves content untouched");

// ---- events moderation
const ev = (await as(3, () => q(`insert into events (title, starts_at) values ('حفل', now() + interval '2 days') returning id`)))[0].id;
await as("mod", () => db.query(`select moderate_event($1,'published')`, [ev]));
assert.equal((await as(1, () => q(`select * from events where id=$1`, [ev]))).length, 1);
assert.ok((await notifs(id(3))).includes("event_published"));

// ---- business administration
await fails(() => as(1, () => db.query(`select set_business_state($1, 'suspended')`, [bid])), "owner cannot suspend/verify via RPC");
await as("mod", () => db.query(`select set_business_state($1, null, true, 30)`, [bid]));
b = (await q(`select is_verified, is_featured, featured_until, last_verified_at from businesses where id=$1`, [bid]))[0];
assert.ok(b.is_verified && b.is_featured && b.featured_until && b.last_verified_at);
await as("mod", () => db.query(`select set_business_state($1, 'suspended', null, 0)`, [bid]));
assert.equal((await as(3, () => q(`select * from businesses where id=$1`, [bid]))).length, 0, "suspended business hidden publicly");
assert.equal((await as(1, () => q(`select * from businesses where id=$1`, [bid]))).length, 1, "owner still sees own suspended page");

// ---- users
await fails(() => as("mod", () => db.query(`select admin_set_user($1,'admin',null)`, [id(3)])), "moderator cannot change roles");
await as("mod", () => db.query(`select admin_set_user($1,null,true)`, [id(3)]));
await fails(() => as(3, () => db.query(`insert into posts (author_id, body) values ($1,'x')`, [id(3)])), "banned user cannot post");
await fails(() => as("mod", () => db.query(`select admin_set_user($1,null,true)`, [ADMIN])), "moderator cannot ban an admin");
await as("admin", () => db.query(`select admin_set_user($1,'moderator',false)`, [id(3)]));
assert.equal((await q(`select role from profiles where id=$1`, [id(3)]))[0].role, "moderator");
await fails(() => as("admin", () => db.query(`select admin_set_user($1,'user',null)`, [ADMIN])), "cannot modify self");

// ---- staff quick add
const qa = (await as("mod", () => q(`select staff_add_business($1) b`, [{ name: "Quick Shop", category_id: cat, district_id: dist, lat: 35.4, lng: 44.3, phone: "0770", open: "09:00", close: "22:00", price_level: "2" }])))[0].b;
b = (await q(`select status, is_verified, last_verified_at, (select count(*) from business_hours where business_id=$1)::int h from businesses where id=$1`, [qa]))[0];
assert.deepEqual([b.status, b.is_verified, b.h], ["active", true, 7]); assert.ok(b.last_verified_at);

// ---- owner analytics
await as(null, () => db.query(`select track_event('view','business',$1)`, [bid]));
await as(2, () => db.query(`select track_event('call','business',$1)`, [bid]));
await as(2, () => db.query(`select track_event('directions','business',$1)`, [bid]));
await as(3, () => db.query(`select track_event('whatsapp','business',$1)`, [bid]));
const st = (await as(1, () => q(`select business_stats($1, 7) s`, [bid])))[0].s;
assert.deepEqual([st.totals.view, st.totals.call, st.totals.directions, st.totals.whatsapp], [1, 1, 1, 1]);
assert.equal(st.daily.length, 7); assert.equal(st.daily[6].views, 1); assert.equal(st.daily[6].contacts, 2); assert.equal(st.daily[0].views, 0, "empty days are zero-filled");
await fails(() => as(2, () => db.query(`select business_stats($1, 7)`, [bid])), "other users cannot read stats");
await as("mod", () => db.query(`select business_stats($1, 7)`, [bid]));

// ---- overview + audit
await fails(() => as(1, () => db.query(`select admin_overview()`)), "overview is staff only");
const ov = (await as("mod", () => q(`select admin_overview() o`)))[0].o;
assert.ok(ov.businesses > 30 && ov.users >= 5 && "pending_submissions" in ov && ov.unverified >= 2);
const audit = await q(`select action from audit_log`); assert.ok(audit.length >= 12 && audit.some((a) => a.action === "admin_set_user"));
assert.equal((await as(1, () => q(`select * from audit_log`))).length, 0, "audit log is staff-only");
console.log("moderation + dashboard OK");
