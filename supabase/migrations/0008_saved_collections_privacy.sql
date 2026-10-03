-- =====================================================================
-- Migration 0008: saved items (places/offers/events/listings), curated
-- collections, and account deletion (privacy).
-- =====================================================================

-- ---------------------------------------------------------------------
-- Favorites: extend to offers and events
-- ---------------------------------------------------------------------
alter table public.favorites
  add column offer_id uuid references public.offers(id) on delete cascade,
  add column event_id uuid references public.events(id) on delete cascade;

do $$
declare c record;
begin
  for c in select conname from pg_constraint where conrelid = 'public.favorites'::regclass and contype = 'c' loop
    execute format('alter table public.favorites drop constraint %I', c.conname);
  end loop;
end $$;
alter table public.favorites add constraint favorites_one_target check (num_nonnulls(business_id, listing_id, offer_id, event_id) = 1);
create unique index favorites_offer_uq on public.favorites(user_id, offer_id) where offer_id is not null;
create unique index favorites_event_uq on public.favorites(user_id, event_id) where event_id is not null;

-- Toggle a save; returns the new state. Records a 'save' analytics event for places/offers/events.
create or replace function public.toggle_save(p_type text, p_id uuid)
returns boolean language plpgsql set search_path = public as $$
declare col text; existed boolean; uid uuid := auth.uid();
begin
  if uid is null then raise exception 'auth'; end if;
  if p_type not in ('business', 'listing', 'offer', 'event') then raise exception 'bad_type'; end if;
  col := p_type || '_id';
  execute format('select exists (select 1 from public.favorites where user_id = $1 and %I = $2)', col) into existed using uid, p_id;
  if existed then
    execute format('delete from public.favorites where user_id = $1 and %I = $2', col) using uid, p_id;
    return false;
  end if;
  execute format('insert into public.favorites (user_id, %I) values ($1, $2)', col) using uid, p_id;
  if p_type in ('business', 'offer', 'event') then perform public.track_event('save', case p_type when 'business' then 'business' else p_type end, p_id); end if;
  return true;
end $$;
grant execute on function public.toggle_save(text, uuid) to authenticated;

-- Everything the caller saved, in one round trip.
create or replace function public.get_saved()
returns jsonb language sql stable set search_path = public as $$
  select jsonb_build_object(
    'places', coalesce((select jsonb_agg(x order by x->>'saved_at' desc) from (
        select jsonb_build_object('id', b.id, 'slug', b.slug, 'name', b.name, 'address', b.address, 'phone', b.phone, 'district_id', b.district_id,
               'rating_avg', b.rating_avg, 'rating_count', b.rating_count, 'is_open', public.is_open_now(b.id), 'closes_at', public.todays_close_time(b.id),
               'saved_at', f.created_at) x
        from public.favorites f join public.businesses b on b.id = f.business_id and b.status = 'active' where f.user_id = auth.uid()) s), '[]'),
    'offers', coalesce((select jsonb_agg(x order by x->>'ends_at') from (
        select jsonb_build_object('id', o.id, 'title', o.title, 'details', o.details, 'ends_at', o.ends_at, 'ended', o.ends_at <= now(),
               'business_slug', b.slug, 'business_name', b.name) x
        from public.favorites f join public.offers o on o.id = f.offer_id join public.businesses b on b.id = o.business_id
        where f.user_id = auth.uid() and o.status = 'published') s), '[]'),
    'events', coalesce((select jsonb_agg(x order by x->>'starts_at') from (
        select jsonb_build_object('id', e.id, 'title', e.title, 'details', e.details, 'starts_at', e.starts_at, 'ends_at', e.ends_at,
               'category', e.category, 'venue_name', coalesce(e.venue_name, b.name), 'venue_slug', b.slug, 'past', coalesce(e.ends_at, e.starts_at + interval '3 hours') < now()) x
        from public.favorites f join public.events e on e.id = f.event_id and e.status = 'published' left join public.businesses b on b.id = e.venue_business_id
        where f.user_id = auth.uid()) s), '[]'),
    'listings', coalesce((select jsonb_agg(x order by x->>'saved_at' desc) from (
        select jsonb_build_object('id', l.id, 'kind', l.kind, 'title', l.title, 'price', l.price, 'currency', l.currency, 'details', l.details,
               'district_id', l.district_id, 'status', l.status, 'created_at', l.created_at, 'saved_at', f.created_at,
               'image', (select i.url from public.listing_images i where i.listing_id = l.id order by i.sort_order limit 1)) x
        from public.favorites f join public.listings l on l.id = f.listing_id and l.status <> 'hidden' where f.user_id = auth.uid()) s), '[]')
  );
$$;
grant execute on function public.get_saved() to authenticated;

