import { cache } from "react";
import { supabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import type { ListingCardRow, ListingDetail, ListingFilters, ReviewRow, ServiceStatusRow, Business, BusinessDetail, BusinessHour, Category, CommentRow, District, FeedPost, MapBusiness, NotificationRow, Product, Profile, SearchParams, StoryRing } from "@/lib/types";

/** Current auth user's profile, or null (guest / not configured). */
export const getCurrentProfile = cache(async (): Promise<Profile | null> => {
  if (!supabaseConfigured) return null;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data } = await supabase.from("profiles").select("*").eq("id", auth.user.id).single();
  return (data as Profile) ?? null;
});

export const getCategories = cache(async (): Promise<Category[]> => {
  if (!supabaseConfigured) return [];
  const supabase = await createClient();
  const { data } = await supabase.from("categories").select("*").eq("is_active", true).order("sort_order");
  return (data as Category[]) ?? [];
});

export const getDistricts = cache(async (): Promise<District[]> => {
  if (!supabaseConfigured) return [];
  const supabase = await createClient();
  const { data } = await supabase.from("districts").select("*").order("sort_order");
  return (data as District[]) ?? [];
});

const BUSINESS_COLS =
  "id, slug, name, description, phone, whatsapp, address, is_verified, is_featured, rating_avg, rating_count, district:districts(name_ar,name_ku,name_tr,name_en)";

export async function getBusinessesByCategoryIds(ids: number[], limit = 40): Promise<Business[]> {
  if (!supabaseConfigured || ids.length === 0) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("businesses")
    .select(BUSINESS_COLS)
    .in("category_id", ids)
    .eq("status", "active")
    .order("is_featured", { ascending: false })
    .order("rating_avg", { ascending: false })
    .limit(limit);
  return (data as unknown as Business[]) ?? [];
}

/** Pharmacies on duty today (Asia/Baghdad date). */
export async function getDutyPharmacies(): Promise<Business[]> {
  if (!supabaseConfigured) return [];
  const supabase = await createClient();
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Baghdad" }).format(new Date());
  const { data } = await supabase
    .from("pharmacy_duty")
    .select(`business:businesses(${BUSINESS_COLS})`)
    .eq("duty_date", today);
  return ((data ?? []) as unknown as { business: Business | null }[]).map((r) => r.business).filter((b): b is Business => !!b);
}

export const PAGE_SIZE = 18;

/** Calls the search_businesses RPC (typo/tashkeel tolerant, see migration 0002). */
export async function searchBusinesses(p: SearchParams): Promise<{ rows: Business[]; total: number }> {
  if (!supabaseConfigured) return { rows: [], total: 0 };
  const supabase = await createClient();
  const [districts, { data }] = await Promise.all([
    getDistricts(),
    supabase.rpc("search_businesses", {
      p_q: p.q?.trim() || null,
      p_category: p.category || null,
      p_district: p.district ?? null,
      p_min_rating: p.minRating ?? 0,
      p_open_now: !!p.open,
      p_verified: !!p.verified,
      p_lat: p.lat ?? null,
      p_lng: p.lng ?? null,
      p_sort: p.sort ?? (p.lat != null && p.lng != null ? "nearest" : "relevance"),
      p_limit: PAGE_SIZE,
      p_offset: ((p.page ?? 1) - 1) * PAGE_SIZE,
    }),
  ]);
  const byId = new Map(districts.map((d) => [d.id, d]));
  type Row = Business & { district_id: number | null; total_count: number };
  const rows = ((data ?? []) as Row[]).map((r) => ({ ...r, district: byId.get(r.district_id ?? -1) ?? null }));
  return { rows, total: Number(rows[0]?.total_count ?? 0) };
}

export async function getBusinessBySlug(slug: string): Promise<BusinessDetail | null> {
  if (!supabaseConfigured) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("businesses")
    .select(
      `id, slug, name, description, phone, whatsapp, website, address, lat, lng, logo_url, cover_url, category_id, owner_id,
       is_verified, is_featured, rating_avg, rating_count, followers_count, views_count,
       district:districts(name_ar,name_ku,name_tr,name_en),
       hours:business_hours(day_of_week, open_time, close_time, is_closed),
       images:business_images(id, url, caption),
       products:products_services(id, name, description, price, currency, is_available, sort_order)`,
    )
    .eq("slug", slug)
    .eq("status", "active")
    .maybeSingle();
  if (!data) return null;
  const { data: open } = await supabase.rpc("is_open_now", { p_business: (data as { id: string }).id });
  const b = data as unknown as BusinessDetail & { products: (Product & { sort_order: number })[]; hours: BusinessHour[] };
  b.products = [...b.products].sort((x, y) => x.sort_order - y.sort_order);
  return { ...b, is_open: !!open };
}

