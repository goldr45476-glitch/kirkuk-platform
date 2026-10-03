"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionResult } from "@/features/feed/actions";
import { getCity } from "@/lib/city";
import { createClient } from "@/lib/supabase/server";

const phone = z.string().trim().regex(/^[+\d][\d\s-]{6,18}$/);
const placeSchema = z.object({
  name: z.string().trim().min(2).max(120),
  categoryId: z.number().int().positive(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  districtId: z.number().int().positive().nullable(),
  phone: phone.or(z.literal("")),
  address: z.string().trim().max(200),
  description: z.string().trim().max(1000),
  isOwner: z.boolean(),
});

/** Community suggestion -> `submissions` (always pending; staff approve via approve_submission). */
export async function submitPlaceAction(input: z.input<typeof placeSchema>): Promise<ActionResult> {
  const p = placeSchema.safeParse(input);
  if (!p.success) return { ok: false, error: "invalid" };
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const city = await getCity();
  if (!auth.user || !city) return { ok: false, error: "auth" };
  const v = p.data;
  const { error } = await supabase.from("submissions").insert({
    user_id: auth.user.id, city_id: city.id, type: "new_place",
    payload: { name: v.name, category_id: v.categoryId, district_id: v.districtId, lat: v.lat, lng: v.lng, phone: v.phone, address: v.address, description: v.description, is_owner: v.isOwner },
  });
  if (error) return { ok: false, error: error.message.includes("rate_limited") ? "rate_limited" : "generic" };
  revalidatePath("/account");
  return { ok: true };
}

const claimSchema = z.object({ businessId: z.string().uuid(), phone, proofPath: z.string().min(10).max(200) });

export async function createClaimAction(input: z.input<typeof claimSchema>): Promise<ActionResult> {
  const p = claimSchema.safeParse(input);
  if (!p.success) return { ok: false, error: "invalid" };
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, error: "auth" };
  if (!p.data.proofPath.startsWith(`${auth.user.id}/`)) return { ok: false, error: "invalid" };
  const { error } = await supabase.from("claims").insert({ business_id: p.data.businessId, user_id: auth.user.id, phone: p.data.phone, proof_path: p.data.proofPath });
  if (error) return { ok: false, error: error.code === "23505" ? "invalid" : "generic" };
  revalidatePath("/account");
  return { ok: true };
}
