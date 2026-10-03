import { cache } from "react";
import { supabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import type { Business, Category, District, Profile } from "@/lib/types";

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
