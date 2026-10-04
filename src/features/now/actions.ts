"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionResult } from "@/features/feed/actions";
import { getAmenities, getDistricts } from "@/lib/data";
import { getCity } from "@/lib/city";
import { getLocale, localized } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import type { Recommendation } from "@/lib/types";

const AUDIENCES = ["family", "couple", "friends", "kids", "solo"] as const;
const recSchema = z.object({
  audience: z.enum(AUDIENCES).nullable(),
  budget: z.number().int().min(1).max(4).nullable(),
  maxKm: z.number().min(0.5).max(100).nullable(),
  lat: z.number().min(-90).max(90).nullable(),
  lng: z.number().min(-180).max(180).nullable(),
  random: z.boolean(),
  exclude: z.array(z.string().uuid()).max(30),
});

/** "وين نروح؟" — rule-based matching in SQL; returns up to 6 open-now places (or 1 for "surprise me"). */
export async function recommendAction(input: z.input<typeof recSchema>): Promise<Recommendation[]> {
  const p = recSchema.safeParse(input);
  const city = await getCity();
  if (!p.success || !city) return [];
  const supabase = await createClient();
  const [{ data }, districts, locale] = await Promise.all([
    supabase.rpc("recommend_places", {
      p_city: city.id, p_audience: p.data.audience, p_budget: p.data.budget, p_max_km: p.data.maxKm,
      p_lat: p.data.lat, p_lng: p.data.lng, p_random: p.data.random, p_exclude: p.data.exclude, p_limit: 6,
    }),
    getDistricts(), getLocale(),
  ]);
  const dName = new Map(districts.map((d) => [d.id, localized(d, locale)]));
  return ((data ?? []) as (Omit<Recommendation, "district"> & { district_id: number | null })[]).map(({ district_id, ...r }) => ({
    ...r, district: district_id ? dName.get(district_id) ?? null : null,
  }));
}

export async function amenityLabels(): Promise<Record<string, string>> {
  const [list, locale] = [await getAmenities(), await getLocale()];
  return Object.fromEntries(list.map((a) => [a.key, a.name[locale] ?? a.name.ar ?? a.key]));
}

const offerSchema = z.object({
  businessId: z.string().uuid(),
  title: z.string().trim().min(3).max(140),
  details: z.string().trim().max(1000),
  endsOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

/** Owners publish offers; they expire on their own at the end of `endsOn` (Baghdad time). */
export async function createOfferAction(input: z.input<typeof offerSchema>): Promise<ActionResult> {
  const p = offerSchema.safeParse(input);
  if (!p.success) return { ok: false, error: "invalid" };
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, error: "auth" };
  const ends = new Date(`${p.data.endsOn}T23:59:59+03:00`);
  if (!(ends.getTime() > Date.now())) return { ok: false, error: "invalid" };
  const { error } = await supabase.from("offers").insert({ business_id: p.data.businessId, title: p.data.title, details: p.data.details || null, ends_at: ends.toISOString() });
  if (error) return { ok: false, error: error.message.includes("plan_limit_offers") ? "plan_limit_offers" : "generic" };
  revalidatePath("/", "layout");
  return { ok: true };
}

const eventSchema = z.object({
  title: z.string().trim().min(3).max(140),
  details: z.string().trim().max(2000),
  category: z.enum(["music", "family", "sports", "culture", "food", "education", "charity", "other"]),
  startsAt: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/),
  venueName: z.string().trim().max(120),
});

/** Community event suggestion -> always lands in the moderation queue (DB trigger enforces `pending`). */
export async function suggestEventAction(input: z.input<typeof eventSchema>): Promise<ActionResult> {
  const p = eventSchema.safeParse(input);
  if (!p.success) return { ok: false, error: "invalid" };
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const city = await getCity();
  if (!auth.user || !city) return { ok: false, error: "auth" };
  const { error } = await supabase.from("events").insert({
    city_id: city.id, title: p.data.title, details: p.data.details || null, category: p.data.category,
    starts_at: new Date(`${p.data.startsAt}:00+03:00`).toISOString(), venue_name: p.data.venueName || null,
  });
  if (error) return { ok: false, error: error.message.includes("rate_limited") ? "rate_limited" : "generic" };
  return { ok: true };
}
