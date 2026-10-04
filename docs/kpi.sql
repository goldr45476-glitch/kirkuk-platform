-- =====================================================================
-- مؤشرات النجاح (KPIs) — شغّلها في Supabase SQL Editor (قراءة فقط).
-- كل الأوقات بتوقيت بغداد. المصدر: analytics_events + الجداول الأساسية.
-- ملاحظة: الزوار غير المسجَّلين لا يملكون معرّفاً، فالنشطون أسبوعياً = المسجَّلون فقط (حدّ أدنى).
-- =====================================================================

-- 1) النشطون أسبوعياً (WAU) آخر 8 أسابيع
select date_trunc('week', created_at at time zone 'Asia/Baghdad')::date as week,
       count(distinct user_id) as wau
from public.analytics_events
where user_id is not null and created_at > now() - interval '8 weeks'
group by 1 order by 1;

-- 2) العائدون: نسبة مستخدمي الأسبوع السابق الذين عادوا هذا الأسبوع
with w as (
  select user_id,
         bool_or(created_at >= date_trunc('week', now()) ) as this_week,
         bool_or(created_at >= date_trunc('week', now()) - interval '1 week' and created_at < date_trunc('week', now())) as last_week
  from public.analytics_events where user_id is not null and created_at > now() - interval '2 weeks' group by 1)
select count(*) filter (where last_week) as last_week_users,
       count(*) filter (where last_week and this_week) as returned,
       round(100.0 * count(*) filter (where last_week and this_week) / nullif(count(*) filter (where last_week), 0), 1) as return_pct
from w;

-- 3) إجراءات التواصل لكل مشاهدة (هدف: ارتفاع مستمر) — أسبوعياً
select date_trunc('week', created_at at time zone 'Asia/Baghdad')::date as week,
       count(*) filter (where event = 'view') as views,
       count(*) filter (where event in ('call', 'whatsapp', 'directions')) as contact_actions,
       round(100.0 * count(*) filter (where event in ('call', 'whatsapp', 'directions')) / nullif(count(*) filter (where event = 'view'), 0), 1) as actions_per_100_views
from public.analytics_events
where target_type = 'business' and created_at > now() - interval '8 weeks'
group by 1 order by 1;

-- 4) أكثر الأنشطة تواصلاً آخر 30 يوماً
select b.name, count(*) filter (where e.event in ('call', 'whatsapp')) as calls,
       count(*) filter (where e.event = 'directions') as directions,
       count(*) filter (where e.event = 'view') as views
from public.analytics_events e join public.businesses b on b.id = e.target_id
where e.target_type = 'business' and e.created_at > now() - interval '30 days'
group by b.name order by calls desc, views desc limit 20;

-- 5) جودة البيانات: المنشور / المتحقق / القديم (هدف الإطلاق: 400 مكان متحقق منه)
select count(*) filter (where status = 'active') as published,
       count(*) filter (where status = 'active' and last_verified_at is not null) as verified_ever,
       count(*) filter (where status = 'active' and last_verified_at > now() - interval '60 days') as verified_last_60d,
       count(*) filter (where status = 'active' and last_verified_at is null) as never_verified,
       round(100.0 * count(*) filter (where status = 'active' and last_verified_at > now() - interval '60 days') / nullif(count(*) filter (where status = 'active'), 0), 1) as fresh_pct
from public.businesses;

-- 6) تغطية الأقسام (أين ينقصنا مكان؟)
select coalesce(p.name_ar, c.name_ar) as category, count(*) as places,
       count(*) filter (where b.last_verified_at > now() - interval '60 days') as fresh
from public.businesses b
join public.categories c on c.id = b.category_id left join public.categories p on p.id = c.parent_id
where b.status = 'active' group by 1 order by places desc;

-- 7) المطالبات بالصفحات والاستعداد للدفع (هدف 90 يوماً: 50 مطالبة، 10 أعمال مستعدة للدفع)
select (select count(*) from public.claims where status = 'approved') as claims_approved,
       (select count(*) from public.claims where status = 'pending')  as claims_pending,
       (select count(*) from public.subscriptions where status = 'pending') as payment_requests,
       (select count(*) from public.subscriptions where status = 'active')  as paying_now;

-- 8) نمو المحتوى المجتمعي الأسبوعي (اقتراحات أماكن + تقييمات)
with s as (select date_trunc('week', created_at at time zone 'Asia/Baghdad')::date w, count(*) c from public.submissions where created_at > now() - interval '8 weeks' group by 1),
     r as (select date_trunc('week', created_at at time zone 'Asia/Baghdad')::date w, count(*) c from public.reviews where created_at > now() - interval '8 weeks' group by 1)
select coalesce(s.w, r.w) as week, coalesce(s.c, 0) as suggestions, coalesce(r.c, 0) as reviews
from s full join r on r.w = s.w order by 1;

-- 9) أداء الإعلانات الممولة
select title, placement, impressions, clicks, round(100.0 * clicks / nullif(impressions, 0), 2) as ctr_pct from public.ads order by impressions desc;

-- 10) طابور المراجعة (يجب أن يبقى قصيراً)
select (select count(*) from public.submissions where status = 'pending') as submissions,
       (select count(*) from public.claims where status = 'pending') as claims,
       (select count(*) from public.reports where status = 'open') as reports,
       (select count(*) from public.events where status = 'pending') as events,
       (select min(created_at) from public.reports where status = 'open') as oldest_open_report;
