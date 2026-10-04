-- =====================================================================
-- Migration 0009: plans, subscriptions (manual activation), plan limits,
-- sponsored ads. Payment gateways (ZainCash / FastPay / Qi Card) plug in
-- later by calling activate_subscription() from a webhook.
-- =====================================================================

-- Plans: features become per-locale lists {"ar":[...],"en":[...]}
update public.plans set features = jsonb_build_object('ar', features) where jsonb_typeof(features) = 'array';
update public.plans set features = features || case code
  when 'free'     then '{"en":["Basic business page","Up to 5 photos","1 active offer at a time"]}'::jsonb
  when 'pro'      then '{"en":["Verified-first review","Unlimited photos","Unlimited offers","Full analytics"]}'::jsonb
  when 'featured' then '{"en":["Everything in Pro","Top of search results","Featured badge","Shown in sponsored slots"]}'::jsonb
  else '{}'::jsonb end;
update public.plans set features = features || '{"ar":["صفحة نشاط أساسية","حتى 5 صور","عرض واحد فعّال"]}'::jsonb where code = 'free';
update public.plans set features = features || '{"ar":["أولوية في المراجعة والتوثيق","صور غير محدودة","عروض غير محدودة","إحصائيات كاملة"]}'::jsonb where code = 'pro';
update public.plans set features = features || '{"ar":["كل مزايا الاحترافية","ظهور أعلى النتائج","شارة «مميز»","ظهور في المساحات الممولة"]}'::jsonb where code = 'featured';

alter table public.subscriptions
  add column note        text check (char_length(note) <= 300),
  add column amount_iqd  int,
  add column activated_by uuid references public.profiles(id) on delete set null;
-- one open request per business at a time
create unique index subscriptions_one_pending on public.subscriptions(business_id) where status = 'pending';

-- Plan code currently in force for a business ('free' when nothing active).
create or replace function public.active_plan(p_business uuid)
returns text language sql stable security definer set search_path = public as $$
  select coalesce((
    select p.code from public.subscriptions s join public.plans p on p.id = s.plan_id
    where s.business_id = p_business and s.status = 'active' and s.starts_at <= now() and (s.ends_at is null or s.ends_at > now())
    order by p.price_iqd desc limit 1), 'free');
$$;
grant execute on function public.active_plan(uuid) to anon, authenticated;

