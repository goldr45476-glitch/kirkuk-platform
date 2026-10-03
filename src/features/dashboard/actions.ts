"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionResult } from "@/features/feed/actions";
import { SUPABASE_URL } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

const uuid = z.string().uuid();
const time = z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

async function ctx() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return { supabase, user: data.user };
}
/** Prefix check: only images the caller uploaded to our public business-media bucket. */
const ownImage = (uid: string) => z.string().url().refine((u) => u.startsWith(`${SUPABASE_URL}/storage/v1/object/public/business-media/${uid}/`));
const done = async (id: string): Promise<ActionResult> => {
  revalidatePath(`/dashboard/${id}`);
  revalidatePath("/business/[slug]", "page");
  return { ok: true };
};
const dbFail = (e: { message?: string } | null): ActionResult => ({ ok: false, error: e?.message?.includes("rate_limited") ? "rate_limited" : "generic" });

const infoSchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(2000),
  phone: z.string().trim().max(20),
  whatsapp: z.string().trim().max(20),
  website: z.string().trim().max(200).refine((v) => v === "" || /^https?:\/\//.test(v)),
  address: z.string().trim().max(200),
  districtId: z.number().int().positive().nullable(),
  priceLevel: z.number().int().min(1).max(4).nullable(),
  lat: z.number().min(-90).max(90).nullable(),
  lng: z.number().min(-180).max(180).nullable(),
  logoUrl: z.string().nullable(),
  coverUrl: z.string().nullable(),
});

export async function updateInfoAction(id: string, input: z.input<typeof infoSchema>): Promise<ActionResult> {
  const p = infoSchema.safeParse(input);
  if (!uuid.safeParse(id).success || !p.success) return { ok: false, error: "invalid" };
  const { supabase, user } = await ctx();
  if (!user) return { ok: false, error: "auth" };
  const v = p.data;
  const img = ownImage(user.id);
  for (const u of [v.logoUrl, v.coverUrl]) if (u && !img.safeParse(u).success && !u.startsWith(`${SUPABASE_URL}/storage/`)) return { ok: false, error: "invalid" };
  const { data, error } = await supabase.from("businesses").update({
    name: v.name, description: v.description || null, phone: v.phone || null, whatsapp: v.whatsapp || null, website: v.website || null,
    address: v.address || null, district_id: v.districtId, price_level: v.priceLevel, lat: v.lat, lng: v.lng, logo_url: v.logoUrl, cover_url: v.coverUrl,
  }).eq("id", id).select("id");
  if (error || !data?.length) return dbFail(error);
  return done(id);
}

const hoursSchema = z.array(z.object({ day: z.number().int().min(0).max(6), closed: z.boolean(), open: time, close: time })).length(7);

export async function saveHoursAction(id: string, rows: z.input<typeof hoursSchema>): Promise<ActionResult> {
  const p = hoursSchema.safeParse(rows);
  if (!uuid.safeParse(id).success || !p.success) return { ok: false, error: "invalid" };
  const { supabase, user } = await ctx();
  if (!user) return { ok: false, error: "auth" };
  const { error: dErr } = await supabase.from("business_hours").delete().eq("business_id", id);
  if (dErr) return dbFail(dErr);
  const { error } = await supabase.from("business_hours").insert(p.data.map((r) => ({
    business_id: id, day_of_week: r.day, is_closed: r.closed, open_time: r.closed ? null : r.open, close_time: r.closed ? null : r.close,
  })));
  return error ? dbFail(error) : done(id);
}

const specialSchema = z.object({ label: z.string().trim().max(60), from: date, to: date, closed: z.boolean(), open: time.nullable(), close: time.nullable() });
export async function addSpecialHoursAction(id: string, input: z.input<typeof specialSchema>): Promise<ActionResult> {
  const p = specialSchema.safeParse(input);
  if (!uuid.safeParse(id).success || !p.success || p.data.to < p.data.from) return { ok: false, error: "invalid" };
  const { supabase, user } = await ctx();
  if (!user) return { ok: false, error: "auth" };
  const v = p.data;
  const { error } = await supabase.from("special_hours").insert({
    business_id: id, label: v.label || null, date_from: v.from, date_to: v.to, is_closed: v.closed, open_time: v.closed ? null : v.open, close_time: v.closed ? null : v.close,
  });
  return error ? dbFail(error) : done(id);
}
export async function deleteSpecialHoursAction(id: string, rowId: number): Promise<ActionResult> {
  const { supabase, user } = await ctx();
  if (!user || !uuid.safeParse(id).success) return { ok: false, error: "auth" };
  const { error } = await supabase.from("special_hours").delete().eq("id", rowId).eq("business_id", id);
  return error ? dbFail(error) : done(id);
}

