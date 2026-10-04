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
for (const n of [1, 2]) await db.query(`insert into auth.users (id, phone, raw_user_meta_data) values ($1, $2, $3)`, [id(n), `+96477000000${n}`, JSON.stringify({ full_name: `User ${n}` })]);
for (const u of [ADMIN, MOD]) await db.query(`insert into auth.users (id) values ($1)`, [u]);
await db.query(`update profiles set role='admin' where id=$1`, [ADMIN]); await db.query(`update profiles set role='moderator' where id=$1`, [MOD]);
const as = async (n, fn) => { const uid = n === "admin" ? ADMIN : n === "mod" ? MOD : n ? id(n) : ""; await db.exec(`set role authenticated; select set_config('request.uid', '${uid}', false)`); try { return await fn(); } finally { await db.exec(`reset role`); } };
const q = async (sql, p) => (await db.query(sql, p)).rows;
const fails = async (fn, msg, re) => { let err; try { await fn(); } catch (e) { err = e; } assert.ok(err, msg); if (re) assert.match(err.message, re, msg); };
const biz = (await q(`select id from businesses where slug='cafe-citadel'`))[0].id;
await q(`update businesses set owner_id=$1 where id=$2`, [id(1), biz]);
const planOf = async () => (await q(`select active_plan($1) p`, [biz]))[0].p;
const img = (n) => as(1, () => db.query(`insert into business_images (business_id, url, sort_order) values ($1,$2,$3)`, [biz, `https://x/${n}.webp`, n]));

// ---- free-tier limits
assert.equal(await planOf(), "free");
for (let i = 1; i <= 5; i++) await img(i);
await fails(() => img(6), "6th photo blocked on free plan", /plan_limit_images/);
await as("mod", () => db.query(`insert into business_images (business_id, url) values ($1,'https://x/staff.webp')`, [biz])); // staff bypass
await as(1, () => db.query(`insert into offers (business_id, title, ends_at) values ($1,'عرض 1', now() + interval '1 day')`, [biz]));
await fails(() => as(1, () => db.query(`insert into offers (business_id, title, ends_at) values ($1,'عرض 2', now() + interval '2 days')`, [biz])), "second live offer blocked", /plan_limit_offers/);
await q(`update offers set ends_at = now() - interval '1 hour', starts_at = now() - interval '2 days'`);
await as(1, () => db.query(`insert into offers (business_id, title, ends_at) values ($1,'عرض 3', now() + interval '2 days')`, [biz]));  // expired one no longer counts

// ---- requesting
await fails(() => as(2, () => db.query(`select request_subscription($1,'pro')`, [biz])), "non-owner cannot request", /not_allowed/);
await fails(() => as(1, () => db.query(`select request_subscription($1,'free')`, [biz])), "free is not purchasable", /bad_plan/);
await fails(() => as(1, () => db.query(`insert into subscriptions (business_id, plan_id, status) values ($1,2,'active')`, [biz])), "owner cannot insert subscriptions directly");
const sid = (await as(1, () => q(`select request_subscription($1,'pro','دفعت نقداً') s`, [biz])))[0].s;
await fails(() => as(1, () => db.query(`select request_subscription($1,'featured')`, [biz])), "only one open request", /subscriptions_one_pending|duplicate/);
await as(1, () => db.query(`update subscriptions set status='active', ends_at = now() + interval '999 days' where id=$1`, [sid]));
assert.equal((await q(`select status from subscriptions where id=$1`, [sid]))[0].status, "pending", "owner cannot self-activate");
assert.equal(await planOf(), "free");
assert.equal((await as(2, () => q(`select * from subscriptions`))).length, 0, "subscriptions are private");

// ---- activation (admin only)
await fails(() => as("mod", () => db.query(`select activate_subscription($1)`, [sid])), "moderator cannot activate", /not_allowed/);
await fails(() => as(1, () => db.query(`select activate_subscription($1)`, [sid])), "owner cannot activate", /not_allowed/);
await as("admin", () => db.query(`select activate_subscription($1, 30, 'ZC-1001')`, [sid]));
let sub = (await q(`select status, ends_at, payment_ref, activated_by from subscriptions where id=$1`, [sid]))[0];
assert.equal(sub.status, "active"); assert.equal(sub.payment_ref, "ZC-1001"); assert.equal(sub.activated_by, ADMIN);
assert.ok(Math.abs(new Date(sub.ends_at) - Date.now() - 30 * 86400e3) < 120e3, "30 days");
assert.equal(await planOf(), "pro");
await img(7);   // limit lifted on a paid plan
await as(1, () => db.query(`insert into offers (business_id, title, ends_at) values ($1,'عرض 4', now() + interval '1 day')`, [biz]));
assert.equal((await q(`select is_featured from businesses where id=$1`, [biz]))[0].is_featured, false, "pro is not featured");
assert.ok((await q(`select count(*)::int c from notifications where user_id=$1 and data->>'event'='subscription_active'`, [id(1)]))[0].c === 1, "owner notified");
await fails(() => as("admin", () => db.query(`select activate_subscription($1)`, [sid])), "cannot activate twice", /not_found/);