export async function isFollowing(businessId: string): Promise<boolean | null> {
  if (!supabaseConfigured) return null;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data } = await supabase.from("follows").select("business_id").eq("business_id", businessId).eq("user_id", auth.user.id).maybeSingle();
  return !!data;
}

/** All active businesses with coordinates, tagged with their root category (for map pins). */
export async function getMapBusinesses(): Promise<MapBusiness[]> {
  if (!supabaseConfigured) return [];
  const supabase = await createClient();
  const [cats, { data }] = await Promise.all([
    getCategories(),
    supabase.from("businesses").select("id, slug, name, lat, lng, is_verified, category_id, address, phone")
      .eq("status", "active").not("lat", "is", null).not("lng", "is", null).limit(1000),
  ]);
  const byId = new Map(cats.map((c) => [c.id, c]));
  const root = (id: number) => { let c = byId.get(id); while (c?.parent_id) c = byId.get(c.parent_id); return c; };
  return ((data ?? []) as unknown as (MapBusiness & { category_id: number })[]).map((b) => {
    const r = root(b.category_id);
    return { ...b, root_slug: r?.slug ?? "other", color: r?.color ?? "#64748b" };
  });
}

// ---------------------------------------------------------------------
// Social
// ---------------------------------------------------------------------
export const FEED_PAGE = 8;

export async function getFeed(opts: { mode?: "all" | "following"; before?: string | null; business?: string; author?: string; post?: string; limit?: number } = {}) {
  if (!supabaseConfigured) return [] as FeedPost[];
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_feed", {
    p_mode: opts.mode ?? "all", p_before: opts.before ?? null, p_limit: opts.limit ?? FEED_PAGE,
    p_business: opts.business ?? null, p_author: opts.author ?? null, p_post: opts.post ?? null,
  });
  return (data ?? []) as FeedPost[];
}

export async function getStoryRings(): Promise<StoryRing[]> {
  if (!supabaseConfigured) return [];
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_story_rings");
  return (data ?? []) as StoryRing[];
}

export async function getComments(postId: string): Promise<CommentRow[]> {
  if (!supabaseConfigured) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("comments")
    .select("id, body, created_at, author:profiles(id, full_name, username, avatar_url)")
    .eq("post_id", postId).order("created_at").limit(200);
  return (data ?? []) as unknown as CommentRow[];
}

export const getUnreadCount = cache(async (): Promise<number> => {
  if (!supabaseConfigured) return 0;
  const supabase = await createClient();
  const { data } = await supabase.rpc("unread_notifications");
  return typeof data === "number" ? data : 0;
});

export async function getNotifications(limit = 50): Promise<NotificationRow[]> {
  if (!supabaseConfigured) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("notifications")
    .select("id, type, created_at, read_at, post_id, business_id, data, actor:profiles!notifications_actor_id_fkey(full_name), business:businesses(name, slug)")
    .order("created_at", { ascending: false }).limit(limit);
  return (data ?? []) as unknown as NotificationRow[];
}

/** Businesses the signed-in user owns (for "post as" and stories). */
export const getMyBusinesses = cache(async (): Promise<{ id: string; name: string; status: string }[]> => {
  if (!supabaseConfigured) return [];
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return [];
  const { data } = await supabase.from("businesses").select("id, name, status").eq("owner_id", auth.user.id).eq("status", "active");
  return data ?? [];
});

export async function getFollowedBusinesses(): Promise<{ slug: string; name: string }[]> {
  if (!supabaseConfigured) return [];
  const supabase = await createClient();
  const { data } = await supabase.from("follows").select("business:businesses(slug, name)").order("created_at", { ascending: false }).limit(50);
  return ((data ?? []) as unknown as { business: { slug: string; name: string } | null }[]).flatMap((r) => (r.business ? [r.business] : []));
}


