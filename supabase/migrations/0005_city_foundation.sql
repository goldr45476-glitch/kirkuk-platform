-- =====================================================================
-- Migration 0005: "Kirkuk Now" foundation
--   multi-city, data trust (last verified), special hours, amenities,
--   suitability, offers, events, submissions, claims, analytics, audit
-- =====================================================================

-- ---------------------------------------------------------------------
-- Cities. Adding a city = inserting a row here (no code change).
-- ---------------------------------------------------------------------
create table public.cities (
  id         serial primary key,
  slug       text not null unique,
  name       jsonb not null,                       -- {"ar":"كركوك","ku":"…","tr":"…","en":"Kirkuk"}
  center_lat float8 not null,
  center_lng float8 not null,
  timezone   text not null default 'Asia/Baghdad',
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.cities enable row level security;
create policy cities_read  on public.cities for select using (is_active or public.is_staff());
create policy cities_admin on public.cities for all using (public.is_admin()) with check (public.is_admin());

insert into public.cities (slug, name, center_lat, center_lng) values
  ('kirkuk', '{"ar":"كركوك","ku":"کەرکووک","tr":"Kerkük","en":"Kirkuk"}', 35.4681, 44.3922);

-- city_id on every content table (default = Kirkuk while it is the only city).
do $$
declare cid int := (select id from public.cities where slug = 'kirkuk'); t text;
begin
  foreach t in array array['districts', 'businesses', 'listings'] loop
    execute format('alter table public.%I add column city_id int references public.cities(id)', t);
    execute format('update public.%I set city_id = %s', t, cid);
    execute format('alter table public.%I alter column city_id set default %s', t, cid);
    execute format('alter table public.%I alter column city_id set not null', t);
    execute format('create index %I on public.%I(city_id)', t || '_city_idx', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- Data trust: every place shows when it was last verified.
-- ---------------------------------------------------------------------
alter table public.businesses
  add column last_verified_at timestamptz,
  add column verified_by uuid references public.profiles(id) on delete set null,
  add column price_level smallint check (price_level between 1 and 4);
update public.businesses set last_verified_at = created_at where is_verified;

create table public.audit_log (
  id         bigserial primary key,
  actor_id   uuid,
  action     text not null,
  entity     text not null,
  entity_id  text,
  detail     jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.audit_log enable row level security;
create policy audit_read on public.audit_log for select using (public.is_staff());

-- Owners must not edit verification fields themselves.
create or replace function public.guard_business_privileged()
returns trigger language plpgsql set search_path = public as $$
begin
  if current_user in ('anon', 'authenticated') and not public.is_staff() then
    if tg_op = 'INSERT' then
      new.status := 'pending'; new.is_verified := false; new.is_featured := false; new.featured_until := null;
      new.owner_id := auth.uid(); new.last_verified_at := null; new.verified_by := null;
    else
      new.status := old.status; new.is_verified := old.is_verified; new.is_featured := old.is_featured;
      new.featured_until := old.featured_until; new.owner_id := old.owner_id;
      new.rating_avg := old.rating_avg; new.rating_count := old.rating_count; new.followers_count := old.followers_count;
      new.views_count := old.views_count; new.call_clicks := old.call_clicks;
      new.last_verified_at := old.last_verified_at; new.verified_by := old.verified_by; new.city_id := old.city_id;
    end if;
  end if;
  return new;
end $$;

-- Staff confirm a place's data on the ground ("تحققنا قبل 3 أيام").
create or replace function public.mark_verified(p_business uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_staff() then raise exception 'not_allowed'; end if;
  update public.businesses set last_verified_at = now(), verified_by = auth.uid() where id = p_business;
  insert into public.audit_log (actor_id, action, entity, entity_id) values (auth.uid(), 'mark_verified', 'business', p_business::text);
end $$;
grant execute on function public.mark_verified(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- Special hours (Ramadan, Eid, holidays) + robust "open now"
--   true  = open, false = closed, NULL = hours unknown
-- ---------------------------------------------------------------------
create table public.special_hours (
  id          serial primary key,
  business_id uuid not null references public.businesses(id) on delete cascade,
  date_from   date not null,
  date_to     date not null,
  label       text,
  open_time   time,
  close_time  time,
  is_closed   boolean not null default false,
  check (date_to >= date_from)
);
create index special_hours_idx on public.special_hours(business_id, date_from, date_to);
alter table public.special_hours enable row level security;
create policy sh_read  on public.special_hours for select using (exists (select 1 from public.businesses b where b.id = business_id));
create policy sh_write on public.special_hours for all
  using (public.owns_business(business_id) or public.is_staff())
  with check (public.owns_business(business_id) or public.is_staff());

drop function if exists public.is_open_now(uuid);
create or replace function public.is_open_now(p_business uuid, p_at timestamptz default now())
returns boolean language plpgsql stable set search_path = public as $$
declare
  tz text; loc timestamp; d date; t time; dow int;
  sp public.special_hours; h public.business_hours; yh public.business_hours;
begin
  select coalesce(c.timezone, 'Asia/Baghdad') into tz
  from public.businesses b left join public.cities c on c.id = b.city_id where b.id = p_business;
  tz := coalesce(tz, 'Asia/Baghdad');
  loc := p_at at time zone tz; d := loc::date; t := loc::time; dow := extract(dow from loc)::int;

  -- 1) special hours for today win (most specific = shortest range)
  select * into sp from public.special_hours s
   where s.business_id = p_business and d between s.date_from and s.date_to
   order by (s.date_to - s.date_from) limit 1;
  if found then
    if sp.is_closed or sp.open_time is null or sp.close_time is null then return false; end if;
    if sp.open_time = sp.close_time then return true; end if;
    if sp.open_time < sp.close_time then return t >= sp.open_time and t < sp.close_time; end if;
    return t >= sp.open_time or t < sp.close_time;
  end if;

  -- 2) yesterday's overnight range spilling into today
  select * into yh from public.business_hours where business_id = p_business and day_of_week = (dow + 6) % 7;
  if yh.id is not null and not yh.is_closed and yh.open_time > yh.close_time and t < yh.close_time then return true; end if;

  -- 3) today's regular hours
  select * into h from public.business_hours where business_id = p_business and day_of_week = dow;
  if h.id is not null then
    if h.is_closed or h.open_time is null or h.close_time is null then return false; end if;
    if h.open_time = h.close_time then return true; end if;
    if h.open_time < h.close_time then return t >= h.open_time and t < h.close_time; end if;
    return t >= h.open_time;
  end if;

  -- 4) other days exist -> closed today; no hours at all -> unknown
  if exists (select 1 from public.business_hours where business_id = p_business) then return false; end if;
  return null;
end $$;

-- ---------------------------------------------------------------------
-- Amenities + suitability (feed the "وين نروح؟" recommender)
-- ---------------------------------------------------------------------
create table public.amenities (
  key  text primary key,
  name jsonb not null,
  icon text
);
create table public.business_amenities (
  business_id uuid not null references public.businesses(id) on delete cascade,
  amenity_key text not null references public.amenities(key) on delete cascade,
  primary key (business_id, amenity_key)
);
create table public.suitability (
  business_id uuid not null references public.businesses(id) on delete cascade,
  audience    text not null check (audience in ('family', 'couple', 'friends', 'kids', 'solo')),
  budget_band smallint check (budget_band between 1 and 4),
  primary key (business_id, audience)
);
create index business_amenities_key_idx on public.business_amenities(amenity_key);
alter table public.amenities          enable row level security;
alter table public.business_amenities enable row level security;
alter table public.suitability        enable row level security;
create policy am_read   on public.amenities for select using (true);
create policy am_admin  on public.amenities for all using (public.is_admin()) with check (public.is_admin());
create policy ba_read   on public.business_amenities for select using (true);
create policy ba_write  on public.business_amenities for all
  using (public.owns_business(business_id) or public.is_staff()) with check (public.owns_business(business_id) or public.is_staff());
create policy su_read   on public.suitability for select using (true);
create policy su_write  on public.suitability for all
  using (public.owns_business(business_id) or public.is_staff()) with check (public.owns_business(business_id) or public.is_staff());

insert into public.amenities (key, name, icon) values
 ('wifi',       '{"ar":"واي فاي","ku":"وایفای","tr":"Wi-Fi","en":"Wi-Fi"}', 'Wifi'),
 ('parking',    '{"ar":"مواقف","ku":"پارکینگ","tr":"Otopark","en":"Parking"}', 'ParkingSquare'),
 ('family',     '{"ar":"مناسب للعائلات","ku":"گونجاو بۆ خێزان","tr":"Aileye uygun","en":"Family friendly"}', 'Users'),
 ('kids',       '{"ar":"مكان للأطفال","ku":"شوێنی منداڵان","tr":"Çocuk alanı","en":"Kids area"}', 'Baby'),
 ('delivery',   '{"ar":"توصيل","ku":"گەیاندن","tr":"Teslimat","en":"Delivery"}', 'Bike'),
 ('booking',    '{"ar":"حجز","ku":"حجز","tr":"Rezervasyon","en":"Booking"}', 'CalendarCheck'),
 ('e_payment',  '{"ar":"دفع إلكتروني","ku":"پارەدانی ئەلیکترۆنی","tr":"Elektronik ödeme","en":"E-payment"}', 'CreditCard'),
 ('home_service','{"ar":"خدمة منزلية","ku":"خزمەتگوزاری ماڵەوە","tr":"Evde hizmet","en":"Home service"}', 'House'),
 ('outdoor',    '{"ar":"جلسة خارجية","ku":"دانیشتنی دەرەوە","tr":"Açık hava","en":"Outdoor seating"}', 'Trees'),
 ('quiet',      '{"ar":"هادئ للدراسة","ku":"ئارام بۆ خوێندن","tr":"Sessiz, çalışmaya uygun","en":"Quiet for studying"}', 'BookOpen');

-- ---------------------------------------------------------------------
-- Offers (auto-expire by ends_at) and events
-- ---------------------------------------------------------------------
create table public.offers (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  city_id     int not null references public.cities(id),
  title       text not null check (char_length(title) between 3 and 140),
  details     text check (char_length(details) <= 1000),
  image_url   text,
  starts_at   timestamptz not null default now(),
  ends_at     timestamptz not null,
  status      text not null default 'published' check (status in ('published', 'hidden')),
  created_at  timestamptz not null default now(),
  check (ends_at > starts_at)
);
create index offers_live_idx on public.offers(city_id, ends_at) where status = 'published';
create index offers_biz_idx on public.offers(business_id);

create or replace function public.offers_set_city()
returns trigger language plpgsql as $$
begin
  select city_id into new.city_id from public.businesses where id = new.business_id;
  return new;
end $$;
create trigger trg_offers_city before insert on public.offers for each row execute function public.offers_set_city();

create table public.events (
  id                uuid primary key default gen_random_uuid(),
  city_id           int not null default 1 references public.cities(id),
  title             text not null check (char_length(title) between 3 and 140),
  details           text check (char_length(details) <= 2000),
  category          text check (category in ('music','family','sports','culture','food','education','charity','other')),
  starts_at         timestamptz not null,
  ends_at           timestamptz,
  venue_business_id uuid references public.businesses(id) on delete set null,
  venue_name        text,
  lat               float8,
  lng               float8,
  image_url         text,
  status            text not null default 'pending' check (status in ('pending', 'published', 'hidden')),
  created_by        uuid references public.profiles(id) on delete set null,
  created_at        timestamptz not null default now()
);
create index events_live_idx on public.events(city_id, starts_at) where status = 'published';

-- Only staff publish events; everyone else's go to the review queue.
create or replace function public.guard_event()
returns trigger language plpgsql set search_path = public as $$
begin
  if current_user in ('anon', 'authenticated') and not public.is_staff() then
    if tg_op = 'INSERT' then new.status := 'pending'; new.created_by := auth.uid();
    else new.status := old.status; new.created_by := old.created_by; end if;
  end if;
  return new;
end $$;
create trigger trg_events_guard before insert or update on public.events for each row execute function public.guard_event();

alter table public.offers enable row level security;
alter table public.events enable row level security;
create policy offers_read on public.offers for select
  using ((status = 'published' and starts_at <= now() and ends_at > now()) or public.owns_business(business_id) or public.is_staff());
create policy offers_write on public.offers for all
  using (public.owns_business(business_id) or public.is_staff()) with check (public.owns_business(business_id) or public.is_staff());
create policy events_read on public.events for select
  using (status = 'published' or created_by = auth.uid() or public.is_staff());
create policy events_insert on public.events for insert with check (auth.uid() is not null and not public.is_banned());
create policy events_update on public.events for update using (public.is_staff() or created_by = auth.uid()) with check (public.is_staff() or created_by = auth.uid());
create policy events_delete on public.events for delete using (public.is_staff() or created_by = auth.uid());

-- ---------------------------------------------------------------------
-- Community submissions (new place / edit), ownership claims
-- ---------------------------------------------------------------------
create table public.submissions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  city_id     int not null default 1 references public.cities(id),
  type        text not null check (type in ('new_place', 'edit')),
  business_id uuid references public.businesses(id) on delete cascade,
  payload     jsonb not null,
  status      text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_by uuid references public.profiles(id) on delete set null,
  review_note text,
  created_at  timestamptz not null default now(),
  reviewed_at timestamptz
);
create index submissions_status_idx on public.submissions(status, created_at);

