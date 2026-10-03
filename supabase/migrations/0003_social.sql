-- =====================================================================
-- Migration 0003: social feed, stories rings, automatic notifications
-- =====================================================================

alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in ('follow','comment','like','review','review_reply','offer','post','message','verification','system'));

-- ---------------------------------------------------------------------
-- Feed: one round trip with author, business, media and liked-by-me.
--   p_mode 'following' = only businesses the caller follows.
-- ---------------------------------------------------------------------
create or replace function public.get_feed(
  p_mode     text        default 'all',
  p_before   timestamptz default null,
  p_limit    int         default 10,
  p_business uuid        default null,
  p_author   uuid        default null,
  p_post     uuid        default null
)
returns table (
  id uuid, body text, is_offer boolean, offer_ends_at timestamptz,
  likes_count int, comments_count int, created_at timestamptz,
  author jsonb, business jsonb, media jsonb, liked boolean
)
language sql stable set search_path = public as $$
  select p.id, p.body, p.is_offer, p.offer_ends_at, p.likes_count, p.comments_count, p.created_at,
         jsonb_build_object('id', a.id, 'full_name', a.full_name, 'username', a.username, 'avatar_url', a.avatar_url),
         case when b.id is null then null
              else jsonb_build_object('id', b.id, 'slug', b.slug, 'name', b.name, 'logo_url', b.logo_url, 'is_verified', b.is_verified) end,
         coalesce((select jsonb_agg(jsonb_build_object('url', m.url, 'width', m.width, 'height', m.height) order by m.sort_order)
                   from public.post_media m where m.post_id = p.id), '[]'::jsonb),
         exists (select 1 from public.likes l where l.post_id = p.id and l.user_id = auth.uid())
  from public.posts p
  join public.profiles a on a.id = p.author_id
  left join public.businesses b on b.id = p.business_id
  where not p.is_hidden
    and (p.business_id is null or b.status = 'active')
    and (p_before   is null or p.created_at < p_before)
    and (p_business is null or p.business_id = p_business)
    and (p_author   is null or p.author_id = p_author)
    and (p_post     is null or p.id = p_post)
    and (p_mode <> 'following' or p.business_id in (select f.business_id from public.follows f where f.user_id = auth.uid()))
    and not exists (select 1 from public.user_blocks ub where ub.blocker_id = auth.uid() and ub.blocked_id = p.author_id)
  order by p.created_at desc
  limit least(greatest(p_limit, 1), 50);
$$;
grant execute on function public.get_feed(text, timestamptz, int, uuid, uuid, uuid) to anon, authenticated;

-- ---------------------------------------------------------------------
-- Stories: businesses with at least one live story (followed first).
-- ---------------------------------------------------------------------
create or replace function public.get_story_rings()
returns table (business_id uuid, slug text, name text, logo_url text, is_verified boolean,
               followed boolean, stories jsonb, latest timestamptz)
language sql stable set search_path = public as $$
  select b.id, b.slug, b.name, b.logo_url, b.is_verified,
         exists (select 1 from public.follows f where f.business_id = b.id and f.user_id = auth.uid()) as followed,
         jsonb_agg(jsonb_build_object('id', s.id, 'media_url', s.media_url, 'caption', s.caption, 'created_at', s.created_at)
                   order by s.created_at) as stories,
         max(s.created_at) as latest
  from public.stories s
  join public.businesses b on b.id = s.business_id and b.status = 'active'
  where s.expires_at > now()
  group by b.id
  order by followed desc, latest desc
  limit 30;
$$;
grant execute on function public.get_story_rings() to anon, authenticated;

create or replace function public.unread_notifications()
returns int language sql stable set search_path = public as $$
  select count(*)::int from public.notifications where user_id = auth.uid() and read_at is null;
$$;
grant execute on function public.unread_notifications() to authenticated;

-- ---------------------------------------------------------------------
-- Notification producers (SECURITY DEFINER; users can never forge them)
-- ---------------------------------------------------------------------
create or replace function public.notify_follow()
returns trigger language plpgsql security definer set search_path = public as $$
declare owner uuid;
begin
  select owner_id into owner from public.businesses where id = new.business_id;
  if owner is not null and owner <> new.user_id then
    insert into public.notifications (user_id, type, actor_id, business_id)
    values (owner, 'follow', new.user_id, new.business_id);
  end if;
  return null;
end $$;
create trigger trg_notify_follow after insert on public.follows
  for each row execute function public.notify_follow();

