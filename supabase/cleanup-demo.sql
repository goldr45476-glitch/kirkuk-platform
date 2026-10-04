-- =====================================================================
-- Removes ONLY the demo content created by supabase/seed.sql.
-- Keeps reference data (categories, districts, plans, amenities, cities) and any real data.
--
-- Usage (SQL editor):   set app.confirm_cleanup = 'yes';   then run this file.
-- Safe to re-run. Review the counts printed at the end.
-- =====================================================================
do $$
begin
  if coalesce(current_setting('app.confirm_cleanup', true), '') <> 'yes' then
    raise exception 'Refusing to run: first execute  set app.confirm_cleanup = ''yes'';';
  end if;
end $$;

drop table if exists _demo_biz;
create temp table _demo_biz as select id from public.businesses where slug in (
  'mutaam-al-qala', 'kabab-shorja', 'cafe-citadel', 'cafe-asri', 'burger-wasiti', 'afran-kirkuk', 'lc-electronics', 'gold-qaysariya', 'bayt-athath', 'azadi-mall', 'kirkuk-mall', 'hospital-azadi', 'clinic-asri', 'lab-shifa', 'dental-smile', 'pharm-amal', 'pharm-noor', 'pharm-shifa24', 'pharm-qoriya', 'workshop-askari', 'tire-alamin', 'carwash-pearl', 'motors-kirkuk', 'moto-speed', 'water-nahr', 'water-safa', 'fuel-asri', 'fuel-tisin', 'school-future', 'institute-lang', 'electrician-ali', 'plumber-hawre', 'ac-cool', 'civil-status'
);

delete from public.analytics_events where target_type = 'business' and target_id in (select id from _demo_biz);
delete from public.events where title in ('أمسية موسيقى تراثية كركوكية', 'يوم الطفل المفتوح', 'ورشة مهارات المقابلات الوظيفية') and created_by is null;
delete from public.collections where slug in ('breakfast-spots', 'quiet-study', 'open-late', 'family-weekend', 'draft-example');
delete from public.businesses where id in (select id from _demo_biz);            -- cascades hours, products, reviews, offers, ads, duty, amenities...
delete from auth.users where id::text like '00000000-0000-0000-0000-0000000000d%';  -- demo users (+ their listings/reviews via cascade)

select (select count(*) from public.businesses) as businesses_left,
       (select count(*) from public.listings)   as listings_left,
       (select count(*) from public.collections) as collections_left,
       (select count(*) from public.categories) as categories_kept,
       (select count(*) from public.districts)  as districts_kept;

drop table if exists _demo_biz;
