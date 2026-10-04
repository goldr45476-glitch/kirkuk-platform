// Web Push DB layer: prefs filtering, dispatcher RPCs (service-only), expiring-offer alerts. Run: node scripts/test-push.mjs
import { PGlite } from "@electric-sql/pglite";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";
import { readFileSync, readdirSync } from "node:fs";
import assert from "node:assert/strict";

const db = new PGlite({ extensions: { pg_trgm } });
await db.exec(`
  create role anon; create role authenticated; create role service_role;
  create schema auth; create schema storage;
  create table auth.users (id uuid primary key default gen_random_uuid(), phone text, raw_user_meta_data jsonb default '{}');
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.uid', true), '')::uuid $$;
  create table storage.buckets (id text primary key, name text, public bool, file_size_limit int, allowed_mime_types text[]);
  create table storage.objects (id uuid default gen_random_uuid(), bucket_id text, name text);
  create function storage.foldername(n text) returns text[] language sql as $$ select string_to_array(n, '/') $$;
  create publication supabase_realtime;
  alter default privileges in schema public grant execute on functions to anon, authenticated;`);
for (const f of readdirSync("supabase/migrations").sort()) await db.exec(readFileSync(`supabase/migrations/${f}`, "utf8"));
await db.exec(readFileSync("supabase/seed.sql", "utf8"));
await db.exec(`grant usage on schema public, auth to anon, authenticated, service_role;
  grant all on all tables in schema public to anon, authenticated, service_role;
  grant execute on function auth.uid() to anon, authenticated;`);

const id = (n) => `00000000-0000-0000-0000-00000000000${n}`;
for (const n of [1, 2, 3]) await db.query(`insert into auth.users (id, phone, raw_user_meta_data) values ($1,$2,$3)`, [id(n), `+96477000000${n}`, JSON.stringify({ full_name: `User ${n}` })]);
const as = async (n, fn) => { await db.exec(`set role authenticated; select set_config('request.uid', '${n ? id(n) : ""}', false)`); try { return await fn(); } finally { await db.exec(`reset role`); } };
const svc = async (fn) => { await db.exec(`set role service_role`); try { return await fn(); } finally { await db.exec(`reset role`); } };
const q = async (sql, p) => (await db.query(sql, p)).rows;
const fails = async (fn, msg) => { let ok = false; try { await fn(); } catch { ok = true; } assert.ok(ok, msg); };
const biz = (await q(`select id from businesses where slug='cafe-asri'`))[0].id;

// clients cannot call dispatcher functions
for (const sql of [`select queue_expiring_offer_alerts()`, `select * from pending_push()`, `select mark_pushed(array[]::uuid[])`])
  await fails(() => as(1, () => db.query(sql)), `client must not run: ${sql}`);
await fails(() => as(null, () => db.query(`select * from pending_push()`)), "anon neither");

// subscriptions + prefs are private
await as(1, () => db.query(`insert into push_subscriptions (user_id, endpoint, keys) values ($1,'https://push.example/1','{"p256dh":"a","auth":"b"}')`, [id(1)]));
await as(2, () => db.query(`insert into push_subscriptions (user_id, endpoint, keys) values ($1,'https://push.example/2','{"p256dh":"a","auth":"b"}')`, [id(2)]));
assert.equal((await as(1, () => q(`select * from push_subscriptions`))).length, 1, "only own subscription visible");
await fails(() => as(1, () => db.query(`insert into push_subscriptions (user_id, endpoint, keys) values ($1,'https://push.example/x','{}')`, [id(2)])), "cannot subscribe for someone else");
await as(1, () => db.query(`insert into notification_prefs (user_id, push_social) values ($1, true)`, [id(1)]));
assert.equal((await as(2, () => q(`select * from notification_prefs`))).length, 0, "prefs private");
await fails(() => as(2, () => db.query(`insert into notification_prefs (user_id) values ($1)`, [id(1)])), "cannot write others' prefs");

// category filtering
await q(`delete from notifications`);
const mk = async (user, type) => (await q(`insert into notifications (user_id, type, business_id, data) values ($1,$2,$3,'{}') returning id`, [user, type, biz]))[0].id;
const n1like = await mk(id(1), "like");      // user1 push_social=true -> pushed
const n2like = await mk(id(2), "like");      // user2 default social=false -> filtered
const n2rev = await mk(id(2), "review");     // default true
const n3sys = await mk(id(3), "system");     // user3 has no subscription -> filtered
const old = await mk(id(2), "system"); await q(`update notifications set created_at = now() - interval '7 hours' where id=$1`, [old]);
const p = await svc(() => q(`select * from pending_push()`));
const got = p.map((r) => r.id).sort();
assert.deepEqual(got, [n1like, n2rev].sort(), "prefs, subscriptions and age filter respected");
const row = p.find((r) => r.id === n2rev);
assert.equal(row.business_slug, "cafe-asri"); assert.ok(row.locale); assert.equal(row.subscriptions.length, 1); assert.equal(row.subscriptions[0].endpoint, "https://push.example/2");

assert.equal((await svc(() => q(`select mark_pushed($1) n`, [[n1like, n2rev]])))[0].n, 2);
assert.equal((await svc(() => q(`select mark_pushed($1) n`, [[n1like, n2rev]])))[0].n, 0, "idempotent");
assert.equal((await svc(() => q(`select * from pending_push()`))).length, 0, "nothing left after mark_pushed");
await q(`update notifications set read_at = now() where id=$1`, [n2like]);

// expiring-offer alerts
await q(`delete from notifications`);
const offer = (await q(`select id from offers limit 1`))[0].id;
await as(1, () => db.query(`select toggle_save('offer',$1)`, [offer]));
await q(`update offers set starts_at = now() - interval '1 day', ends_at = now() + interval '3 hours', status='published' where id=$1`, [offer]);
assert.equal((await svc(() => q(`select queue_expiring_offer_alerts() n`)))[0].n, 1);
assert.equal((await svc(() => q(`select queue_expiring_offer_alerts() n`)))[0].n, 0, "deduped");
const alert = (await q(`select * from notifications where user_id=$1`, [id(1)]))[0];
assert.equal(alert.type, "system"); assert.equal(alert.data.event, "offer_ending"); assert.ok(alert.data.excerpt);
assert.equal((await q(`select count(*)::int c from notifications where user_id=$1`, [id(2)]))[0].c, 0, "only users who saved it");
await q(`update offers set ends_at = now() + interval '3 days' where id=$1`, [offer]);
await q(`delete from notifications`);
assert.equal((await svc(() => q(`select queue_expiring_offer_alerts() n`)))[0].n, 0, "not yet near the end");
// admin health snapshot: staff only
await fails(() => as(1, () => db.query(`select admin_push_stats()`)), "non-staff cannot read push stats");
await q(`update profiles set role='admin' where id=$1`, [id(3)]);
await q(`insert into notifications (user_id, type, business_id, data) values ($1,'review',$2,'{}')`, [id(2), biz]);
const st = (await as(3, () => q(`select admin_push_stats() s`)))[0].s;
assert.equal(st.devices, 2); assert.equal(st.subscribed_users, 2); assert.equal(st.backlog, 1); assert.ok(st.oldest_backlog_min >= 0);
assert.equal(st.pushed_24h, 0);
await q(`update notifications set pushed_at = now() where user_id=$1`, [id(2)]);
const st2 = (await as(3, () => q(`select admin_push_stats() s`)))[0].s;
assert.equal(st2.pushed_24h, 1); assert.equal(st2.backlog, 0); assert.ok(st2.last_pushed_at);
console.log("push tests passed");