create table public.claims (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  phone       text not null,
  proof_path  text,                         -- private storage path
  status      text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_by uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  unique (business_id, user_id)
);
alter table public.submissions enable row level security;
alter table public.claims      enable row level security;
create policy sub2_insert on public.submissions for insert with check (user_id = auth.uid() and status = 'pending' and not public.is_banned());
create policy sub2_read   on public.submissions for select using (user_id = auth.uid() or public.is_staff());
create policy sub2_update on public.submissions for update using (public.is_staff()) with check (public.is_staff());
create policy cl_insert on public.claims for insert with check (user_id = auth.uid() and status = 'pending' and not public.is_banned());
create policy cl_read   on public.claims for select using (user_id = auth.uid() or public.is_staff());
create policy cl_update on public.claims for update using (public.is_staff()) with check (public.is_staff());

create trigger rl_submissions before insert on public.submissions for each row execute function public.enforce_rate_limit('user_id', '10', '1 day');
create trigger rl_events      before insert on public.events      for each row execute function public.enforce_rate_limit('created_by', '5', '1 day');

-- Approving a claim hands the business to the claimant (atomic).
create or replace function public.review_claim(p_claim uuid, p_approve boolean)
returns void language plpgsql security definer set search_path = public as $$
declare c public.claims;
begin
  if not public.is_staff() then raise exception 'not_allowed'; end if;
  update public.claims set status = case when p_approve then 'approved' else 'rejected' end, reviewed_by = auth.uid()
   where id = p_claim returning * into c;
  if p_approve and c.id is not null then
    update public.businesses set owner_id = c.user_id where id = c.business_id;
    update public.profiles set role = 'owner' where id = c.user_id and role = 'user';
  end if;
  insert into public.audit_log (actor_id, action, entity, entity_id, detail)
  values (auth.uid(), 'review_claim', 'claim', p_claim::text, jsonb_build_object('approved', p_approve));
