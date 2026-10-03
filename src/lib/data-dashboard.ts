import { cache } from "react";
import { supabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import type { BusinessHour } from "@/lib/types";

export interface OwnedBusiness { id: string; slug: string; name: string; status: "pending" | "active" | "suspended"; rating_avg: number; rating_count: number; followers_count: number; last_verified_at: string | null }

export const getOwnedBusinesses = cache(async (): Promise<OwnedBusiness[]> => {
  if (!supabaseConfigured) return [];
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return [];
  const { data } = await supabase.from("businesses").select("id, slug, name, status, rating_avg, rating_count, followers_count, last_verified_at").eq("owner_id", auth.user.id).order("created_at");
  return (data ?? []) as OwnedBusiness[];
});

export interface DashboardBusiness {
  id: string; slug: string; name: string; description: string | null; phone: string | null; whatsapp: string | null; website: string | null; address: string | null;
  district_id: number | null; price_level: number | null; lat: number | null; lng: number | null; logo_url: string | null; cover_url: string | null;
  status: "pending" | "active" | "suspended"; is_verified: boolean; last_verified_at: string | null; owner_id: string | null;
  hours: BusinessHour[];
  special: { id: number; date_from: string; date_to: string; label: string | null; open_time: string | null; close_time: string | null; is_closed: boolean }[];
  amenities: string[]; suitability: { audience: string; budget_band: number | null }[];
  products: { id: string; name: string; price: number | null; is_available: boolean }[];
  images: { id: string; url: string }[];
  offers: { id: string; title: string; ends_at: string }[];
}

export async function getDashboardBusiness(id: string): Promise<DashboardBusiness | null> {
  if (!supabaseConfigured) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("businesses").select(
    `id, slug, name, description, phone, whatsapp, website, address, district_id, price_level, lat, lng, logo_url, cover_url, status, is_verified, last_verified_at, owner_id,
     hours:business_hours(day_of_week, open_time, close_time, is_closed),
     special:special_hours(id, date_from, date_to, label, open_time, close_time, is_closed),
     amenities:business_amenities(amenity_key),
     suitability(audience, budget_band),
     products:products_services(id, name, price, is_available, sort_order),
     images:business_images(id, url, sort_order),
     offers(id, title, ends_at)`,
  ).eq("id", id).maybeSingle();
  if (!data) return null;
  const d = data as unknown as Omit<DashboardBusiness, "amenities"> & { amenities: { amenity_key: string }[]; products: { sort_order: number }[]; images: { sort_order: number }[] };
  return {
    ...d,
    amenities: d.amenities.map((a) => a.amenity_key),
    products: [...d.products].sort((a, b) => a.sort_order - b.sort_order) as DashboardBusiness["products"],
    images: [...d.images].sort((a, b) => a.sort_order - b.sort_order) as DashboardBusiness["images"],
    special: [...d.special].sort((a, b) => a.date_from.localeCompare(b.date_from)),
    offers: [...d.offers].sort((a, b) => b.ends_at.localeCompare(a.ends_at)),
  };
}

export interface BusinessStats {
  days: number; totals: Record<string, number>; daily: { day: string; views: number; contacts: number; directions: number }[];
  followers: number; rating_avg: number; rating_count: number;
}

export async function getBusinessStats(id: string, days: number): Promise<BusinessStats | null> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("business_stats", { p_business: id, p_days: days });
  return (data as BusinessStats | null) ?? null;
}

export interface Contribution { id: string; kind: "submission" | "claim"; label: string; status: "pending" | "approved" | "rejected"; created_at: string; type?: string }

export async function getMyContributions(): Promise<Contribution[]> {
  if (!supabaseConfigured) return [];
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return [];
  const [subs, claims] = await Promise.all([
    supabase.from("submissions").select("id, type, status, payload, created_at, business:businesses(name)").eq("user_id", auth.user.id).order("created_at", { ascending: false }).limit(30),
    supabase.from("claims").select("id, status, created_at, business:businesses(name)").eq("user_id", auth.user.id).order("created_at", { ascending: false }).limit(30),
  ]);
  const a = ((subs.data ?? []) as unknown as { id: string; type: string; status: Contribution["status"]; payload: { name?: string }; created_at: string; business: { name: string } | null }[])
    .map((s): Contribution => ({ id: s.id, kind: "submission", type: s.type, label: s.payload.name ?? s.business?.name ?? "—", status: s.status, created_at: s.created_at }));
  const b = ((claims.data ?? []) as unknown as { id: string; status: Contribution["status"]; created_at: string; business: { name: string } | null }[])
    .map((c): Contribution => ({ id: c.id, kind: "claim", label: c.business?.name ?? "—", status: c.status, created_at: c.created_at }));
  return [...a, ...b].sort((x, y) => y.created_at.localeCompare(x.created_at));
}