create or replace function public.notify_like()
returns trigger language plpgsql security definer set search_path = public as $$
declare author uuid;
begin
  select author_id into author from public.posts where id = new.post_id;
  if author is not null and author <> new.user_id
     and not exists (select 1 from public.notifications n
                     where n.user_id = author and n.type = 'like' and n.actor_id = new.user_id and n.post_id = new.post_id) then
    insert into public.notifications (user_id, type, actor_id, post_id) values (author, 'like', new.user_id, new.post_id);
  end if;
  return null;
end $$;
create trigger trg_notify_like after insert on public.likes
  for each row execute function public.notify_like();

create or replace function public.notify_comment()
returns trigger language plpgsql security definer set search_path = public as $$
declare author uuid;
begin
  select author_id into author from public.posts where id = new.post_id;
  if author is not null and author <> new.author_id then
    insert into public.notifications (user_id, type, actor_id, post_id, data)
    values (author, 'comment', new.author_id, new.post_id, jsonb_build_object('excerpt', left(new.body, 80)));
  end if;
  return null;
end $$;
create trigger trg_notify_comment after insert on public.comments
  for each row execute function public.notify_comment();

create or replace function public.notify_followers_of_post()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.business_id is not null then
    insert into public.notifications (user_id, type, actor_id, business_id, post_id, data)
    select f.user_id, case when new.is_offer then 'offer' else 'post' end, new.author_id, new.business_id, new.id,
           jsonb_build_object('excerpt', left(new.body, 80))
    from public.follows f
    where f.business_id = new.business_id and f.user_id <> new.author_id;
  end if;
  return null;
end $$;
create trigger trg_notify_post after insert on public.posts
  for each row execute function public.notify_followers_of_post();

-- ---------------------------------------------------------------------
-- Fix: privilege guards must only restrict *direct* client writes.
-- Counter triggers / RPCs run as SECURITY DEFINER (current_user = owner), so
-- they must be allowed to change counters. The guards are therefore SECURITY
-- INVOKER and key off current_user instead of auth.uid().
-- ---------------------------------------------------------------------
create or replace function public.guard_profile_privileged()
returns trigger language plpgsql set search_path = public as $$
begin
  if current_user in ('anon', 'authenticated') and not public.is_admin() then
    new.role := old.role;
    new.is_banned := old.is_banned;
  end if;
  return new;
end $$;

create or replace function public.guard_business_privileged()
returns trigger language plpgsql set search_path = public as $$
begin
  if current_user in ('anon', 'authenticated') and not public.is_staff() then
    if tg_op = 'INSERT' then
      new.status := 'pending';
      new.is_verified := false;
      new.is_featured := false;
      new.featured_until := null;
      new.owner_id := auth.uid();
    else
      new.status := old.status;
      new.is_verified := old.is_verified;
      new.is_featured := old.is_featured;
      new.featured_until := old.featured_until;
      new.owner_id := old.owner_id;
      new.rating_avg := old.rating_avg;
      new.rating_count := old.rating_count;
      new.followers_count := old.followers_count;
      new.views_count := old.views_count;
      new.call_clicks := old.call_clicks;
    end if;
  end if;
  return new;
end $$;

create or replace function public.guard_listing_privileged()
returns trigger language plpgsql set search_path = public as $$
begin
  if current_user in ('anon', 'authenticated') and not public.is_staff() then
    if tg_op = 'INSERT' then
      new.is_featured := false; new.featured_until := null;
    else
      new.is_featured := old.is_featured; new.featured_until := old.featured_until;
      new.views_count := old.views_count;
    end if;
  end if;
  return new;
end $$;

-- Rate limiting is also skipped for definer/service contexts (seed, jobs).
create or replace function public.enforce_rate_limit()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  col   text := tg_argv[0];
  maxn  int  := tg_argv[1]::int;
  win   interval := tg_argv[2]::interval;
  uid   uuid;
  n     int;
begin
  if auth.uid() is null then return new; end if;
  if public.is_banned() then raise exception 'account_banned' using errcode = 'P0001'; end if;
  uid := (to_jsonb(new) ->> col)::uuid;
  execute format('select count(*) from %I.%I where %I = $1 and created_at > now() - $2',
                 tg_table_schema, tg_table_name, col) into n using uid, win;
  if n >= maxn then raise exception 'rate_limited' using errcode = 'P0001'; end if;
  return new;
end $$;