end $$;
grant execute on function public.review_claim(uuid, boolean) to authenticated;

-- ---------------------------------------------------------------------
-- Analytics events (insert through RPC only; staff read)
-- ---------------------------------------------------------------------
create table public.analytics_events (
  id          bigserial primary key,
  event       text not null check (event in ('view','call','whatsapp','directions','save','share','search')),
  target_type text check (target_type in ('business','offer','event','listing')),
  target_id   uuid,
  city_id     int,
  user_id     uuid,
  created_at  timestamptz not null default now()
);
create index analytics_target_idx on public.analytics_events(target_type, target_id, created_at);
create index analytics_time_idx on public.analytics_events(created_at);
alter table public.analytics_events enable row level security;
create policy analytics_read on public.analytics_events for select
  using (public.is_staff() or (target_type = 'business' and public.owns_business(target_id)));

create or replace function public.track_event(p_event text, p_type text default null, p_id uuid default null)
returns void language plpgsql security definer set search_path = public as $$
declare cid int;
begin
  if p_event not in ('view','call','whatsapp','directions','save','share','search') then return; end if;
  if p_type = 'business' and p_id is not null then select city_id into cid from public.businesses where id = p_id; end if;
  insert into public.analytics_events (event, target_type, target_id, city_id, user_id) values (p_event, p_type, p_id, cid, auth.uid());
  if p_type = 'business' and p_event = 'view' then update public.businesses set views_count = views_count + 1 where id = p_id;
  elsif p_type = 'business' and p_event in ('call', 'whatsapp') then update public.businesses set call_clicks = call_clicks + 1 where id = p_id; end if;
