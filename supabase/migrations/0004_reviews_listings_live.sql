-- =====================================================================
-- Migration 0004: reviews hardening, listings search, live service status
-- =====================================================================

-- ---------------------------------------------------------------------
-- Reviews: a reviewer may only edit rating/body of their own review.
-- Owner reply / hidden flag / ownership fields are protected.
-- ---------------------------------------------------------------------
create or replace function public.guard_review_privileged()
returns trigger language plpgsql set search_path = public as $$
begin
  if current_user in ('anon', 'authenticated') and not public.is_staff() then
    if tg_op = 'INSERT' then
      new.owner_reply := null; new.replied_at := null; new.is_hidden := false; new.user_id := auth.uid();
    else
      new.owner_reply := old.owner_reply; new.replied_at := old.replied_at; new.is_hidden := old.is_hidden;
      new.business_id := old.business_id; new.user_id := old.user_id;
    end if;
  end if;
  return new;
end $$;
create trigger trg_reviews_guard before insert or update on public.reviews
  for each row execute function public.guard_review_privileged();

-- Notify the owner of new reviews.
create or replace function public.notify_review()
returns trigger language plpgsql security definer set search_path = public as $$
declare owner uuid;
begin
  select owner_id into owner from public.businesses where id = new.business_id;
  if owner is not null and owner <> new.user_id then
    insert into public.notifications (user_id, type, actor_id, business_id, data)
    values (owner, 'review', new.user_id, new.business_id,
            jsonb_build_object('rating', new.rating, 'excerpt', left(coalesce(new.body, ''), 80)));
  end if;
  return null;
end $$;
create trigger trg_notify_review after insert on public.reviews
  for each row execute function public.notify_review();

-- Owner reply now also notifies the reviewer.
create or replace function public.reply_to_review(p_review uuid, p_reply text)
returns void language plpgsql security definer set search_path = public as $$
declare r public.reviews;
begin
  select * into r from public.reviews where id = p_review;
  if not found or not public.owns_business(r.business_id) or coalesce(trim(p_reply), '') = '' then
    raise exception 'not_allowed';
  end if;
  update public.reviews set owner_reply = left(trim(p_reply), 1000), replied_at = now() where id = p_review;
  insert into public.notifications (user_id, type, actor_id, business_id, data)
  values (r.user_id, 'review_reply', auth.uid(), r.business_id, jsonb_build_object('excerpt', left(trim(p_reply), 80)));
end $$;
grant execute on function public.reply_to_review(uuid, text) to authenticated;

-- ---------------------------------------------------------------------
-- Listings search (real estate / vehicles / jobs)
-- ---------------------------------------------------------------------
create or replace function public.search_listings(
  p_kind       listing_kind,
  p_q          text    default null,
  p_deal       text    default null,     -- details.deal   (sale | rent | wanted)
  p_type       text    default null,     -- details.type
  p_district   int     default null,
  p_currency   text    default null,
  p_min_price  numeric default null,
  p_max_price  numeric default null,
  p_min_area   numeric default null,
  p_min_rooms  int     default null,
  p_min_year   int     default null,
  p_employment text    default null,
  p_sort       text    default 'newest', -- newest | price_asc | price_desc
  p_limit      int     default 18,
  p_offset     int     default 0
)
returns table (
  id uuid, kind listing_kind, title text, price numeric, currency text, details jsonb,
  district_id int, is_featured boolean, created_at timestamptz, image text, total_count bigint
)
language sql stable set search_path = public as $$
  with q as (select nullif(trim(public.ar_normalize(p_q)), '') as qn),
  base as (
    select l.*, (l.is_featured and (l.featured_until is null or l.featured_until > now())) as feat
    from public.listings l, q
    where l.kind = p_kind and l.status = 'active'
      and (q.qn is null or l.search_norm like '%' || q.qn || '%')
      and (p_deal is null or l.details->>'deal' = p_deal)
      and (p_type is null or l.details->>'type' = p_type)
      and (p_district is null or l.district_id = p_district)
      and (p_currency is null or l.currency = p_currency)
      and (p_min_price is null or l.price >= p_min_price)
      and (p_max_price is null or l.price <= p_max_price)
      and (p_min_area  is null or (l.details->>'area_m2')::numeric >= p_min_area)
      and (p_min_rooms is null or (l.details->>'rooms')::int >= p_min_rooms)
      and (p_min_year  is null or (l.details->>'year')::int >= p_min_year)
      and (p_employment is null or l.details->>'employment' = p_employment)
  )
  select b.id, b.kind, b.title, b.price, b.currency, b.details, b.district_id, b.feat, b.created_at,
         (select i.url from public.listing_images i where i.listing_id = b.id order by i.sort_order limit 1),
         count(*) over()
  from base b
  order by b.feat desc,
           case when p_sort = 'price_asc'  then b.price end asc nulls last,
           case when p_sort = 'price_desc' then b.price end desc nulls last,
           b.created_at desc
  limit least(greatest(p_limit, 1), 60) offset greatest(p_offset, 0);
$$;
grant execute on function public.search_listings(listing_kind,text,text,text,int,text,numeric,numeric,numeric,int,int,text,text,int,int) to anon, authenticated;

-- Views counter for listings (RPC, since direct UPDATE is guarded).
create or replace function public.track_listing(p_id uuid)
returns void language sql security definer set search_path = public as $$
  update public.listings set views_count = views_count + 1 where id = p_id and status = 'active';
$$;
grant execute on function public.track_listing(uuid) to anon, authenticated;

-- ---------------------------------------------------------------------
-- Live service status (fuel / water): latest crowd report in the last 6h.
-- ---------------------------------------------------------------------
create or replace function public.get_service_status(p_category text)
returns table (
  id uuid, slug text, name text, address text, phone text, district_id int, is_open boolean,
  status avail_status, queue_level smallint, note text, reported_at timestamptz, recent_reports bigint
)
language sql stable set search_path = public as $$
  select b.id, b.slug, b.name, b.address, b.phone, b.district_id, public.is_open_now(b.id),
         r.status, r.queue_level, r.note, r.created_at,
         (select count(*) from public.service_status_reports x where x.business_id = b.id and x.created_at > now() - interval '3 hours')
  from public.businesses b
  left join lateral (
    select s.* from public.service_status_reports s
    where s.business_id = b.id and s.created_at > now() - interval '6 hours'
    order by s.created_at desc limit 1
  ) r on true
  where b.status = 'active'
    and b.category_id in (select c.id from public.categories c where c.slug = p_category)
  order by case r.status when 'available' then 0 when 'queue' then 1 when null then 2 else 3 end, b.name;
$$;
grant execute on function public.get_service_status(text) to anon, authenticated;