// ---- upgrade to featured: previous plan replaced, page featured
const sid2 = (await as(1, () => q(`select request_subscription($1,'featured') s`, [biz])))[0].s;
await as("admin", () => db.query(`select activate_subscription($1, 10)`, [sid2]));
assert.equal(await planOf(), "featured");
assert.equal((await q(`select status from subscriptions where id=$1`, [sid]))[0].status, "expired", "old plan expired on upgrade");
let b = (await q(`select is_featured, featured_until from businesses where id=$1`, [biz]))[0]; assert.ok(b.is_featured && b.featured_until);
assert.equal((await q(`select is_featured from search_businesses(p_q => 'الأرجيلة') limit 1`))[0].is_featured, true, "featured shows in search");

// ---- expiry
await q(`update subscriptions set ends_at = now() - interval '1 minute' where id=$1`, [sid2]);
assert.equal(await planOf(), "free", "expired plan stops granting benefits immediately");
await q(`update businesses set featured_until = now() - interval '1 minute' where id=$1`, [biz]);
assert.equal((await q(`select is_featured from search_businesses(p_q => 'الأرجيلة') limit 1`))[0].is_featured, false, "expired feature no longer boosts");
const n = (await as(1, () => q(`select sync_subscriptions() n`)))[0].n; assert.equal(Number(n), 1);
assert.equal((await q(`select status from subscriptions where id=$1`, [sid2]))[0].status, "expired");
assert.equal((await q(`select is_featured from businesses where id=$1`, [biz]))[0].is_featured, false);
assert.equal(Number((await as(1, () => q(`select sync_subscriptions() n`)))[0].n), 0, "idempotent");

// ---- cancel
const sid3 = (await as(1, () => q(`select request_subscription($1,'pro') s`, [biz])))[0].s;
await as(1, () => db.query(`select cancel_subscription_request($1)`, [sid3]));
assert.equal((await q(`select count(*)::int c from subscriptions where id=$1`, [sid3]))[0].c, 0, "owner cancels own pending request");
const sid4 = (await as(1, () => q(`select request_subscription($1,'pro') s`, [biz])))[0].s;
await as("admin", () => db.query(`select activate_subscription($1)`, [sid4]));
await fails(() => as("mod", () => db.query(`select cancel_subscription($1)`, [sid4])), "moderator cannot cancel", /not_allowed/);
await as("admin", () => db.query(`select cancel_subscription($1)`, [sid4]));
assert.equal(await planOf(), "free");

// ---- ads
let ads = await q(`select * from get_ads('feed')`); assert.equal(ads.length, 1); assert.ok(ads[0].business_slug && ads[0].title);
assert.equal((await q(`select * from get_ads('home_banner')`)).length, 0, "no ads for an empty placement");
assert.equal((await q(`select * from get_ads('category', 5)`)).length, 1, "category ad with no category filter applies everywhere");
const adId = ads[0].id;
await as(null, () => db.query(`select track_ad($1,'impression')`, [adId])); await as(2, () => db.query(`select track_ad($1,'impression')`, [adId])); await as(2, () => db.query(`select track_ad($1,'click')`, [adId]));
await as(2, () => db.query(`select track_ad($1,'hack')`, [adId]));
const st = (await q(`select impressions, clicks from ads where id=$1`, [adId]))[0]; assert.deepEqual([st.impressions, st.clicks], [2, 1]);
assert.match((await q(`select ad_target($1) t`, [adId]))[0].t, /^\/business\//);
await fails(() => as(1, () => db.query(`insert into ads (placement, title, ends_at) values ('feed','x', now() + interval '1 day')`)), "only admins create ads");
await as("admin", () => db.query(`insert into ads (placement, title, link_url, starts_at, ends_at) values ('feed','خارجي','https://example.com/promo', now() - interval '1 hour', now() + interval '1 day')`));
assert.ok((await q(`select ad_target(id) t from ads where title='خارجي'`))[0].t === "https://example.com/promo", "explicit link wins");
await q(`update ads set is_active=false where title='خارجي'`);
assert.equal((await q(`select * from get_ads('feed', null, 5)`)).length, 1, "inactive ads hidden");
await q(`update ads set ends_at = now() - interval '1 minute' where placement='feed' and title <> 'خارجي'`);
assert.equal((await q(`select * from get_ads('feed', null, 5)`)).length, 0, "expired ads hidden");
await q(`update ads set ends_at = now() + interval '1 day' where placement='category'`);
await q(`update businesses set status='suspended' where id=(select business_id from ads where placement='category')`);
assert.equal((await q(`select * from get_ads('category')`)).length, 0, "ads of suspended businesses hidden");
// ---- plans seed shape (per-locale features)
const plans = await q(`select code, features from plans order by sort_order`);
assert.deepEqual(plans.map((x) => x.code), ["free", "pro", "featured"]);
assert.ok(plans.every((x) => Array.isArray(x.features.ar) && x.features.ar.length >= 3 && Array.isArray(x.features.en)), "features are {ar:[],en:[]}");
console.log("monetization OK");
