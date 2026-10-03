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
await db.query(`update businesses set owner_id = $1 where slug = 'mutaam-al-qala'`, [id(1)]); // user1 owns the restaurant

const as = async (n, fn) => { await db.exec(`set role authenticated; select set_config('request.uid', '${n ? id(n) : ""}', false)`); try { return await fn(); } finally { await db.exec(`reset role`); } };
const q = async (sql, p) => (await db.query(sql, p)).rows;
const fails = async (fn, msg) => { let ok = false; try { await fn(); } catch { ok = true; } assert.ok(ok, msg); };
const biz = (await q(`select id from businesses where slug='mutaam-al-qala'`))[0].id;
const other = (await q(`select id from businesses where slug='cafe-asri'`))[0].id;
const notifs = (uid) => q(`select type from notifications where user_id=$1 order by created_at`, [uid]).then((r) => r.map((x) => x.type));

// privilege escalation is blocked
await as(2, () => db.query(`update profiles set role='admin' where id=$1`, [id(2)]));
assert.equal((await q(`select role from profiles where id=$1`, [id(2)]))[0].role, "user", "role cannot be self-promoted");

// follow -> owner notified
await as(2, () => db.query(`insert into follows (user_id, business_id) values ($1,$2)`, [id(2), biz]));
assert.deepEqual(await notifs(id(1)), ["follow"]);
assert.equal((await q(`select followers_count from businesses where id=$1`, [biz]))[0].followers_count, 1);

// only the owner may post as the business
await fails(() => as(3, () => db.query(`insert into posts (author_id, business_id, body) values ($1,$2,'x')`, [id(3), biz])), "non-owner cannot post as business");
await fails(() => as(1, () => db.query(`insert into posts (author_id, business_id, body) values ($1,$2,'x')`, [id(1), other])), "owner of A cannot post as B");

// business offer -> followers notified (not the author)
const post = (await as(1, () => q(`insert into posts (author_id, business_id, body, is_offer) values ($1,$2,'خصم 20% على المشويات',true) returning id`, [id(1), biz])))[0].id;
assert.deepEqual(await notifs(id(2)), ["offer"]);
assert.deepEqual(await notifs(id(3)), []);

// like + comment notify author; counters update; likes deduped on re-like
await as(2, () => db.query(`insert into likes (post_id, user_id) values ($1,$2)`, [post, id(2)]));
await as(2, () => db.query(`delete from likes where post_id=$1 and user_id=$2`, [post, id(2)]));
await as(2, () => db.query(`insert into likes (post_id, user_id) values ($1,$2)`, [post, id(2)]));
await as(2, () => db.query(`insert into comments (post_id, author_id, body) values ($1,$2,'رائع')`, [post, id(2)]));
assert.deepEqual(await notifs(id(1)), ["follow", "like", "comment"], "no duplicate like notifications");
const p = (await q(`select likes_count, comments_count from posts where id=$1`, [post]))[0];
assert.deepEqual([p.likes_count, p.comments_count], [1, 1]);

// can't like as someone else / delete someone else's post
await fails(() => as(3, () => db.query(`insert into likes (post_id, user_id) values ($1,$2)`, [post, id(2)])), "cannot like as another user");
await as(3, () => db.query(`delete from posts where id=$1`, [post]));
assert.equal((await q(`select count(*)::int c from posts where id=$1`, [post]))[0].c, 1, "other user cannot delete post");

// feed: liked flag, following filter, anonymous works
let feed = await as(2, () => q(`select * from get_feed('all')`));
assert.equal(feed.length, 1); assert.equal(feed[0].liked, true); assert.equal(feed[0].business.slug, "mutaam-al-qala");
feed = await as(3, () => q(`select * from get_feed('following')`)); assert.equal(feed.length, 0, "user3 follows nobody");
feed = await as(2, () => q(`select * from get_feed('following')`)); assert.equal(feed.length, 1);
feed = await as(null, () => q(`select * from get_feed('all')`)); assert.equal(feed[0].liked, false);

// notifications are private; users cannot forge them
assert.equal((await as(3, () => q(`select * from notifications`))).length, 0);
await fails(() => as(2, () => db.query(`insert into notifications (user_id, type) values ($1,'system')`, [id(1)])), "cannot forge notifications");
assert.equal((await as(1, () => q(`select unread_notifications() n`)))[0].n, 3);

// stories: only owner can create; rings listed
await fails(() => as(3, () => db.query(`insert into stories (business_id, media_url) values ($1,'u')`, [biz])), "non-owner cannot add story");
await as(1, () => db.query(`insert into stories (business_id, media_url, caption) values ($1,'https://x/s.webp','اليوم')`, [biz]));
const rings = await as(2, () => q(`select * from get_story_rings()`));
assert.equal(rings.length, 1); assert.equal(rings[0].followed, true);

// rate limit: 20 posts/hour
await fails(async () => { for (let i = 0; i < 25; i++) await as(3, () => db.query(`insert into posts (author_id, body) values ($1,'spam')`, [id(3)])); }, "rate limit");

// reports: one per target
await as(2, () => db.query(`insert into reports (reporter_id, target_type, target_id, reason) values ($1,'post',$2,'spam')`, [id(2), post]));
await fails(() => as(2, () => db.query(`insert into reports (reporter_id, target_type, target_id, reason) values ($1,'post',$2,'spam')`, [id(2), post])), "duplicate report");
// counters: RPC works, direct tampering is ignored
await as(2, () => db.query(`select track_business($1,'view')`, [biz]));
await as(1, () => db.query(`update businesses set views_count = 999, call_clicks = 999, name = 'مطعم القلعة' where id=$1`, [biz]));
const bz = (await q(`select views_count, call_clicks from businesses where id=$1`, [biz]))[0];
assert.deepEqual([bz.views_count, bz.call_clicks], [1, 0], "owner cannot tamper counters");
console.log("social + RLS OK");
