-- =====================================================================
-- Migration 0007: moderation, staff tools, owner analytics
-- =====================================================================

create or replace function public.make_slug(p_name text)
returns text language plpgsql volatile set search_path = public as $$
declare base text; candidate text; n int := 0;
begin
  base := trim(both '-' from regexp_replace(lower(coalesce(p_name, '')), '[^a-z0-9]+', '-', 'g'));
  if base = '' or base is null then base := 'place-' || substr(md5(random()::text), 1, 8); end if;
  candidate := base;
  while exists (select 1 from public.businesses where slug = candidate) loop
    n := n + 1; candidate := base || '-' || substr(md5(random()::text), 1, 4);
    exit when n > 20;
  end loop;
  return candidate;
end $$;

create or replace function public.audit(p_action text, p_entity text, p_id text, p_detail jsonb default '{}')
returns void language sql security definer set search_path = public as $$
  insert into public.audit_log (actor_id, action, entity, entity_id, detail) values (auth.uid(), p_action, p_entity, p_id, coalesce(p_detail, '{}'));
$$;
revoke execute on function public.audit(text, text, text, jsonb) from public, anon, authenticated;

-- notify helper (system notifications with a machine-readable event)
create or replace function public._notify_system(p_user uuid, p_event text, p_business uuid default null, p_excerpt text default null)
returns void language sql security definer set search_path = public as $$
  insert into public.notifications (user_id, type, actor_id, business_id, data)
  values (p_user, 'system', auth.uid(), p_business, jsonb_build_object('event', p_event, 'excerpt', p_excerpt));
