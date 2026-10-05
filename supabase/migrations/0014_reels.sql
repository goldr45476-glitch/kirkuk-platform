-- =====================================================================
-- Migration 0014: Reels (short vertical videos)
-- =====================================================================

create table public.reels (
  id          uuid primary key default gen_random_uuid(),
  author_id   uuid not null references public.profiles(id) on delete cascade,
  business_id uuid references public.businesses(id) on delete cascade,
  video_url   text not null,
  caption     text check (char_length(caption) <= 300),
  likes_count int not null default 0,
  views_count int not null default 0,
  is_hidden   boolean not null default false,
  created_at  timestamptz not null default now()
);
create index reels_feed_idx on public.reels(created_at desc) where not is_hidden;
create index reels_author_idx on public.reels(author_id, created_at desc);

create table public.reel_likes (
  reel_id    uuid not null references public.reels(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (reel_id, user_id)
);

create or replace function public.tg_reel_likes_count()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then update public.reels set likes_count = likes_count + 1 where id = new.reel_id;
  else update public.reels set likes_count = greatest(likes_count - 1, 0) where id = old.reel_id; end if;
  return null;
end $$;
create trigger reel_likes_count after insert or delete on public.reel_likes
  for each row execute function public.tg_reel_likes_count();

create trigger rl_reels before insert on public.reels
  for each row execute function public.enforce_rate_limit('author_id', '10', '1 day');

-- Views are counted through a definer function so viewers need no write access.
create or replace function public.track_reel_view(p_id uuid)
returns void language sql security definer set search_path = public as $$
  update public.reels set views_count = views_count + 1 where id = p_id and not is_hidden;
$$;
grant execute on function public.track_reel_view(uuid) to anon, authenticated;

-- RLS ------------------------------------------------------------------
alter table public.reels      enable row level security;
alter table public.reel_likes enable row level security;

create policy reels_read on public.reels for select
  using (not is_hidden or author_id = auth.uid() or public.is_staff());
create policy reels_insert on public.reels for insert
  with check (author_id = auth.uid() and not public.is_banned()
              and (business_id is null or public.owns_business(business_id)));
create policy reels_update on public.reels for update
  using (author_id = auth.uid() or public.is_staff())
  with check (author_id = auth.uid() or public.is_staff());
create policy reels_delete on public.reels for delete
  using (author_id = auth.uid() or public.is_staff());

create policy reel_likes_read   on public.reel_likes for select using (true);
create policy reel_likes_insert on public.reel_likes for insert with check (user_id = auth.uid() and not public.is_banned());
create policy reel_likes_delete on public.reel_likes for delete using (user_id = auth.uid());

-- Storage: public bucket for videos (30 MB each), objects under "<auth.uid()>/…"
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('reels', 'reels', true, 31457280, array['video/mp4','video/webm','video/quicktime'])
on conflict (id) do nothing;

create policy "public read reels" on storage.objects for select using (bucket_id = 'reels');
create policy "own folder upload reels" on storage.objects for insert to authenticated
  with check (bucket_id = 'reels' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own folder delete reels" on storage.objects for delete to authenticated
  using (bucket_id = 'reels' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_staff()));
