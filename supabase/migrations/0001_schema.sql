-- =====================================================================
-- دليل كركوك العام — Kirkuk Public Directory
-- Migration 0001: core schema, indexes, triggers, RLS, storage
-- =====================================================================

create extension if not exists pg_trgm;

-- ---------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------
create type user_role        as enum ('user', 'owner', 'moderator', 'admin');
create type business_status  as enum ('pending', 'active', 'suspended');
create type listing_kind     as enum ('property', 'vehicle', 'job', 'other');
create type listing_status   as enum ('active', 'sold', 'expired', 'hidden');
create type report_status    as enum ('open', 'reviewing', 'resolved', 'dismissed');
create type verification_status as enum ('pending', 'approved', 'rejected');
create type sub_status       as enum ('pending', 'active', 'expired', 'cancelled');
create type avail_status     as enum ('available', 'unavailable', 'queue');

-- ---------------------------------------------------------------------
-- Utilities
-- ---------------------------------------------------------------------

-- Normalise Arabic for tolerant search: strips tashkeel/tatweel, unifies
-- alef / yaa / taa-marbuta / hamza forms, lowercases Latin.
create or replace function public.ar_normalize(t text)
returns text language sql immutable parallel safe as $$
  select lower(
    translate(
      regexp_replace(coalesce(t, ''), '[ً-ٰٟـ]', '', 'g'),
      'أإآٱىةؤئ',
      'اااايهوي'
    )
  );
$$;

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

-- Haversine distance in kilometres.
create or replace function public.distance_km(lat1 float8, lng1 float8, lat2 float8, lng2 float8)
returns float8 language sql immutable parallel safe as $$
  select 6371 * 2 * asin(sqrt(
    power(sin(radians(lat2 - lat1) / 2), 2) +
    cos(radians(lat1)) * cos(radians(lat2)) * power(sin(radians(lng2 - lng1) / 2), 2)
  ));
$$;

-- ---------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text not null default '',
  username    text unique check (username ~ '^[a-z0-9_]{3,30}$'),
  avatar_url  text,
  bio         text check (char_length(bio) <= 300),
  phone       text,
  role        user_role not null default 'user',
  locale      text not null default 'ar' check (locale in ('ar','ku','tr','en')),
  is_banned   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger trg_profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();

-- Role helpers (SECURITY DEFINER so they can be used inside RLS policies
-- without recursion).
create or replace function public.current_role_name()
returns user_role language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid();
$$;
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select role = 'admin' from public.profiles where id = auth.uid()), false);
$$;
create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select role in ('moderator','admin') from public.profiles where id = auth.uid()), false);
$$;
create or replace function public.is_banned()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select is_banned from public.profiles where id = auth.uid()), false);
$$;

-- Users must never be able to promote themselves or un-ban themselves.
create or replace function public.guard_profile_privileged()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    new.role := old.role;
    new.is_banned := old.is_banned;
  end if;
  return new;
end $$;
create trigger trg_profiles_guard before update on public.profiles
  for each row execute function public.guard_profile_privileged();

-- Auto-create a profile for every new auth user.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, phone, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
    new.phone,
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- districts (أحياء ومناطق كركوك)
-- ---------------------------------------------------------------------
create table public.districts (
  id       serial primary key,
  slug     text not null unique,
  name_ar  text not null,
  name_ku  text,
  name_tr  text,
  name_en  text,
  lat      float8,
  lng      float8,
  sort_order int not null default 0
);

-- ---------------------------------------------------------------------
-- categories (tree)
-- ---------------------------------------------------------------------
create table public.categories (
  id         serial primary key,
  parent_id  int references public.categories(id) on delete cascade,
  slug       text not null unique,
  name_ar    text not null,
  name_ku    text,
  name_tr    text,
  name_en    text,
  icon       text,                 -- lucide icon name
  color      text,                 -- tailwind-friendly hex for tiles
  sort_order int not null default 0,
  is_active  boolean not null default true
);
create index categories_parent_idx on public.categories(parent_id);

