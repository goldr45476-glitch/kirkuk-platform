-- =====================================================================
-- Migration 0010: staff bulk import of places (CSV -> jsonb rows).
-- dry_run = true validates and reports; false inserts the valid, non-duplicate rows.
-- Imported places are published but NOT verified (no "last verified" date).
-- =====================================================================
create or replace function public.import_businesses(p_rows jsonb, p_dry_run boolean default true)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  r jsonb; i int := 0; city record; cat_id int; dist_id int; nm text; ph text; la float8; ln float8; op text; cl text; pl int;
  errs jsonb := '[]'::jsonb; dups jsonb := '[]'::jsonb; ins int := 0; valid int := 0;
  seen text[] := '{}'; key text; existing uuid; ok boolean; bid uuid; code text;
begin
  if not public.is_staff() then raise exception 'not_allowed'; end if;
  if jsonb_typeof(p_rows) <> 'array' then raise exception 'bad_input'; end if;
  if jsonb_array_length(p_rows) > 1000 then raise exception 'too_many_rows'; end if;
  select id, center_lat, center_lng into city from public.cities where slug = 'kirkuk' limit 1;   -- single-city deployment default

  for r in select * from jsonb_array_elements(p_rows) loop
    i := i + 1; ok := true; code := null;
    nm := nullif(trim(r->>'name'), ''); ph := nullif(regexp_replace(coalesce(r->>'phone', ''), '[^0-9+]', '', 'g'), '');
    la := nullif(trim(r->>'lat'), '')::float8; ln := nullif(trim(r->>'lng'), '')::float8;
    op := nullif(trim(r->>'open'), ''); cl := nullif(trim(r->>'close'), ''); pl := nullif(trim(r->>'price_level'), '')::int;

    if nm is null or char_length(nm) < 2 or char_length(nm) > 120 then code := 'name';
    else
      select id into cat_id from public.categories where slug = trim(r->>'category') and is_active;
      if cat_id is null then code := 'category'; end if;
    end if;
    if code is null and nullif(trim(r->>'district'), '') is not null then
      select id into dist_id from public.districts where slug = trim(r->>'district');
      if dist_id is null then code := 'district'; end if;
    else dist_id := null; end if;
    if code is null and ((la is null) <> (ln is null) or la not between -90 and 90 or ln not between -180 and 180) then code := 'coords'; end if;
    if code is null and la is not null and (abs(la - city.center_lat) > 0.8 or abs(ln - city.center_lng) > 0.8) then code := 'far_from_city'; end if;
    if code is null and ((op is null) <> (cl is null) or (op is not null and (op !~ '^\d{2}:\d{2}$' or cl !~ '^\d{2}:\d{2}$'))) then code := 'hours'; end if;
    if code is null and pl is not null and pl not between 1 and 4 then code := 'price'; end if;

    if code is not null then
      errs := errs || jsonb_build_array(jsonb_build_object('row', i, 'code', code, 'name', nm));
      continue;
    end if;

    -- duplicates: against the batch and against existing places (same normalised name and same phone or < 150 m)
    key := public.ar_normalize(nm) || '|' || coalesce(ph, '');
    select b.id into existing from public.businesses b
     where public.ar_normalize(b.name) = public.ar_normalize(nm)
       and ((ph is not null and regexp_replace(coalesce(b.phone, ''), '[^0-9+]', '', 'g') = ph)
            or (la is not null and b.lat is not null and public.distance_km(la, ln, b.lat, b.lng) < 0.15)
            or (ph is null and la is null)) limit 1;
    if existing is not null or key = any(seen) then
      dups := dups || jsonb_build_array(jsonb_build_object('row', i, 'name', nm, 'existing', existing));
      continue;
    end if;
    seen := seen || key; valid := valid + 1;

    if not p_dry_run then
      insert into public.businesses (slug, name, description, phone, whatsapp, address, category_id, district_id, lat, lng, status, price_level, city_id)
      values (public.make_slug(nm), nm, nullif(trim(r->>'description'), ''), ph, ph, nullif(trim(r->>'address'), ''), cat_id, dist_id, la, ln, 'active', pl, city.id)
      returning id into bid;
      if op is not null then
        insert into public.business_hours (business_id, day_of_week, open_time, close_time) select bid, d, op::time, cl::time from generate_series(0, 6) d;
      end if;
      ins := ins + 1;
    end if;
  end loop;

  if not p_dry_run then perform public.audit('import_businesses', 'business', null, jsonb_build_object('inserted', ins, 'errors', jsonb_array_length(errs), 'duplicates', jsonb_array_length(dups))); end if;
  return jsonb_build_object('total', i, 'valid', valid, 'inserted', ins, 'errors', errs, 'duplicates', dups, 'dry_run', p_dry_run);
end $$;
grant execute on function public.import_businesses(jsonb, boolean) to authenticated;