$$;
revoke execute on function public._notify_system(uuid, text, uuid, text) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- Submissions (new place / edit)
-- ---------------------------------------------------------------------
create or replace function public.approve_submission(p_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare s public.submissions; bid uuid; pl jsonb; owner_uid uuid;
begin
  if not public.is_staff() then raise exception 'not_allowed'; end if;
  select * into s from public.submissions where id = p_id and status = 'pending' for update;
  if not found then raise exception 'not_found'; end if;
  pl := s.payload;
  if s.type = 'new_place' then
    owner_uid := case when coalesce((pl->>'is_owner')::boolean, false) then s.user_id end;
    insert into public.businesses (slug, name, description, phone, whatsapp, address, category_id, district_id, lat, lng, status, owner_id, city_id)
    values (public.make_slug(pl->>'name'), pl->>'name', nullif(pl->>'description', ''), nullif(pl->>'phone', ''), nullif(pl->>'phone', ''),
            nullif(pl->>'address', ''), (pl->>'category_id')::int, nullif(pl->>'district_id', '')::int,
            nullif(pl->>'lat', '')::float8, nullif(pl->>'lng', '')::float8, 'active', owner_uid, s.city_id)
    returning id into bid;
    if owner_uid is not null then update public.profiles set role = 'owner' where id = owner_uid and role = 'user'; end if;
  else
    bid := s.business_id;
    update public.businesses set
      name = coalesce(nullif(pl->>'name', ''), name), description = coalesce(nullif(pl->>'description', ''), description),
      phone = coalesce(nullif(pl->>'phone', ''), phone), address = coalesce(nullif(pl->>'address', ''), address),
      lat = coalesce(nullif(pl->>'lat', '')::float8, lat), lng = coalesce(nullif(pl->>'lng', '')::float8, lng)
    where id = bid;
  end if;
  update public.submissions set status = 'approved', reviewed_by = auth.uid(), reviewed_at = now() where id = p_id;
  perform public._notify_system(s.user_id, 'submission_approved', bid, pl->>'name');
  perform public.audit('approve_submission', 'submission', p_id::text, jsonb_build_object('business', bid));
  return bid;
end $$;

create or replace function public.reject_submission(p_id uuid, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
declare s public.submissions;
begin
  if not public.is_staff() then raise exception 'not_allowed'; end if;
  update public.submissions set status = 'rejected', reviewed_by = auth.uid(), reviewed_at = now(), review_note = left(p_note, 300)
   where id = p_id and status = 'pending' returning * into s;
  if not found then raise exception 'not_found'; end if;
  perform public._notify_system(s.user_id, 'submission_rejected', null, s.payload->>'name');
  perform public.audit('reject_submission', 'submission', p_id::text);
end $$;

-- Claims: wrap review_claim with a notification
create or replace function public.review_claim(p_claim uuid, p_approve boolean)
returns void language plpgsql security definer set search_path = public as $$
declare c public.claims;
begin
  if not public.is_staff() then raise exception 'not_allowed'; end if;
  update public.claims set status = case when p_approve then 'approved' else 'rejected' end, reviewed_by = auth.uid()
   where id = p_claim and status = 'pending' returning * into c;
  if not found then raise exception 'not_found'; end if;
  if p_approve then
    update public.businesses set owner_id = c.user_id where id = c.business_id;
    update public.profiles set role = 'owner' where id = c.user_id and role = 'user';
  end if;
  perform public._notify_system(c.user_id, case when p_approve then 'claim_approved' else 'claim_rejected' end, c.business_id, null);
  perform public.audit('review_claim', 'claim', p_claim::text, jsonb_build_object('approved', p_approve));
end $$;

-- ---------------------------------------------------------------------
-- Reports / content moderation
-- ---------------------------------------------------------------------
create or replace function public.moderate_report(p_report uuid, p_action text)   -- dismiss | resolve | hide
returns void language plpgsql security definer set search_path = public as $$
declare r public.reports;
begin
  if not public.is_staff() then raise exception 'not_allowed'; end if;
  if p_action not in ('dismiss', 'resolve', 'hide') then raise exception 'bad_action'; end if;
  select * into r from public.reports where id = p_report;
  if not found then raise exception 'not_found'; end if;
  if p_action = 'hide' then
    case r.target_type
      when 'post'    then update public.posts    set is_hidden = true where id = r.target_id;
      when 'comment' then update public.comments set is_hidden = true where id = r.target_id;
      when 'review'  then update public.reviews  set is_hidden = true where id = r.target_id;
      when 'listing' then update public.listings set status = 'hidden' where id = r.target_id;
      when 'business' then update public.businesses set status = 'suspended' where id = r.target_id;
      else null;
    end case;
  end if;
  update public.reports set status = case p_action when 'dismiss' then 'dismissed'::report_status else 'resolved'::report_status end,
                            handled_by = auth.uid() where id = p_report;
  perform public.audit('moderate_report', 'report', p_report::text, jsonb_build_object('action', p_action, 'target', r.target_type || ':' || r.target_id));
end $$;

create or replace function public.moderate_event(p_event uuid, p_status text)   -- published | hidden
returns void language plpgsql security definer set search_path = public as $$
declare e public.events;
begin
  if not public.is_staff() then raise exception 'not_allowed'; end if;
  if p_status not in ('published', 'hidden') then raise exception 'bad_status'; end if;
  update public.events set status = p_status where id = p_event returning * into e;
  if not found then raise exception 'not_found'; end if;
  if e.created_by is not null then perform public._notify_system(e.created_by, case when p_status = 'published' then 'event_published' else 'event_hidden' end, null, e.title); end if;
  perform public.audit('moderate_event', 'event', p_event::text, jsonb_build_object('status', p_status));
end $$;

-- ---------------------------------------------------------------------
-- Business / user administration
-- ---------------------------------------------------------------------
create or replace function public.set_business_state(
  p_business uuid, p_status text default null, p_verified boolean default null, p_featured_days int default null
) returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_staff() then raise exception 'not_allowed'; end if;
  if p_status is not null and p_status not in ('pending', 'active', 'suspended') then raise exception 'bad_status'; end if;
  update public.businesses set
    status = coalesce(p_status::business_status, status),
    is_verified = coalesce(p_verified, is_verified),
    last_verified_at = case when p_verified is true then now() else last_verified_at end,
    verified_by = case when p_verified is true then auth.uid() else verified_by end,
    is_featured = case when p_featured_days is null then is_featured else p_featured_days > 0 end,
    featured_until = case when p_featured_days is null then featured_until when p_featured_days > 0 then now() + make_interval(days => p_featured_days) else null end
  where id = p_business;
  if not found then raise exception 'not_found'; end if;
  perform public.audit('set_business_state', 'business', p_business::text,
    jsonb_build_object('status', p_status, 'verified', p_verified, 'featured_days', p_featured_days));
end $$;

create or replace function public.admin_set_user(p_user uuid, p_role text default null, p_banned boolean default null)
returns void language plpgsql security definer set search_path = public as $$
declare target public.profiles;
begin
  if not public.is_staff() then raise exception 'not_allowed'; end if;
  select * into target from public.profiles where id = p_user;
  if not found then raise exception 'not_found'; end if;
  if p_user = auth.uid() then raise exception 'cannot_modify_self'; end if;
  if p_role is not null then
    if not public.is_admin() then raise exception 'admin_only'; end if;
    if p_role not in ('user', 'owner', 'moderator', 'admin') then raise exception 'bad_role'; end if;
  end if;
  if p_banned is not null and target.role = 'admin' and not public.is_admin() then raise exception 'not_allowed'; end if;
  update public.profiles set role = coalesce(p_role::user_role, role), is_banned = coalesce(p_banned, is_banned) where id = p_user;
  perform public.audit('admin_set_user', 'user', p_user::text, jsonb_build_object('role', p_role, 'banned', p_banned));
end $$;

-- Fast data entry for the field team (verified on the spot, hours preset for every day).
create or replace function public.staff_add_business(p jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare bid uuid; o time; c time;
begin
  if not public.is_staff() then raise exception 'not_allowed'; end if;
  insert into public.businesses (slug, name, description, phone, whatsapp, address, category_id, district_id, lat, lng, status,
                                 is_verified, last_verified_at, verified_by, price_level)
  values (public.make_slug(p->>'name'), p->>'name', nullif(p->>'description', ''), nullif(p->>'phone', ''), coalesce(nullif(p->>'whatsapp', ''), nullif(p->>'phone', '')),
          nullif(p->>'address', ''), (p->>'category_id')::int, nullif(p->>'district_id', '')::int,
          nullif(p->>'lat', '')::float8, nullif(p->>'lng', '')::float8, 'active', true, now(), auth.uid(), nullif(p->>'price_level', '')::smallint)
  returning id into bid;
  if nullif(p->>'open', '') is not null and nullif(p->>'close', '') is not null then
    o := (p->>'open')::time; c := (p->>'close')::time;
    insert into public.business_hours (business_id, day_of_week, open_time, close_time) select bid, d, o, c from generate_series(0, 6) d;
  end if;
  perform public.audit('staff_add_business', 'business', bid::text);
  return bid;
end $$;

-- ---------------------------------------------------------------------
-- Owner analytics & admin overview
-- ---------------------------------------------------------------------
create or replace function public.business_stats(p_business uuid, p_days int default 30)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare d int := least(greatest(p_days, 1), 180); res jsonb;
begin
  if not (public.owns_business(p_business) or public.is_staff()) then raise exception 'not_allowed'; end if;
  select jsonb_build_object(
    'days', d,
    'totals', coalesce((select jsonb_object_agg(event, c) from (
        select event, count(*) c from public.analytics_events
        where target_type = 'business' and target_id = p_business and created_at > now() - make_interval(days => d) group by event) t), '{}'::jsonb),
    'daily', (select jsonb_agg(jsonb_build_object('day', g.day, 'views', coalesce(x.views, 0), 'contacts', coalesce(x.contacts, 0), 'directions', coalesce(x.dirs, 0)) order by g.day)
              from (select (((now() at time zone 'Asia/Baghdad')::date) - i) as day from generate_series(d - 1, 0, -1) i) g
              left join (select (created_at at time zone 'Asia/Baghdad')::date as day,
                                count(*) filter (where event = 'view') views,
                                count(*) filter (where event in ('call', 'whatsapp')) contacts,
                                count(*) filter (where event = 'directions') dirs
                         from public.analytics_events
                         where target_type = 'business' and target_id = p_business and created_at > now() - make_interval(days => d + 1) group by 1) x on x.day = g.day),
    'followers', (select followers_count from public.businesses where id = p_business),
    'rating_avg', (select rating_avg from public.businesses where id = p_business),
    'rating_count', (select rating_count from public.businesses where id = p_business)
  ) into res;
  return res;
end $$;
grant execute on function public.business_stats(uuid, int) to authenticated;

create or replace function public.admin_overview()
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_staff() then raise exception 'not_allowed'; end if;
  return jsonb_build_object(
    'pending_submissions', (select count(*) from public.submissions where status = 'pending'),
    'pending_claims',      (select count(*) from public.claims where status = 'pending'),
    'open_reports',        (select count(*) from public.reports where status = 'open'),
    'pending_events',      (select count(*) from public.events where status = 'pending'),
    'pending_businesses',  (select count(*) from public.businesses where status = 'pending'),
    'businesses',          (select count(*) from public.businesses where status = 'active'),
    'unverified',          (select count(*) from public.businesses where status = 'active' and last_verified_at is null),
    'stale',               (select count(*) from public.businesses where status = 'active' and last_verified_at < now() - interval '60 days'),
    'users',               (select count(*) from public.profiles),
    'weekly_active',       (select count(distinct user_id) from public.analytics_events where user_id is not null and created_at > now() - interval '7 days'),
    'events_7d',           (select count(*) from public.analytics_events where created_at > now() - interval '7 days'),
    'contacts_7d',         (select count(*) from public.analytics_events where event in ('call', 'whatsapp', 'directions') and created_at > now() - interval '7 days')
  );
end $$;

grant execute on function public.approve_submission(uuid) to authenticated;
grant execute on function public.reject_submission(uuid, text) to authenticated;
grant execute on function public.review_claim(uuid, boolean) to authenticated;
grant execute on function public.moderate_report(uuid, text) to authenticated;
grant execute on function public.moderate_event(uuid, text) to authenticated;
grant execute on function public.set_business_state(uuid, text, boolean, int) to authenticated;
grant execute on function public.admin_set_user(uuid, text, boolean) to authenticated;
grant execute on function public.staff_add_business(jsonb) to authenticated;
grant execute on function public.admin_overview() to authenticated;