-- ---------------------------------------------------------------------
-- businesses
-- ---------------------------------------------------------------------
create table public.businesses (
  id              uuid primary key default gen_random_uuid(),
  owner_id        uuid references public.profiles(id) on delete set null,
  category_id     int not null references public.categories(id),
  district_id     int references public.districts(id),
  slug            text not null unique,
  name            text not null check (char_length(name) between 2 and 120),
  description     text check (char_length(description) <= 2000),
  phone           text,
  whatsapp        text,
  website         text,
  address         text,
  lat             float8 check (lat between -90 and 90),
  lng             float8 check (lng between -180 and 180),
  logo_url        text,
  cover_url       text,
  status          business_status not null default 'pending',
  is_verified     boolean not null default false,
  is_featured     boolean not null default false,
  featured_until  timestamptz,
  rating_avg      numeric(3,2) not null default 0,
  rating_count    int not null default 0,
  followers_count int not null default 0,
  views_count     int not null default 0,
  call_clicks     int not null default 0,
  search_norm     text not null default '',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index businesses_category_idx on public.businesses(category_id);
create index businesses_district_idx on public.businesses(district_id);
create index businesses_owner_idx    on public.businesses(owner_id);
create index businesses_status_idx   on public.businesses(status, is_featured desc, rating_avg desc);
create index businesses_trgm_idx     on public.businesses using gin (search_norm gin_trgm_ops);
create index businesses_fts_idx      on public.businesses using gin (to_tsvector('simple', search_norm));
create trigger trg_businesses_updated before update on public.businesses
  for each row execute function public.set_updated_at();

create or replace function public.businesses_search_sync()
returns trigger language plpgsql as $$
begin
  new.search_norm := public.ar_normalize(
    coalesce(new.name,'') || ' ' || coalesce(new.description,'') || ' ' || coalesce(new.address,'')
  );
  return new;
end $$;
create trigger trg_businesses_search before insert or update of name, description, address
  on public.businesses for each row execute function public.businesses_search_sync();

-- Owners cannot self-verify / self-feature / self-activate.
create or replace function public.guard_business_privileged()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_staff() then
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
create trigger trg_businesses_guard before insert or update on public.businesses
  for each row execute function public.guard_business_privileged();

-- Becoming a business owner upgrades the profile role.
create or replace function public.promote_owner()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.profiles set role = 'owner' where id = new.owner_id and role = 'user';
  return new;
end $$;
create trigger trg_business_promote_owner after insert on public.businesses
  for each row when (new.owner_id is not null) execute function public.promote_owner();

create table public.business_hours (
  id          serial primary key,
  business_id uuid not null references public.businesses(id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6), -- 0 = Sunday
  open_time   time,
  close_time  time,
  is_closed   boolean not null default false,
  unique (business_id, day_of_week)
);

create table public.business_images (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  url         text not null,
  caption     text,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);
create index business_images_biz_idx on public.business_images(business_id, sort_order);

create table public.products_services (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 120),
  description text,
  price       numeric(14,2) check (price >= 0),
  currency    text not null default 'IQD' check (currency in ('IQD','USD')),
  image_url   text,
  is_available boolean not null default true,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);
create index products_biz_idx on public.products_services(business_id, sort_order);

-- Open-now helper (Baghdad time, UTC+3). Handles overnight ranges.
create or replace function public.is_open_now(p_business uuid)
returns boolean language sql stable as $$
  with t as (select (now() at time zone 'Asia/Baghdad') as ts)
  select coalesce((
    select case
      when h.is_closed then false
      when h.open_time is null or h.close_time is null then false
      when h.open_time = h.close_time then true                      -- 24h
      when h.open_time < h.close_time then (t.ts::time >= h.open_time and t.ts::time < h.close_time)
      else (t.ts::time >= h.open_time or t.ts::time < h.close_time)   -- overnight
    end
    from public.business_hours h, t
    where h.business_id = p_business
      and h.day_of_week = extract(dow from t.ts)::int
  ), false);
$$;

-- ---------------------------------------------------------------------
-- Social: posts, media, comments, likes, follows, stories, favorites
-- ---------------------------------------------------------------------
create table public.posts (
  id             uuid primary key default gen_random_uuid(),
  author_id      uuid not null references public.profiles(id) on delete cascade,
  business_id    uuid references public.businesses(id) on delete cascade,
  body           text not null check (char_length(body) between 1 and 3000),
  is_offer       boolean not null default false,
  offer_ends_at  timestamptz,
  likes_count    int not null default 0,
  comments_count int not null default 0,
  is_hidden      boolean not null default false,
  created_at     timestamptz not null default now()
);
create index posts_feed_idx on public.posts(created_at desc) where not is_hidden;
create index posts_biz_idx  on public.posts(business_id, created_at desc);
create index posts_author_idx on public.posts(author_id, created_at desc);

