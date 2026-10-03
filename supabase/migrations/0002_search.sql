-- =====================================================================
-- Migration 0002: advanced business search (typo/tashkeel tolerant)
-- =====================================================================

create or replace function public.search_businesses(
  p_q          text    default null,
  p_category   text    default null,     -- category slug (includes its children)
  p_district   int     default null,
  p_min_rating numeric default 0,
  p_open_now   boolean default false,
  p_verified   boolean default false,
  p_lat        float8  default null,
  p_lng        float8  default null,
  p_sort       text    default 'relevance',  -- relevance | nearest | rating | newest
  p_limit      int     default 24,
  p_offset     int     default 0
)
returns table (
  id uuid, slug text, name text, description text, phone text, whatsapp text, address text,
  is_verified boolean, is_featured boolean, rating_avg numeric, rating_count int,
  lat float8, lng float8, district_id int, category_id int, logo_url text,
  is_open boolean, distance_km float8, total_count bigint
)
language sql stable
set search_path = public
set pg_trgm.word_similarity_threshold = '0.4'
as $$
  with q as (select nullif(trim(public.ar_normalize(p_q)), '') as qn),
  cats as (
    select c.id from public.categories c
    where p_category is not null
      and (c.slug = p_category or c.parent_id = (select x.id from public.categories x where x.slug = p_category))
  ),
  base as (
    select b.*,
      case when p_lat is not null and p_lng is not null and b.lat is not null
           then public.distance_km(p_lat, p_lng, b.lat, b.lng) end as dist,
      public.is_open_now(b.id) as open_now,
      (b.is_featured and (b.featured_until is null or b.featured_until > now())) as feat,
      case when q.qn is null then 0
           else greatest(word_similarity(q.qn, b.search_norm),
                         case when b.search_norm like '%' || q.qn || '%' then 1 else 0 end) end as sc
    from public.businesses b, q
    where b.status = 'active'
      and (p_category is null or b.category_id in (select cid.id from cats cid))
      and (p_district is null or b.district_id = p_district)
      and b.rating_avg >= coalesce(p_min_rating, 0)
      and (not p_verified or b.is_verified)
      and (q.qn is null or b.search_norm like '%' || q.qn || '%' or q.qn <% b.search_norm)
  )
  select base.id, base.slug, base.name, base.description, base.phone, base.whatsapp, base.address,
         base.is_verified, base.feat, base.rating_avg, base.rating_count,
         base.lat, base.lng, base.district_id, base.category_id, base.logo_url,
         base.open_now, base.dist, count(*) over()
  from base
  where (not p_open_now or base.open_now)
  order by
    case when p_sort = 'nearest'   then base.dist end asc nulls last,
    case when p_sort = 'rating'    then base.rating_avg end desc,
    case when p_sort = 'newest'    then base.created_at end desc,
    case when p_sort = 'relevance' then base.feat::int end desc,
    base.sc desc, base.rating_avg desc, base.name
  limit least(greatest(p_limit, 1), 100) offset greatest(p_offset, 0);
$$;
grant execute on function public.search_businesses(text,text,int,numeric,boolean,boolean,float8,float8,text,int,int) to anon, authenticated;
