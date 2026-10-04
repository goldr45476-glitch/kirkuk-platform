-- Success KPIs for the admin dashboard (/admin/kpis). Mirrors docs/kpi.sql. Staff only.
create or replace function public.admin_kpis()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare r jsonb;
begin
  if not public.is_staff() then raise exception 'not_allowed'; end if;
  select jsonb_build_object(
    'weekly', coalesce((
      select jsonb_agg(jsonb_build_object('week', w, 'wau', wau, 'views', views, 'contact', contact) order by w)
      from (select date_trunc('week', created_at at time zone 'Asia/Baghdad')::date w,
                   count(distinct user_id) filter (where user_id is not null) wau,
                   count(*) filter (where event = 'view' and target_type = 'business') views,
                   count(*) filter (where event in ('call','whatsapp','directions') and target_type = 'business') contact
            from public.analytics_events where created_at > now() - interval '8 weeks' group by 1) x), '[]'::jsonb),
    'returning', (
      with w as (select user_id,
                        bool_or(created_at >= date_trunc('week', now())) this_week,
                        bool_or(created_at >= date_trunc('week', now()) - interval '1 week' and created_at < date_trunc('week', now())) last_week
                 from public.analytics_events where user_id is not null and created_at > now() - interval '2 weeks' group by 1)
      select jsonb_build_object('last_week_users', count(*) filter (where last_week), 'returned', count(*) filter (where last_week and this_week)) from w),
    'data', (select jsonb_build_object(
        'published', count(*) filter (where status = 'active'),
        'verified_60d', count(*) filter (where status = 'active' and last_verified_at > now() - interval '60 days'),
        'never_verified', count(*) filter (where status = 'active' and last_verified_at is null)) from public.businesses),
    'money', jsonb_build_object(
        'claims_approved', (select count(*) from public.claims where status = 'approved'),
        'claims_pending',  (select count(*) from public.claims where status = 'pending'),
        'payment_requests',(select count(*) from public.subscriptions where status = 'pending'),
        'paying_now',      (select count(*) from public.subscriptions where status = 'active')),
    'queue', jsonb_build_object(
        'submissions', (select count(*) from public.submissions where status = 'pending'),
        'claims',      (select count(*) from public.claims where status = 'pending'),
        'reports',     (select count(*) from public.reports where status = 'open'),
        'events',      (select count(*) from public.events where status = 'pending'),
        'oldest_open_report', (select min(created_at) from public.reports where status = 'open')),
    'top_places', coalesce((
      select jsonb_agg(jsonb_build_object('slug', slug, 'name', name, 'calls', calls, 'directions', dirs, 'views', views))
      from (select b.slug, b.name,
                   count(*) filter (where e.event in ('call','whatsapp')) calls,
                   count(*) filter (where e.event = 'directions') dirs,
                   count(*) filter (where e.event = 'view') views
            from public.analytics_events e join public.businesses b on b.id = e.target_id
            where e.target_type = 'business' and e.created_at > now() - interval '30 days'
            group by b.slug, b.name order by calls desc, views desc limit 10) t), '[]'::jsonb)
  ) into r;
  return r;
end $$;
revoke execute on function public.admin_kpis() from public, anon;
grant execute on function public.admin_kpis() to authenticated;