create table public.post_media (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references public.posts(id) on delete cascade,
  url        text not null,
  width      int,
  height     int,
  sort_order int not null default 0
);
create index post_media_post_idx on public.post_media(post_id, sort_order);

create table public.comments (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references public.posts(id) on delete cascade,
  author_id  uuid not null references public.profiles(id) on delete cascade,
  parent_id  uuid references public.comments(id) on delete cascade,
  body       text not null check (char_length(body) between 1 and 1000),
  is_hidden  boolean not null default false,
  created_at timestamptz not null default now()
);
create index comments_post_idx on public.comments(post_id, created_at);

create table public.likes (
  post_id    uuid not null references public.posts(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table public.follows (
  user_id     uuid not null references public.profiles(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (user_id, business_id)
);
create index follows_biz_idx on public.follows(business_id);

create table public.favorites (
  user_id     uuid not null references public.profiles(id) on delete cascade,
  business_id uuid references public.businesses(id) on delete cascade,
  listing_id  uuid,
  created_at  timestamptz not null default now(),
  check ((business_id is not null) <> (listing_id is not null))
);
create unique index favorites_biz_uq on public.favorites(user_id, business_id) where business_id is not null;
create unique index favorites_lst_uq on public.favorites(user_id, listing_id)  where listing_id is not null;

create table public.stories (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  media_url   text not null,
  caption     text check (char_length(caption) <= 200),
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null default (now() + interval '24 hours')
);
create index stories_active_idx on public.stories(expires_at, business_id);

-- ---------------------------------------------------------------------
-- reviews (one per user per business)
-- ---------------------------------------------------------------------
create table public.reviews (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  rating      smallint not null check (rating between 1 and 5),
  body        text check (char_length(body) <= 1500),
  owner_reply text check (char_length(owner_reply) <= 1000),
  replied_at  timestamptz,
  is_hidden   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (business_id, user_id)
);
create index reviews_biz_idx on public.reviews(business_id, created_at desc);
create trigger trg_reviews_updated before update on public.reviews
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- listings (real estate / vehicles / jobs)
-- ---------------------------------------------------------------------
create table public.listings (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  business_id uuid references public.businesses(id) on delete set null,
  kind        listing_kind not null,
  category_id int references public.categories(id),
  district_id int references public.districts(id),
  title       text not null check (char_length(title) between 3 and 160),
  description text check (char_length(description) <= 4000),
  price       numeric(14,2) check (price >= 0),
  currency    text not null default 'IQD' check (currency in ('IQD','USD')),
  -- kind-specific attributes, validated in the app with Zod:
  --  property: {deal:'sale'|'rent', type, area_m2, rooms, baths, floor}
  --  vehicle : {deal, make, model, year, mileage_km, fuel}
  --  job     : {type:'offer'|'seeking', employment, salary_range}
  details     jsonb not null default '{}'::jsonb,
  phone       text,
  lat         float8,
  lng         float8,
  status      listing_status not null default 'active',
  is_featured boolean not null default false,
  featured_until timestamptz,
  views_count int not null default 0,
  search_norm text not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index listings_kind_idx   on public.listings(kind, status, created_at desc);
create index listings_district_idx on public.listings(district_id);
create index listings_details_idx on public.listings using gin (details);
create index listings_trgm_idx   on public.listings using gin (search_norm gin_trgm_ops);
create trigger trg_listings_updated before update on public.listings
  for each row execute function public.set_updated_at();
create or replace function public.listings_search_sync()
returns trigger language plpgsql as $$
begin
  new.search_norm := public.ar_normalize(coalesce(new.title,'') || ' ' || coalesce(new.description,''));
  return new;
end $$;
create trigger trg_listings_search before insert or update of title, description
  on public.listings for each row execute function public.listings_search_sync();

create or replace function public.guard_listing_privileged()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_staff() then
    if tg_op = 'INSERT' then
      new.is_featured := false; new.featured_until := null;
    else
      new.is_featured := old.is_featured; new.featured_until := old.featured_until;
      new.views_count := old.views_count;
    end if;
  end if;
  return new;
end $$;
create trigger trg_listings_guard before insert or update on public.listings
  for each row execute function public.guard_listing_privileged();

create table public.listing_images (
  id         uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  url        text not null,
  sort_order int not null default 0
);
create index listing_images_idx on public.listing_images(listing_id, sort_order);

alter table public.favorites
  add constraint favorites_listing_fk foreign key (listing_id) references public.listings(id) on delete cascade;

-- ---------------------------------------------------------------------
-- pharmacy duty + live availability reports (fuel / water)
-- ---------------------------------------------------------------------
create table public.pharmacy_duty (
  id          serial primary key,
  business_id uuid not null references public.businesses(id) on delete cascade,
  duty_date   date not null,
  note        text,
  created_by  uuid references public.profiles(id) on delete set null,
  unique (business_id, duty_date)
);
create index pharmacy_duty_date_idx on public.pharmacy_duty(duty_date);

create table public.service_status_reports (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  status      avail_status not null,
  queue_level smallint check (queue_level between 0 and 3),
  note        text check (char_length(note) <= 200),
  created_at  timestamptz not null default now()
);
create index ssr_biz_idx on public.service_status_reports(business_id, created_at desc);

-- ---------------------------------------------------------------------
-- messaging
-- ---------------------------------------------------------------------
create table public.conversations (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  business_id     uuid not null references public.businesses(id) on delete cascade,
  last_message_at timestamptz not null default now(),
  created_at      timestamptz not null default now(),
  unique (user_id, business_id)
);
create table public.messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id       uuid not null references public.profiles(id) on delete cascade,
  body            text not null check (char_length(body) between 1 and 2000),
  read_at         timestamptz,
  created_at      timestamptz not null default now()
);
create index messages_conv_idx on public.messages(conversation_id, created_at);

create or replace function public.is_conversation_member(p_conv uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.conversations c
    left join public.businesses b on b.id = c.business_id
    where c.id = p_conv and (c.user_id = auth.uid() or b.owner_id = auth.uid())
  );
$$;

create or replace function public.bump_conversation()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.conversations set last_message_at = new.created_at where id = new.conversation_id;
  return new;
end $$;
create trigger trg_messages_bump after insert on public.messages
  for each row execute function public.bump_conversation();

-- ---------------------------------------------------------------------
-- notifications, reports, verification
-- ---------------------------------------------------------------------
create table public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  type       text not null check (type in ('follow','comment','like','review','review_reply','offer','message','verification','system')),
  actor_id   uuid references public.profiles(id) on delete set null,
  business_id uuid references public.businesses(id) on delete cascade,
  post_id    uuid references public.posts(id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  read_at    timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications(user_id, created_at desc);

create table public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  endpoint   text not null unique,
  keys       jsonb not null,
  created_at timestamptz not null default now()
);

create table public.reports (
  id           uuid primary key default gen_random_uuid(),
  reporter_id  uuid not null references public.profiles(id) on delete cascade,
  target_type  text not null check (target_type in ('business','post','comment','review','listing','user')),
  target_id    uuid not null,
  reason       text not null check (reason in ('spam','fake','inappropriate','scam','wrong_info','other')),
  details      text check (char_length(details) <= 1000),
  status       report_status not null default 'open',
  handled_by   uuid references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now(),
  unique (reporter_id, target_type, target_id)
);
create index reports_status_idx on public.reports(status, created_at desc);

create table public.user_blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create table public.verification_requests (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references public.businesses(id) on delete cascade,
  requested_by uuid not null references public.profiles(id) on delete cascade,
  id_doc_path  text not null,       -- private storage path
  license_path text,
  status       verification_status not null default 'pending',
  reviewer_id  uuid references public.profiles(id) on delete set null,
  review_note  text,
  created_at   timestamptz not null default now(),
  reviewed_at  timestamptz
);
create index verification_status_idx on public.verification_requests(status, created_at);

-- ---------------------------------------------------------------------
-- monetisation: plans, subscriptions, ads
-- ---------------------------------------------------------------------
create table public.plans (
  id            serial primary key,
  code          text not null unique,
  name_ar       text not null,
  name_ku       text,
  name_tr       text,
  name_en       text,
  price_iqd     int not null check (price_iqd >= 0),
  duration_days int not null default 30,
  features      jsonb not null default '[]'::jsonb,
  is_featured_tier boolean not null default false,
  sort_order    int not null default 0,
  is_active     boolean not null default true
);

create table public.subscriptions (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  plan_id     int not null references public.plans(id),
  status      sub_status not null default 'pending',
  starts_at   timestamptz,
  ends_at     timestamptz,
  payment_ref text,                   -- manual receipt / future gateway id
  created_at  timestamptz not null default now()
);
create index subscriptions_biz_idx on public.subscriptions(business_id, status);

create table public.ads (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses(id) on delete cascade,
  placement   text not null check (placement in ('feed','category','home_banner','search')),
  category_id int references public.categories(id),
  title       text not null,
  body        text,
  image_url   text,
  link_url    text,
  starts_at   timestamptz not null default now(),
  ends_at     timestamptz not null,
  is_active   boolean not null default true,
  impressions int not null default 0,
  clicks      int not null default 0,
  created_at  timestamptz not null default now()
);
create index ads_active_idx on public.ads(placement, is_active, ends_at);

-- ---------------------------------------------------------------------
-- Counter triggers
-- ---------------------------------------------------------------------
create or replace function public.tg_likes_count()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then update public.posts set likes_count = likes_count + 1 where id = new.post_id;
  else update public.posts set likes_count = greatest(likes_count - 1, 0) where id = old.post_id; end if;
  return null;
end $$;
create trigger trg_likes_count after insert or delete on public.likes
  for each row execute function public.tg_likes_count();

create or replace function public.tg_comments_count()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then update public.posts set comments_count = comments_count + 1 where id = new.post_id;
  else update public.posts set comments_count = greatest(comments_count - 1, 0) where id = old.post_id; end if;
  return null;
end $$;
create trigger trg_comments_count after insert or delete on public.comments
  for each row execute function public.tg_comments_count();

create or replace function public.tg_follows_count()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then update public.businesses set followers_count = followers_count + 1 where id = new.business_id;
  else update public.businesses set followers_count = greatest(followers_count - 1, 0) where id = old.business_id; end if;
  return null;
end $$;
create trigger trg_follows_count after insert or delete on public.follows
  for each row execute function public.tg_follows_count();

create or replace function public.tg_reviews_rating()
returns trigger language plpgsql security definer set search_path = public as $$
declare bid uuid := coalesce(new.business_id, old.business_id);
begin
  update public.businesses b set
    rating_count = s.c,
    rating_avg   = coalesce(s.a, 0)
  from (select count(*) c, round(avg(rating)::numeric, 2) a
        from public.reviews where business_id = bid and not is_hidden) s
  where b.id = bid;
  return null;
end $$;
create trigger trg_reviews_rating after insert or update or delete on public.reviews
  for each row execute function public.tg_reviews_rating();

-- Anyone may bump view / call counters through these RPCs (not by UPDATE).
create or replace function public.track_business(p_id uuid, p_kind text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_kind = 'view' then update public.businesses set views_count = views_count + 1 where id = p_id;
  elsif p_kind = 'call' then update public.businesses set call_clicks = call_clicks + 1 where id = p_id;
  end if;
end $$;
grant execute on function public.track_business(uuid, text) to anon, authenticated;

-- ---------------------------------------------------------------------
-- Rate limiting + ban enforcement on user-generated content
-- ---------------------------------------------------------------------
create or replace function public.enforce_rate_limit()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  col   text := tg_argv[0];
  maxn  int  := tg_argv[1]::int;
  win   interval := tg_argv[2]::interval;
  uid   uuid;
  n     int;
begin
  if auth.uid() is null then return new; end if;     -- service role / seed
  if public.is_banned() then raise exception 'account_banned' using errcode = 'P0001'; end if;
  uid := (to_jsonb(new) ->> col)::uuid;
  execute format('select count(*) from %I.%I where %I = $1 and created_at > now() - $2',
                 tg_table_schema, tg_table_name, col) into n using uid, win;
  if n >= maxn then raise exception 'rate_limited' using errcode = 'P0001'; end if;
  return new;
end $$;

create trigger rl_posts    before insert on public.posts    for each row execute function public.enforce_rate_limit('author_id', '20', '1 hour');
create trigger rl_comments before insert on public.comments for each row execute function public.enforce_rate_limit('author_id', '40', '1 hour');
create trigger rl_reviews  before insert on public.reviews  for each row execute function public.enforce_rate_limit('user_id',   '10', '1 day');
create trigger rl_messages before insert on public.messages for each row execute function public.enforce_rate_limit('sender_id', '120', '1 hour');
create trigger rl_listings before insert on public.listings for each row execute function public.enforce_rate_limit('user_id',   '10', '1 day');
create trigger rl_reports  before insert on public.reports  for each row execute function public.enforce_rate_limit('reporter_id', '30', '1 day');
create trigger rl_ssr      before insert on public.service_status_reports for each row execute function public.enforce_rate_limit('user_id', '20', '1 hour');

-- =====================================================================
-- Row Level Security
-- =====================================================================
alter table public.profiles               enable row level security;
alter table public.districts              enable row level security;
alter table public.categories             enable row level security;
alter table public.businesses             enable row level security;
alter table public.business_hours         enable row level security;
alter table public.business_images        enable row level security;
alter table public.products_services      enable row level security;
alter table public.posts                  enable row level security;
alter table public.post_media             enable row level security;
alter table public.comments               enable row level security;
alter table public.likes                  enable row level security;
alter table public.follows                enable row level security;
alter table public.favorites              enable row level security;
alter table public.stories                enable row level security;
alter table public.reviews                enable row level security;
alter table public.listings               enable row level security;
alter table public.listing_images         enable row level security;
alter table public.pharmacy_duty          enable row level security;
alter table public.service_status_reports enable row level security;
alter table public.conversations          enable row level security;
alter table public.messages               enable row level security;
alter table public.notifications          enable row level security;
alter table public.push_subscriptions     enable row level security;
alter table public.reports                enable row level security;
alter table public.user_blocks            enable row level security;
alter table public.verification_requests  enable row level security;
alter table public.plans                  enable row level security;
alter table public.subscriptions          enable row level security;
alter table public.ads                    enable row level security;

-- Helper: does the current user own this business?
create or replace function public.owns_business(p_biz uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.businesses where id = p_biz and owner_id = auth.uid());
$$;

-- profiles --------------------------------------------------------------
create policy profiles_read   on public.profiles for select using (true);
create policy profiles_update on public.profiles for update
  using (id = auth.uid() or public.is_admin()) with check (id = auth.uid() or public.is_admin());

-- public reference data -------------------------------------------------
create policy districts_read  on public.districts  for select using (true);
create policy districts_admin on public.districts  for all using (public.is_admin()) with check (public.is_admin());
create policy categories_read  on public.categories for select using (is_active or public.is_staff());
create policy categories_admin on public.categories for all using (public.is_admin()) with check (public.is_admin());
create policy plans_read  on public.plans for select using (is_active or public.is_admin());
create policy plans_admin on public.plans for all using (public.is_admin()) with check (public.is_admin());

-- businesses ------------------------------------------------------------
create policy businesses_read on public.businesses for select
  using (status = 'active' or owner_id = auth.uid() or public.is_staff());
create policy businesses_insert on public.businesses for insert
  with check (auth.uid() is not null and owner_id = auth.uid() and not public.is_banned());
create policy businesses_update on public.businesses for update
  using (owner_id = auth.uid() or public.is_staff()) with check (owner_id = auth.uid() or public.is_staff());
create policy businesses_delete on public.businesses for delete
  using (owner_id = auth.uid() or public.is_admin());

-- business children: public read when parent visible, owner/staff write --
create policy bh_read  on public.business_hours for select
  using (exists (select 1 from public.businesses b where b.id = business_id));
create policy bh_write on public.business_hours for all
  using (public.owns_business(business_id) or public.is_staff())
  with check (public.owns_business(business_id) or public.is_staff());

create policy bi_read  on public.business_images for select
  using (exists (select 1 from public.businesses b where b.id = business_id));
create policy bi_write on public.business_images for all
  using (public.owns_business(business_id) or public.is_staff())
  with check (public.owns_business(business_id) or public.is_staff());

create policy ps_read  on public.products_services for select
  using (exists (select 1 from public.businesses b where b.id = business_id));
create policy ps_write on public.products_services for all
  using (public.owns_business(business_id) or public.is_staff())
  with check (public.owns_business(business_id) or public.is_staff());

-- posts -----------------------------------------------------------------
create policy posts_read on public.posts for select
  using (not is_hidden or author_id = auth.uid() or public.is_staff());
create policy posts_insert on public.posts for insert
  with check (author_id = auth.uid() and not public.is_banned()
              and (business_id is null or public.owns_business(business_id)));
create policy posts_update on public.posts for update
  using (author_id = auth.uid() or public.is_staff())
  with check (author_id = auth.uid() or public.is_staff());
create policy posts_delete on public.posts for delete
  using (author_id = auth.uid() or public.is_staff());

create policy pm_read  on public.post_media for select using (true);
create policy pm_write on public.post_media for all
  using (exists (select 1 from public.posts p where p.id = post_id and (p.author_id = auth.uid() or public.is_staff())))
  with check (exists (select 1 from public.posts p where p.id = post_id and (p.author_id = auth.uid() or public.is_staff())));

-- comments --------------------------------------------------------------
create policy comments_read on public.comments for select
  using (not is_hidden or author_id = auth.uid() or public.is_staff());
create policy comments_insert on public.comments for insert
  with check (author_id = auth.uid() and not public.is_banned());
create policy comments_delete on public.comments for delete
  using (author_id = auth.uid() or public.is_staff());

-- likes / follows / favorites (own rows only; counts are public via posts/businesses)
create policy likes_read   on public.likes for select using (true);
create policy likes_insert on public.likes for insert with check (user_id = auth.uid() and not public.is_banned());
create policy likes_delete on public.likes for delete using (user_id = auth.uid());

create policy follows_read   on public.follows for select using (user_id = auth.uid() or public.owns_business(business_id) or public.is_staff());
create policy follows_insert on public.follows for insert with check (user_id = auth.uid());
create policy follows_delete on public.follows for delete using (user_id = auth.uid());

create policy favorites_own on public.favorites for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- stories ---------------------------------------------------------------
create policy stories_read  on public.stories for select using (expires_at > now() or public.owns_business(business_id));
create policy stories_write on public.stories for all
  using (public.owns_business(business_id) or public.is_staff())
  with check (public.owns_business(business_id) or public.is_staff());

-- reviews ---------------------------------------------------------------
create policy reviews_read on public.reviews for select
  using (not is_hidden or user_id = auth.uid() or public.is_staff());
create policy reviews_insert on public.reviews for insert
  with check (user_id = auth.uid() and not public.is_banned() and not public.owns_business(business_id));
create policy reviews_update_own on public.reviews for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy reviews_delete on public.reviews for delete
  using (user_id = auth.uid() or public.is_staff());

-- Business owners may only set the reply fields on reviews.
create or replace function public.reply_to_review(p_review uuid, p_reply text)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.reviews r set owner_reply = left(p_reply, 1000), replied_at = now()
  where r.id = p_review and public.owns_business(r.business_id);
  if not found then raise exception 'not_allowed'; end if;
end $$;
grant execute on function public.reply_to_review(uuid, text) to authenticated;

-- listings --------------------------------------------------------------
create policy listings_read on public.listings for select
  using (status = 'active' or user_id = auth.uid() or public.is_staff());
create policy listings_insert on public.listings for insert
  with check (user_id = auth.uid() and not public.is_banned());
create policy listings_update on public.listings for update
  using (user_id = auth.uid() or public.is_staff()) with check (user_id = auth.uid() or public.is_staff());
create policy listings_delete on public.listings for delete
  using (user_id = auth.uid() or public.is_staff());

create policy li_read  on public.listing_images for select using (true);
create policy li_write on public.listing_images for all
  using (exists (select 1 from public.listings l where l.id = listing_id and (l.user_id = auth.uid() or public.is_staff())))
  with check (exists (select 1 from public.listings l where l.id = listing_id and (l.user_id = auth.uid() or public.is_staff())));

-- pharmacy duty + live status ------------------------------------------
create policy duty_read  on public.pharmacy_duty for select using (true);
create policy duty_write on public.pharmacy_duty for all
  using (public.is_staff() or public.owns_business(business_id))
  with check (public.is_staff() or public.owns_business(business_id));

create policy ssr_read   on public.service_status_reports for select using (created_at > now() - interval '2 days' or public.is_staff());
create policy ssr_insert on public.service_status_reports for insert with check (user_id = auth.uid() and not public.is_banned());

-- messaging -------------------------------------------------------------
create policy conv_read   on public.conversations for select using (public.is_conversation_member(id));
create policy conv_insert on public.conversations for insert with check (user_id = auth.uid() and not public.is_banned());
create policy msg_read   on public.messages for select using (public.is_conversation_member(conversation_id));
create policy msg_insert on public.messages for insert
  with check (sender_id = auth.uid() and public.is_conversation_member(conversation_id) and not public.is_banned());
create policy msg_update on public.messages for update
  using (public.is_conversation_member(conversation_id) and sender_id <> auth.uid())
  with check (public.is_conversation_member(conversation_id));

-- notifications (written by security-definer functions / service role) --
create policy notif_read   on public.notifications for select using (user_id = auth.uid());
create policy notif_update on public.notifications for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy notif_delete on public.notifications for delete using (user_id = auth.uid());

create policy push_own on public.push_subscriptions for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- reports / blocks ------------------------------------------------------
create policy reports_insert on public.reports for insert with check (reporter_id = auth.uid() and not public.is_banned());
create policy reports_read   on public.reports for select using (reporter_id = auth.uid() or public.is_staff());
create policy reports_update on public.reports for update using (public.is_staff()) with check (public.is_staff());

create policy blocks_own on public.user_blocks for all
  using (blocker_id = auth.uid()) with check (blocker_id = auth.uid());

-- verification (documents are private; only requester + staff) ---------
create policy vr_insert on public.verification_requests for insert
  with check (requested_by = auth.uid() and public.owns_business(business_id));
create policy vr_read   on public.verification_requests for select
  using (requested_by = auth.uid() or public.is_staff());
create policy vr_update on public.verification_requests for update
  using (public.is_staff()) with check (public.is_staff());

-- subscriptions / ads ---------------------------------------------------
create policy sub_read   on public.subscriptions for select using (public.owns_business(business_id) or public.is_staff());
create policy sub_insert on public.subscriptions for insert
  with check (public.owns_business(business_id) and status = 'pending');
create policy sub_admin  on public.subscriptions for update using (public.is_admin()) with check (public.is_admin());

create policy ads_read  on public.ads for select
  using ((is_active and starts_at <= now() and ends_at > now()) or public.owns_business(business_id) or public.is_staff());
create policy ads_admin on public.ads for all using (public.is_admin()) with check (public.is_admin());

-- Approving a verification request flips the business flag atomically.
create or replace function public.review_verification(p_request uuid, p_approve boolean, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
declare biz uuid;
begin
  if not public.is_staff() then raise exception 'not_allowed'; end if;
  update public.verification_requests
     set status = case when p_approve then 'approved'::verification_status else 'rejected'::verification_status end,
         reviewer_id = auth.uid(), review_note = p_note, reviewed_at = now()
   where id = p_request returning business_id into biz;
  if p_approve and biz is not null then
    update public.businesses set is_verified = true, status = 'active' where id = biz;
  end if;
end $$;
grant execute on function public.review_verification(uuid, boolean, text) to authenticated;

-- =====================================================================
-- Storage buckets + policies
-- =====================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('avatars',        'avatars',        true,  2097152, array['image/webp','image/jpeg','image/png']),
  ('business-media', 'business-media', true,  5242880, array['image/webp','image/jpeg','image/png']),
  ('post-media',     'post-media',     true,  5242880, array['image/webp','image/jpeg','image/png']),
  ('verification',   'verification',   false, 8388608, array['image/webp','image/jpeg','image/png','application/pdf'])
on conflict (id) do nothing;

-- Convention: objects live under "<auth.uid()>/…" so ownership is a path check.
create policy "public read media" on storage.objects for select
  using (bucket_id in ('avatars','business-media','post-media'));
create policy "own folder upload" on storage.objects for insert to authenticated
  with check (bucket_id in ('avatars','business-media','post-media','verification')
              and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own folder modify" on storage.objects for update to authenticated
  using ((storage.foldername(name))[1] = auth.uid()::text);
create policy "own folder delete" on storage.objects for delete to authenticated
  using ((storage.foldername(name))[1] = auth.uid()::text or public.is_staff());
create policy "verification read" on storage.objects for select to authenticated
  using (bucket_id = 'verification' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_staff()));

-- Realtime for chat + notifications.
alter publication supabase_realtime add table public.messages, public.notifications;
