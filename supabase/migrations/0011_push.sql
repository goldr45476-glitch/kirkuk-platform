-- =====================================================================
-- Migration 0011: Web Push. Notifications are produced by DB triggers (0003/0004/0007/0009);
-- a server-side dispatcher (service role) drains them and sends pushes.
--   * per-user preferences (notification_prefs)
--   * "offer ending soon" alerts for offers the user saved
--   * service-only functions: pending_push / mark_pushed / queue_expiring_offer_alerts
-- =====================================================================

alter table public.notifications add column pushed_at timestamptz;
create index notifications_unpushed_idx on public.notifications(created_at) where pushed_at is null;
alter table public.push_subscriptions add column user_agent text;

create table public.notification_prefs (
  user_id      uuid primary key references public.profiles(id) on delete cascade,
  push_social  boolean not null default false,   -- follows, likes, comments (noisy -> off by default)
  push_offers  boolean not null default true,    -- offers/posts from followed businesses, saved offers ending
  push_reviews boolean not null default true,    -- reviews of my business, replies to my reviews
  push_system  boolean not null default true,    -- submission/claim/event/subscription outcomes
  updated_at   timestamptz not null default now()
);
alter table public.notification_prefs enable row level security;
create policy prefs_own on public.notification_prefs for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create trigger trg_prefs_updated before update on public.notification_prefs for each row execute function public.set_updated_at();

-- Alerts for saved offers that end within 24h (once per user+offer).
create or replace function public.queue_expiring_offer_alerts()
returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  insert into public.notifications (user_id, type, business_id, data)
  select f.user_id, 'system', o.business_id, jsonb_build_object('event', 'offer_ending', 'excerpt', o.title, 'offer_id', o.id)
  from public.favorites f join public.offers o on o.id = f.offer_id
  where o.status = 'published' and o.ends_at > now() and o.ends_at <= now() + interval '24 hours'
    and not exists (select 1 from public.notifications x where x.user_id = f.user_id and x.data->>'event' = 'offer_ending' and x.data->>'offer_id' = o.id::text);
  get diagnostics n = row_count;
  return n;
end $$;

-- Pushable notifications: unpushed, recent, user has a subscription and the category is enabled.
create or replace function public.pending_push(p_limit int default 200)
returns table (
  id uuid, user_id uuid, type text, data jsonb, post_id uuid, locale text,
  actor_name text, business_name text, business_slug text, subscriptions jsonb
)
language sql stable security definer set search_path = public as $$
  select n.id, n.user_id, n.type, n.data, n.post_id, p.locale,
         a.full_name, b.name, b.slug,
         (select jsonb_agg(jsonb_build_object('endpoint', s.endpoint, 'keys', s.keys)) from public.push_subscriptions s where s.user_id = n.user_id)
  from public.notifications n
  join public.profiles p on p.id = n.user_id and not p.is_banned
  left join public.notification_prefs np on np.user_id = n.user_id
  left join public.profiles a on a.id = n.actor_id
  left join public.businesses b on b.id = n.business_id
  where n.pushed_at is null and n.read_at is null and n.created_at > now() - interval '6 hours'
    and exists (select 1 from public.push_subscriptions s where s.user_id = n.user_id)
    and case n.type
          when 'follow' then coalesce(np.push_social, false) when 'like' then coalesce(np.push_social, false) when 'comment' then coalesce(np.push_social, false)
          when 'offer' then coalesce(np.push_offers, true) when 'post' then coalesce(np.push_offers, true)
          when 'review' then coalesce(np.push_reviews, true) when 'review_reply' then coalesce(np.push_reviews, true)
          else coalesce(np.push_system, true) end
  order by n.created_at
  limit least(greatest(p_limit, 1), 500);
$$;

create or replace function public.mark_pushed(p_ids uuid[])
returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  update public.notifications set pushed_at = now() where id = any(p_ids) and pushed_at is null;
  get diagnostics n = row_count;
  return n;
end $$;

-- Service role only (the dispatcher). Clients must never call these.
revoke execute on function public.queue_expiring_offer_alerts() from public, anon, authenticated;
revoke execute on function public.pending_push(int) from public, anon, authenticated;
revoke execute on function public.mark_pushed(uuid[]) from public, anon, authenticated;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function public.queue_expiring_offer_alerts() to service_role;
    grant execute on function public.pending_push(int) to service_role;
    grant execute on function public.mark_pushed(uuid[]) to service_role;
  end if;
end $$;