// ---------------------------------------------------------------------
// Reviews, classifieds, live services
// ---------------------------------------------------------------------
export async function getReviews(businessId: string): Promise<ReviewRow[]> {
  if (!supabaseConfigured) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("reviews")
    .select("id, rating, body, owner_reply, replied_at, created_at, user_id, author:profiles(full_name, avatar_url)")
    .eq("business_id", businessId).eq("is_hidden", false).order("created_at", { ascending: false }).limit(100);
  return (data ?? []) as unknown as ReviewRow[];
}

export const LISTINGS_PAGE = 18;

export async function searchListings(kind: "property" | "vehicle" | "job", f: ListingFilters) {
  if (!supabaseConfigured) return { rows: [] as ListingCardRow[], total: 0 };
  const supabase = await createClient();
  const { data } = await supabase.rpc("search_listings", {
    p_kind: kind, p_q: f.q?.trim() || null, p_deal: f.deal || null, p_type: f.type || null, p_district: f.district ?? null,
    p_currency: f.currency || null, p_min_price: f.minPrice ?? null, p_max_price: f.maxPrice ?? null, p_min_area: f.minArea ?? null,
    p_min_rooms: f.minRooms ?? null, p_min_year: f.minYear ?? null, p_employment: f.employment || null, p_sort: f.sort ?? "newest",
    p_limit: LISTINGS_PAGE, p_offset: ((f.page ?? 1) - 1) * LISTINGS_PAGE,
  });
  const rows = (data ?? []) as ListingCardRow[];
  return { rows, total: Number(rows[0]?.total_count ?? 0) };
}

export async function getListing(id: string): Promise<ListingDetail | null> {
  if (!supabaseConfigured) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("listings")
    .select("id, kind, title, description, price, currency, details, district_id, phone, lat, lng, user_id, status, is_featured, views_count, created_at, images:listing_images(id, url, sort_order), owner:profiles(full_name)")
    .eq("id", id).maybeSingle();
  if (!data) return null;
  const l = data as unknown as ListingDetail & { images: { id: string; url: string; sort_order: number }[] };
  l.images = [...l.images].sort((a, b) => a.sort_order - b.sort_order);
  return l;
}

export async function getMyListings(): Promise<ListingCardRow[]> {
  if (!supabaseConfigured) return [];
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return [];
  const { data } = await supabase
    .from("listings").select("id, kind, title, price, currency, details, district_id, is_featured, created_at, status")
    .eq("user_id", auth.user.id).order("created_at", { ascending: false }).limit(50);
  return ((data ?? []) as unknown as (ListingCardRow & { status: string })[]).map((l) => ({ ...l, image: null, total_count: 0 }));
}

export async function getServiceStatus(category: "fuel" | "water"): Promise<ServiceStatusRow[]> {
  if (!supabaseConfigured) return [];
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_service_status", { p_category: category });
  return (data ?? []) as ServiceStatusRow[];
}

/** Duty roster for [today, tomorrow] in Baghdad time. */
export async function getDutyRoster(): Promise<{ today: Business[]; tomorrow: Business[] }> {
  if (!supabaseConfigured) return { today: [], tomorrow: [] };
  const supabase = await createClient();
  const fmt = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Baghdad" }).format(d);
  const now = new Date();
  const days = [fmt(now), fmt(new Date(now.getTime() + 86400_000))];
  const { data } = await supabase
    .from("pharmacy_duty")
    .select(`duty_date, business:businesses(${BUSINESS_COLS})`)
    .in("duty_date", days);
  const rows = (data ?? []) as unknown as { duty_date: string; business: Business | null }[];
  const pick = (d: string) => rows.filter((r) => r.duty_date === d && r.business).map((r) => r.business!);
  return { today: pick(days[0]), tomorrow: pick(days[1]) };
}

export async function getMyPharmacies(): Promise<{ id: string; name: string }[]> {
  const mine = await getMyBusinesses();
  if (mine.length === 0) return [];
  const supabase = await createClient();
  const { data } = await supabase.from("businesses").select("id, name, category:categories(slug)").in("id", mine.map((m) => m.id));
  return ((data ?? []) as unknown as { id: string; name: string; category: { slug: string } | null }[])
    .filter((b) => b.category?.slug === "pharmacies").map(({ id, name }) => ({ id, name }));
}