end $$;
grant execute on function public.track_event(text, text, uuid) to anon, authenticated;

-- ---------------------------------------------------------------------
-- City-aware search: add p_city (trailing, default null = all cities)
-- ---------------------------------------------------------------------
drop function if exists public.search_businesses(text,text,int,numeric,boolean,boolean,float8,float8,text,int,int);
create or replace function public.search_businesses(
  p_q text default null, p_category text default null, p_district int default null, p_min_rating numeric default 0,
  p_open_now boolean default false, p_verified boolean default false, p_lat float8 default null, p_lng float8 default null,
  p_sort text default 'relevance', p_limit int default 24, p_offset int default 0, p_city int default null
)
returns table (
  id uuid, slug text, name text, description text, phone text, whatsapp text, address text,
  is_verified boolean, is_featured boolean, rating_avg numeric, rating_count int,
  lat float8, lng float8, district_id int, category_id int, logo_url text,
  is_open boolean, distance_km float8, total_count bigint, last_verified_at timestamptz
)
language sql stable set search_path = public set pg_trgm.word_similarity_threshold = '0.4'
as $$
  with q as (select nullif(trim(public.ar_normalize(p_q)), '') as qn),
  cats as (
    select c.id from public.categories c
    where p_category is not null
      and (c.slug = p_category or c.parent_id = (select x.id from public.categories x where x.slug = p_category))
  ),
  base as (
    select b.*,
      case when p_lat is not null and p_lng is not null and b.lat is not null then public.distance_km(p_lat, p_lng, b.lat, b.lng) end as dist,
      public.is_open_now(b.id) as open_now,
      (b.is_featured and (b.featured_until is null or b.featured_until > now())) as feat,
      case when q.qn is null then 0
           else greatest(word_similarity(q.qn, b.search_norm), case when b.search_norm like '%' || q.qn || '%' then 1 else 0 end) end as sc
    from public.businesses b, q
    where b.status = 'active'
      and (p_city is null or b.city_id = p_city)
      and (p_category is null or b.category_id in (select cid.id from cats cid))
      and (p_district is null or b.district_id = p_district)
      and b.rating_avg >= coalesce(p_min_rating, 0)
      and (not p_verified or b.is_verified)
      and (q.qn is null or b.search_norm like '%' || q.qn || '%' or q.qn <% b.search_norm)
  )
  select base.id, base.slug, base.name, base.description, base.phone, base.whatsapp, base.address,
         base.is_verified, base.feat, base.rating_avg, base.rating_count, base.lat, base.lng, base.district_id, base.category_id,
         base.logo_url, base.open_now, base.dist, count(*) over(), base.last_verified_at
  from base
  where (not p_open_now or coalesce(base.open_now, false))
  order by
    case when p_sort = 'nearest'   then base.dist end asc nulls last,
    case when p_sort = 'rating'    then base.rating_avg end desc,
    case when p_sort = 'newest'    then base.created_at end desc,
    case when p_sort = 'relevance' then base.feat::int end desc,
    base.sc desc, base.rating_avg desc, base.name
  limit least(greatest(p_limit, 1), 100) offset greatest(p_offset, 0);
$$;
grant execute on function public.search_businesses(text,text,int,numeric,boolean,boolean,float8,float8,text,int,int,int) to anon, authenticated;
