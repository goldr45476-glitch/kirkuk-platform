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
const ADMIN = "00000000-0000-0000-0000-0000000000aa";
for (const n of [1, 2, 3]) await db.query(`insert into auth.users (id, phone, raw_user_meta_data) values ($1, $2, $3)`, [id(n), `+96477000000${n}`, JSON.stringify({ full_name: `User ${n}` })]);
await db.query(`insert into auth.users (id) values ($1)`, [ADMIN]); await db.query(`update profiles set role='admin' where id=$1`, [ADMIN]);
const as = async (n, fn) => { await db.exec(`set role authenticated; select set_config('request.uid', '${n === "admin" ? ADMIN : n ? id(n) : ""}', false)`); try { return await fn(); } finally { await db.exec(`reset role`); } };
const q = async (sql, p) => (await db.query(sql, p)).rows;
const fails = async (fn, msg) => { let ok = false; try { await fn(); } catch { ok = true; } assert.ok(ok, msg); };
const one = async (sql) => (await q(sql))[0].id;
const biz = await one(`select id from businesses where slug='cafe-asri'`);
const offer = await one(`select id from offers limit 1`);
const event = await one(`select id from events limit 1`);
const listing = (await q(`insert into listings (user_id, kind, title) values ($1,'job','وظيفة اختبار') returning id`, [id(3)]))[0].id;

// ---- saving
assert.equal((await as(1, () => q(`select toggle_save('business',$1) s`, [biz])))[0].s, true);
assert.equal((await as(1, () => q(`select toggle_save('business',$1) s`, [biz])))[0].s, false, "second toggle un-saves");
await as(1, () => db.query(`select toggle_save('business',$1)`, [biz]));
await as(1, () => db.query(`select toggle_save('offer',$1)`, [offer]));
await as(1, () => db.query(`select toggle_save('event',$1)`, [event]));
await as(1, () => db.query(`select toggle_save('listing',$1)`, [listing]));
await fails(() => as(null, () => db.query(`select toggle_save('business',$1)`, [biz])), "guests cannot save");
await fails(() => as(1, () => db.query(`select toggle_save('user',$1)`, [biz])), "bad type rejected");
await fails(() => as(1, () => db.query(`insert into favorites (user_id, business_id, offer_id) values ($1,$2,$3)`, [id(1), biz, offer])), "exactly one target");
const saved = (await as(1, () => q(`select get_saved() s`)))[0].s;
assert.equal(saved.places.length, 1); assert.equal(saved.offers.length, 1); assert.equal(saved.events.length, 1); assert.equal(saved.listings.length, 1);
assert.ok("is_open" in saved.places[0] && saved.offers[0].business_name && saved.events[0].title && saved.listings[0].title === "وظيفة اختبار");
const ids = (await as(1, () => q(`select saved_ids() s`)))[0].s; assert.deepEqual(ids.business, [biz]);
const other = (await as(2, () => q(`select get_saved() s`)))[0].s; assert.equal(other.places.length + other.offers.length + other.events.length + other.listings.length, 0, "saves are private");
assert.equal((await q(`select count(*)::int c from analytics_events where event='save'`))[0].c, 4, "save events tracked for place (x2), offer, event; not listings");
// expired offers disappear (RLS only shows live offers)
await q(`update offers set ends_at = now() - interval '1 hour', starts_at = now() - interval '2 days' where id=$1`, [offer]);
assert.equal((await as(1, () => q(`select get_saved() s`)))[0].s.offers.length, 0, "expired offers drop out of saved automatically");

// ---- collections
const list = await q(`select * from list_collections(1)`);
assert.deepEqual(list.map((c) => c.slug).sort(), ["breakfast-spots", "family-weekend", "open-late", "quiet-study"], "draft hidden from list");
assert.ok(list.every((c) => Number(c.item_count) >= 3) && list[0].preview.length >= 1);
const col = (await as(null, () => q(`select get_collection('open-late') c`)))[0].c;
assert.equal(col.items.length, 4); assert.equal(col.items[0].slug, "cafe-citadel", "ordered by position"); assert.ok("is_open" in col.items[0] && col.items[0].note);
assert.equal((await as(null, () => q(`select get_collection('draft-example') c`)))[0].c, null, "draft invisible to public");
assert.ok((await as("admin", () => q(`select get_collection('draft-example') c`)))[0].c, "staff see drafts");
await fails(() => as(1, () => db.query(`insert into collections (slug, title) values ('hack-list','قائمة')`)), "users cannot create collections");
await as("admin", () => db.query(`insert into collections (slug, title, status) values ('new-list','قائمة جديدة','published')`));
const nid = await one(`select id from collections where slug='new-list'`);
await as("admin", () => db.query(`insert into collection_items (collection_id, business_id, position) values ($1,$2,1)`, [nid, biz]));
assert.equal((await as(null, () => q(`select get_collection('new-list') c`)))[0].c.items.length, 1);
await q(`update businesses set status='suspended' where id=$1`, [biz]);
assert.equal((await as(null, () => q(`select get_collection('new-list') c`)))[0].c.items.length, 0, "suspended places drop out of collections");
await q(`update businesses set status='active' where id=$1`, [biz]);

// ---- account deletion
const ownBiz = await one(`select id from businesses where slug='pharm-noor'`);
await q(`update businesses set owner_id=$1 where id=$2`, [id(2), ownBiz]);
const post = (await as(2, () => q(`insert into posts (author_id, body) values ($1,'منشور') returning id`, [id(2)])))[0].id;
await as(2, () => db.query(`insert into reviews (business_id, user_id, rating) values ($1,$2,4)`, [biz, id(2)]));
await as(2, () => db.query(`select toggle_save('business',$1)`, [biz]));
await as(2, () => db.query(`select delete_my_account()`));
assert.equal((await q(`select count(*)::int c from auth.users where id=$1`, [id(2)]))[0].c, 0, "auth user removed");
assert.equal((await q(`select count(*)::int c from profiles where id=$1`, [id(2)]))[0].c, 0, "profile removed");
assert.equal((await q(`select count(*)::int c from posts where id=$1`, [post]))[0].c, 0, "posts removed");
assert.equal((await q(`select count(*)::int c from reviews where user_id=$1`, [id(2)]))[0].c, 0, "reviews removed");
assert.equal((await q(`select count(*)::int c from favorites where user_id=$1`, [id(2)]))[0].c, 0, "favorites removed");
assert.equal((await q(`select owner_id from businesses where id=$1`, [ownBiz]))[0].owner_id, null, "business survives, orphaned");
assert.equal((await q(`select rating_count from businesses where id=$1`, [biz]))[0].rating_count, 2, "ratings recomputed after deletion (seed has 2)");
await fails(() => as("admin", () => db.query(`select delete_my_account()`)), "the last admin cannot delete themselves");
await fails(() => as(null, () => db.query(`select delete_my_account()`)), "guests cannot");
console.log("saved + collections + privacy OK");