-- Owners request a plan (never activate it themselves).
drop policy if exists sub_insert on public.subscriptions;
create or replace function public.request_subscription(p_business uuid, p_plan text, p_note text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare pl public.plans; sid uuid;
begin
  if not public.owns_business(p_business) then raise exception 'not_allowed'; end if;
  select * into pl from public.plans where code = p_plan and is_active and price_iqd > 0;
  if not found then raise exception 'bad_plan'; end if;
  insert into public.subscriptions (business_id, plan_id, status, amount_iqd, note)
  values (p_business, pl.id, 'pending', pl.price_iqd, left(p_note, 300)) returning id into sid;
  perform public.audit('request_subscription', 'subscription', sid::text, jsonb_build_object('plan', p_plan));
  return sid;
end $$;
grant execute on function public.request_subscription(uuid, text, text) to authenticated;

create or replace function public.cancel_subscription_request(p_sub uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  delete from public.subscriptions s where s.id = p_sub and s.status = 'pending' and (public.owns_business(s.business_id) or public.is_admin());
  if not found then raise exception 'not_found'; end if;
end $$;
grant execute on function public.cancel_subscription_request(uuid) to authenticated;

-- Admin confirms payment (cash / transfer) and activates. The featured tier also features the page.
create or replace function public.activate_subscription(p_sub uuid, p_days int default null, p_payment_ref text default null)
returns void language plpgsql security definer set search_path = public as $$
declare s public.subscriptions; pl public.plans; d int; ends timestamptz;
begin
  if not public.is_admin() then raise exception 'not_allowed'; end if;
  select * into s from public.subscriptions where id = p_sub and status = 'pending' for update;
  if not found then raise exception 'not_found'; end if;
  select * into pl from public.plans where id = s.plan_id;
  d := coalesce(p_days, pl.duration_days);
  if d < 1 or d > 3650 then raise exception 'bad_days'; end if;
  ends := now() + make_interval(days => d);
  update public.subscriptions set status = 'expired', ends_at = now() where business_id = s.business_id and status = 'active';
  update public.subscriptions set status = 'active', starts_at = now(), ends_at = ends, payment_ref = left(p_payment_ref, 120), activated_by = auth.uid() where id = p_sub;
  update public.businesses set is_featured = pl.is_featured_tier, featured_until = case when pl.is_featured_tier then ends end where id = s.business_id;
  perform public._notify_system((select owner_id from public.businesses where id = s.business_id), 'subscription_active', s.business_id, pl.name_ar);
  perform public.audit('activate_subscription', 'subscription', p_sub::text, jsonb_build_object('plan', pl.code, 'days', d, 'ref', p_payment_ref));
end $$;
grant execute on function public.activate_subscription(uuid, int, text) to authenticated;

create or replace function public.cancel_subscription(p_sub uuid)
returns void language plpgsql security definer set search_path = public as $$
declare s public.subscriptions;
begin
  if not public.is_admin() then raise exception 'not_allowed'; end if;
  update public.subscriptions set status = 'cancelled', ends_at = now() where id = p_sub and status = 'active' returning * into s;
  if not found then raise exception 'not_found'; end if;
  update public.businesses set is_featured = false, featured_until = null where id = s.business_id;
  perform public.audit('cancel_subscription', 'subscription', p_sub::text);
end $$;
grant execute on function public.cancel_subscription(uuid) to authenticated;

-- Idempotent housekeeping (run from pg_cron / on admin page load).
create or replace function public.sync_subscriptions()
returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  update public.subscriptions set status = 'expired' where status = 'active' and ends_at is not null and ends_at <= now();
  get diagnostics n = row_count;
  update public.businesses b set is_featured = false, featured_until = null
   where b.is_featured and b.featured_until is not null and b.featured_until <= now();
  return n;
end $$;
grant execute on function public.sync_subscriptions() to authenticated;

-- Plan limits (free tier): 5 gallery photos, 1 live offer. Staff / service role bypass.
create or replace function public.enforce_plan_limits()
returns trigger language plpgsql set search_path = public as $$
begin
  if current_user not in ('anon', 'authenticated') or public.is_staff() then return new; end if;
  if tg_table_name = 'business_images' then
    if public.active_plan(new.business_id) = 'free' and (select count(*) from public.business_images where business_id = new.business_id) >= 5 then
      raise exception 'plan_limit_images' using errcode = 'P0001';
    end if;
  elsif tg_table_name = 'offers' then
    if public.active_plan(new.business_id) = 'free'
       and (select count(*) from public.offers where business_id = new.business_id and status = 'published' and ends_at > now()) >= 1 then
      raise exception 'plan_limit_offers' using errcode = 'P0001';
    end if;
  end if;
  return new;
end $$;
create trigger trg_plan_limit_images before insert on public.business_images for each row execute function public.enforce_plan_limits();
create trigger trg_plan_limit_offers before insert on public.offers for each row execute function public.enforce_plan_limits();

-- ---------------------------------------------------------------------
-- Sponsored ads
-- ---------------------------------------------------------------------
create or replace function public.get_ads(p_placement text, p_category int default null, p_limit int default 1)
returns table (id uuid, business_id uuid, business_slug text, title text, body text, image_url text, link_url text)
language sql stable set search_path = public as $$
  select a.id, a.business_id, b.slug, a.title, a.body, a.image_url, a.link_url
  from public.ads a left join public.businesses b on b.id = a.business_id
  where a.placement = p_placement and a.is_active and a.starts_at <= now() and a.ends_at > now()
    and (a.business_id is null or b.status = 'active')
    and (a.category_id is null or a.category_id = p_category)
  order by random()
  limit least(greatest(p_limit, 1), 5);
$$;
grant execute on function public.get_ads(text, int, int) to anon, authenticated;

create or replace function public.track_ad(p_id uuid, p_kind text)
returns void language sql security definer set search_path = public as $$
  update public.ads set impressions = impressions + (p_kind = 'impression')::int, clicks = clicks + (p_kind = 'click')::int
  where id = p_id and p_kind in ('impression', 'click') and is_active;
$$;
grant execute on function public.track_ad(uuid, text) to anon, authenticated;

create or replace function public.ad_target(p_id uuid)
returns text language sql stable security definer set search_path = public as $$
  select coalesce(nullif(a.link_url, ''), '/business/' || b.slug) from public.ads a left join public.businesses b on b.id = a.business_id where a.id = p_id and a.is_active;
$$;
grant execute on function public.ad_target(uuid) to anon, authenticated;
