import { cache } from "react";
import { supabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import type { Locale } from "@/lib/types";

/** Which city this deployment serves. A new city = a row in `cities` + this env var (no code change). */
export const CITY_SLUG = process.env.NEXT_PUBLIC_CITY ?? "kirkuk";

export interface City { id: number; slug: string; name: Record<string, string>; center_lat: number; center_lng: number; timezone: string }

export const getCity = cache(async (): Promise<City | null> => {
  if (!supabaseConfigured) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("cities").select("id, slug, name, center_lat, center_lng, timezone").eq("slug", CITY_SLUG).maybeSingle();
  return (data as City | null) ?? null;
});

export const cityName = (c: City | null, locale: Locale) => c?.name[locale] ?? c?.name.ar ?? c?.name.en ?? "";