const amenitySchema = z.object({
  keys: z.array(z.string().regex(/^[a-z_]{2,30}$/)).max(30),
  suitability: z.array(z.object({ audience: z.enum(["family", "couple", "friends", "kids", "solo"]), band: z.number().int().min(1).max(4) })).max(5),
});
export async function saveAmenitiesAction(id: string, input: z.input<typeof amenitySchema>): Promise<ActionResult> {
  const p = amenitySchema.safeParse(input);
  if (!uuid.safeParse(id).success || !p.success) return { ok: false, error: "invalid" };
  const { supabase, user } = await ctx();
  if (!user) return { ok: false, error: "auth" };
  await supabase.from("business_amenities").delete().eq("business_id", id);
  await supabase.from("suitability").delete().eq("business_id", id);
  if (p.data.keys.length) { const { error } = await supabase.from("business_amenities").insert(p.data.keys.map((k) => ({ business_id: id, amenity_key: k }))); if (error) return dbFail(error); }
  if (p.data.suitability.length) { const { error } = await supabase.from("suitability").insert(p.data.suitability.map((s) => ({ business_id: id, audience: s.audience, budget_band: s.band }))); if (error) return dbFail(error); }
  return done(id);
}

const productSchema = z.object({ name: z.string().trim().min(1).max(120), price: z.number().min(0).max(1e10).nullable() });
export async function addProductAction(id: string, input: z.input<typeof productSchema>): Promise<ActionResult> {
  const p = productSchema.safeParse(input);
  if (!uuid.safeParse(id).success || !p.success) return { ok: false, error: "invalid" };
  const { supabase, user } = await ctx();
  if (!user) return { ok: false, error: "auth" };
  const { error } = await supabase.from("products_services").insert({ business_id: id, name: p.data.name, price: p.data.price, currency: "IQD", sort_order: Date.now() % 1_000_000 });
  return error ? dbFail(error) : done(id);
}
export async function deleteProductAction(id: string, productId: string): Promise<ActionResult> {
  const { supabase, user } = await ctx();
  if (!user || !uuid.safeParse(id).success || !uuid.safeParse(productId).success) return { ok: false, error: "auth" };
  const { error } = await supabase.from("products_services").delete().eq("id", productId).eq("business_id", id);
  return error ? dbFail(error) : done(id);
}

export async function addGalleryImageAction(id: string, url: string): Promise<ActionResult> {
  const { supabase, user } = await ctx();
  if (!user || !uuid.safeParse(id).success) return { ok: false, error: "auth" };
  if (!ownImage(user.id).safeParse(url).success) return { ok: false, error: "invalid" };
  const { error } = await supabase.from("business_images").insert({ business_id: id, url, sort_order: Date.now() % 1_000_000 });
  return error ? dbFail(error) : done(id);
}
export async function deleteGalleryImageAction(id: string, imageId: string): Promise<ActionResult> {
  const { supabase, user } = await ctx();
  if (!user || !uuid.safeParse(id).success || !uuid.safeParse(imageId).success) return { ok: false, error: "auth" };
  const { error } = await supabase.from("business_images").delete().eq("id", imageId).eq("business_id", id);
  return error ? dbFail(error) : done(id);
}

export async function deleteOfferAction(id: string, offerId: string): Promise<ActionResult> {
  const { supabase, user } = await ctx();
  if (!user || !uuid.safeParse(id).success || !uuid.safeParse(offerId).success) return { ok: false, error: "auth" };
  const { error } = await supabase.from("offers").delete().eq("id", offerId).eq("business_id", id);
  return error ? dbFail(error) : done(id);
}
