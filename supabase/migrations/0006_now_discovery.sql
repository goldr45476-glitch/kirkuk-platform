-- =====================================================================
-- Migration 0006: "Now" discovery — open now, live offers, events,
-- new places and the rule-based "وين نروح؟" recommender (no AI).
-- =====================================================================

-- Closing time of a place today (NULL for 24h / closed / unknown).
create or replace function public.todays_close_time(p_business uuid)
returns time language sql stable set search_path = public as $$
  select h.close_time
  from public.businesses b
  left join public.cities c on c.id = b.city_id
  join public.business_hours h on h.business_id = b.id
   and h.day_of_week = extract(dow from (now() at time zone coalesce(c.timezone, 'Asia/Baghdad')))::int
  where b.id = p_business and not h.is_closed and h.open_time <> h.close_time;
$$;

-- ---------------------------------------------------------------------
-- Open now (nearest first when coordinates are given)
-- ---------------------------------------------------------------------
create or replace function public.get_open_now(
  p_city int, p_lat float8 default null, p_lng float8 default null, p_limit int default 12
)
returns table (
  id uuid, slug text, name text, address text, phone text, whatsapp text, district_id int, category_id int,
  rating_avg numeric, rating_count int, is_verified boolean, price_level smallint, distance_km float8,
  closes_at time, last_verified_at timestamptz
)
language sql stable set search_path = public as $$
  select b.id, b.slug, b.name, b.address, b.phone, b.whatsapp, b.district_id, b.category_id,
         b.rating_avg, b.rating_count, b.is_verified, b.price_level,
         case when p_lat is not null and p_lng is not null and b.lat is not null then public.distance_km(p_lat, p_lng, b.lat, b.lng) end,
         public.todays_close_time(b.id), b.last_verified_at
  from public.businesses b
  where b.status = 'active' and b.city_id = p_city and public.is_open_now(b.id) is true
  order by
    case when p_lat is not null and p_lng is not null then public.distance_km(p_lat, p_lng, b.lat, b.lng) end asc nulls last,
    (b.is_featured and (b.featured_until is null or b.featured_until > now())) desc, b.rating_avg desc, b.name
  limit least(greatest(p_limit, 1), 50);
$$;

-- ---------------------------------------------------------------------
-- Live offers (ending soonest first)
-- ---------------------------------------------------------------------
create or replace function public.get_offers_live(p_city int, p_limit int default 20, p_business uuid default null)
returns table (
  id uuid, title text, details text, image_url text, starts_at timestamptz, ends_at timestamptz,
  business_id uuid, business_slug text, business_name text, logo_url text, phone text, district_id int
)
language sql stable set search_path = public as $$
  select o.id, o.title, o.details, o.image_url, o.starts_at, o.ends_at,
         b.id, b.slug, b.name, b.logo_url, b.phone, b.district_id
  from public.offers o
  join public.businesses b on b.id = o.business_id and b.status = 'active'
  where o.city_id = p_city and o.status = 'published' and o.starts_at <= now() and o.ends_at > now()
    and (p_business is null or o.business_id = p_business)
  order by o.ends_at
  limit least(greatest(p_limit, 1), 50);
$$;

-- ---------------------------------------------------------------------
-- Events happening within the next p_days (ongoing ones included)
-- ---------------------------------------------------------------------
create or replace function public.get_events_upcoming(p_city int, p_days int default 14, p_limit int default 20)
returns table (
  id uuid, title text, details text, category text, starts_at timestamptz, ends_at timestamptz,
  venue_name text, venue_slug text, lat float8, lng float8, image_url text
)
language sql stable set search_path = public as $$
  select e.id, e.title, e.details, e.category, e.starts_at, e.ends_at,
         coalesce(e.venue_name, b.name), b.slug, coalesce(e.lat, b.lat), coalesce(e.lng, b.lng), e.image_url
  from public.events e
  left join public.businesses b on b.id = e.venue_business_id
  where e.city_id = p_city and e.status = 'published'
    and coalesce(e.ends_at, e.starts_at + interval '3 hours') >= now()
    and e.starts_at <= now() + make_interval(days => greatest(p_days, 1))
  order by e.starts_at
  limit least(greatest(p_limit, 1), 50);
$$;

