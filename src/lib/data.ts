import { cache } from "react";
import { supabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import type { Business, BusinessDetail, BusinessHour, Category, District, MapBusiness, Product, Profile, SearchParams } from "@/lib/types";

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
      `id, slug, name, description, phone, whatsapp, website, address, lat, lng, logo_url, cover_url, category_id,
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