-- Ids saved by the caller, per kind (to render filled hearts without N queries).
create or replace function public.saved_ids()
returns jsonb language sql stable set search_path = public as $$
  select jsonb_build_object(
    'business', coalesce((select jsonb_agg(business_id) from public.favorites where user_id = auth.uid() and business_id is not null), '[]'),
    'offer',    coalesce((select jsonb_agg(offer_id)    from public.favorites where user_id = auth.uid() and offer_id is not null), '[]'),
    'event',    coalesce((select jsonb_agg(event_id)    from public.favorites where user_id = auth.uid() and event_id is not null), '[]'),
    'listing',  coalesce((select jsonb_agg(listing_id)  from public.favorites where user_id = auth.uid() and listing_id is not null), '[]'));
$$;
grant execute on function public.saved_ids() to authenticated;

-- ---------------------------------------------------------------------
-- Curated collections ("أفضل 5 أماكن فطور")
-- ---------------------------------------------------------------------
create table public.collections (
  id          uuid primary key default gen_random_uuid(),
  city_id     int not null default 1 references public.cities(id),
  slug        text not null unique check (slug ~ '^[a-z0-9-]{3,60}$'),
  title       text not null check (char_length(title) between 3 and 120),
  description text check (char_length(description) <= 500),
  status      text not null default 'draft' check (status in ('draft', 'published')),
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);
create table public.collection_items (
  collection_id uuid not null references public.collections(id) on delete cascade,
  business_id   uuid not null references public.businesses(id) on delete cascade,
  position      int not null default 0,
  note          text check (char_length(note) <= 200),
  primary key (collection_id, business_id)
);
create index collection_items_idx on public.collection_items(collection_id, position);
alter table public.collections      enable row level security;
alter table public.collection_items enable row level security;
create policy col_read  on public.collections for select using (status = 'published' or public.is_staff());
create policy col_write on public.collections for all using (public.is_staff()) with check (public.is_staff());
create policy ci_read   on public.collection_items for select
  using (exists (select 1 from public.collections c where c.id = collection_id and (c.status = 'published' or public.is_staff())));
create policy ci_write  on public.collection_items for all using (public.is_staff()) with check (public.is_staff());

create or replace function public.get_collection(p_slug text)
returns jsonb language sql stable set search_path = public as $$
  select jsonb_build_object(
    'id', c.id, 'slug', c.slug, 'title', c.title, 'description', c.description, 'status', c.status,
    'items', coalesce((select jsonb_agg(jsonb_build_object(
        'id', b.id, 'slug', b.slug, 'name', b.name, 'address', b.address, 'phone', b.phone, 'whatsapp', b.whatsapp, 'district_id', b.district_id,
        'rating_avg', b.rating_avg, 'rating_count', b.rating_count, 'is_verified', b.is_verified, 'price_level', b.price_level,
        'is_open', public.is_open_now(b.id), 'closes_at', public.todays_close_time(b.id), 'note', i.note, 'logo_url', b.logo_url) order by i.position, b.name)
      from public.collection_items i join public.businesses b on b.id = i.business_id and b.status = 'active' where i.collection_id = c.id), '[]'))
  from public.collections c where c.slug = p_slug and (c.status = 'published' or public.is_staff());
$$;
grant execute on function public.get_collection(text) to anon, authenticated;

create or replace function public.list_collections(p_city int, p_limit int default 20)
returns table (id uuid, slug text, title text, description text, item_count bigint, preview text[])
language sql stable set search_path = public as $$
  select c.id, c.slug, c.title, c.description,
         (select count(*) from public.collection_items i join public.businesses b on b.id = i.business_id and b.status = 'active' where i.collection_id = c.id),
         (select array_agg(b.name order by i.position) from (select * from public.collection_items where collection_id = c.id order by position limit 3) i join public.businesses b on b.id = i.business_id)
  from public.collections c
  where c.city_id = p_city and c.status = 'published'
  order by c.sort_order, c.created_at desc
  limit least(greatest(p_limit, 1), 50);
$$;
grant execute on function public.list_collections(int, int) to anon, authenticated;

-- ---------------------------------------------------------------------
-- Privacy: delete my account (profile + content cascade; businesses stay, orphaned)
-- ---------------------------------------------------------------------
create or replace function public.delete_my_account()
returns void language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'auth'; end if;
  if (select role from public.profiles where id = uid) = 'admin'
     and (select count(*) from public.profiles where role = 'admin') = 1 then
    raise exception 'last_admin';
  end if;
  insert into public.audit_log (actor_id, action, entity, entity_id) values (uid, 'delete_account', 'user', uid::text);
  delete from auth.users where id = uid;   -- profiles/posts/reviews/... cascade; businesses.owner_id -> null
end $$;
grant execute on function public.delete_my_account() to authenticated;
