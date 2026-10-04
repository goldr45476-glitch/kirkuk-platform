-- Staff-only health snapshot for Web Push (shown at /admin/push).
create or replace function public.admin_push_stats()
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_staff() then raise exception 'not_allowed'; end if;
  return jsonb_build_object(
    'subscribed_users', (select count(distinct user_id) from public.push_subscriptions),
    'devices',          (select count(*) from public.push_subscriptions),
    'backlog',          (select count(*) from public.notifications where pushed_at is null and read_at is null and created_at > now() - interval '6 hours'
                           and exists (select 1 from public.push_subscriptions s where s.user_id = notifications.user_id)),
    'oldest_backlog_min', (select coalesce(round(extract(epoch from now() - min(created_at)) / 60), 0) from public.notifications n
                           where n.pushed_at is null and n.read_at is null and n.created_at > now() - interval '6 hours'
                             and exists (select 1 from public.push_subscriptions s where s.user_id = n.user_id)),
    'pushed_24h',       (select count(*) from public.notifications where pushed_at > now() - interval '24 hours'),
    'last_pushed_at',   (select max(pushed_at) from public.notifications),
    'opted_out_social', (select count(*) from public.notification_prefs where not push_social),
    'prefs_rows',       (select count(*) from public.notification_prefs)
  );
end $$;
revoke execute on function public.admin_push_stats() from public, anon;
grant execute on function public.admin_push_stats() to authenticated;