-- ---------------------------------------------------------------------
-- New places
-- ---------------------------------------------------------------------
create or replace function public.get_new_places(p_city int, p_days int default 45, p_limit int default 10)
returns table (
  id uuid, slug text, name text, address text, phone text, whatsapp text, district_id int, category_id int,
  rating_avg numeric, rating_count int, is_verified boolean, created_at timestamptz
)
language sql stable set search_path = public as $$
  select b.id, b.slug, b.name, b.address, b.phone, b.whatsapp, b.district_id, b.category_id,
         b.rating_avg, b.rating_count, b.is_verified, b.created_at
  from public.businesses b
  where b.status = 'active' and b.city_id = p_city and b.created_at > now() - make_interval(days => greatest(p_days, 1))
  order by b.created_at desc
  limit least(greatest(p_limit, 1), 50);
$$;

-- ---------------------------------------------------------------------
-- "وين نروح؟" — deterministic matching: open now × audience × budget × distance.
--   p_random = true  -> "فاجئني": one random place that passes the same filters.
-- ---------------------------------------------------------------------
create or replace function public.recommend_places(
  p_city int, p_audience text default null, p_budget int default null, p_max_km float8 default null,
  p_lat float8 default null, p_lng float8 default null, p_random boolean default false,
  p_exclude uuid[] default '{}', p_limit int default 6
)
returns table (
  id uuid, slug text, name text, address text, phone text, whatsapp text, district_id int,
  rating_avg numeric, rating_count int, price_level smallint, distance_km float8, closes_at time,
  audience text, budget_band smallint, amenities text[], last_verified_at timestamptz
)
language sql stable set search_path = public as $$
  with origin as (
    select coalesce(p_lat, c.center_lat) as lat, coalesce(p_lng, c.center_lng) as lng from public.cities c where c.id = p_city
  ),
  cand as (
    select b.*, s.audience as s_aud, s.budget_band as s_band,
           public.distance_km(o.lat, o.lng, b.lat, b.lng) as dist,
           coalesce((select array_agg(a.amenity_key order by a.amenity_key) from public.business_amenities a where a.business_id = b.id), '{}') as ams
    from public.businesses b
    cross join origin o
    left join public.suitability s on s.business_id = b.id and s.audience = p_audience
    where b.status = 'active' and b.city_id = p_city and b.lat is not null
      and not (b.id = any(coalesce(p_exclude, '{}')))
      and public.is_open_now(b.id) is true
      and exists (select 1 from public.categories c left join public.categories par on par.id = c.parent_id
                  where c.id = b.category_id and coalesce(par.slug, c.slug) in ('food', 'malls'))
      and (p_audience is null or s.audience is not null)
      and (p_budget is null or coalesce(s.budget_band, b.price_level, 2) <= p_budget)
      and (p_max_km is null or public.distance_km(o.lat, o.lng, b.lat, b.lng) <= p_max_km)
  )
  select cand.id, cand.slug, cand.name, cand.address, cand.phone, cand.whatsapp, cand.district_id,
         cand.rating_avg, cand.rating_count, cand.price_level, cand.dist, public.todays_close_time(cand.id),
         cand.s_aud, cand.s_band, cand.ams, cand.last_verified_at
  from cand
  order by
    case when p_random then random() end,
    (coalesce(cand.rating_avg, 0) * 2 - cand.dist * 0.8
       + case when cand.is_featured then 1 else 0 end
       + case when p_audience in ('family', 'kids') and ('kids' = any(cand.ams) or 'family' = any(cand.ams)) then 2 else 0 end
       + case when p_audience = 'solo' and ('quiet' = any(cand.ams) or 'wifi' = any(cand.ams)) then 2 else 0 end) desc,
    cand.name
  limit case when p_random then 1 else least(greatest(p_limit, 1), 20) end;
$$;

grant execute on function public.todays_close_time(uuid) to anon, authenticated;
grant execute on function public.get_open_now(int, float8, float8, int) to anon, authenticated;
grant execute on function public.get_offers_live(int, int, uuid) to anon, authenticated;
grant execute on function public.get_events_upcoming(int, int, int) to anon, authenticated;
grant execute on function public.get_new_places(int, int, int) to anon, authenticated;
grant execute on function public.recommend_places(int, text, int, float8, float8, float8, boolean, uuid[], int) to anon, authenticated;
