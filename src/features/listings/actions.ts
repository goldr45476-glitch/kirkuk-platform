"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionResult } from "@/features/feed/actions";
import { SUPABASE_URL } from "@/lib/env";
import { detailsSchema, listingSchema, type ListingInput } from "@/lib/listings";
import { createClient } from "@/lib/supabase/server";

const uuid = z.string().uuid();
async function authed() { const supabase = await createClient(); const { data } = await supabase.auth.getUser(); return { supabase, user: data.user }; }

export async function createListingAction(input: ListingInput): Promise<ActionResult<{ id: string }>> {
  const base = listingSchema.safeParse(input);
  if (!base.success) return { ok: false, error: "invalid" };
  const details = detailsSchema[base.data.kind].safeParse(base.data.details);
  if (!details.success) return { ok: false, error: "invalid" };

  const { supabase, user } = await authed();
  if (!user) return { ok: false, error: "auth" };
  const prefix = `${SUPABASE_URL}/storage/v1/object/public/post-media/${user.id}/`;
  if (!base.data.images.every((u) => u.startsWith(prefix))) return { ok: false, error: "invalid" };

  const v = base.data;
  const { data, error } = await supabase.from("listings").insert({
    user_id: user.id, kind: v.kind, title: v.title, description: v.description, price: v.price, currency: v.currency,
    district_id: v.districtId, phone: v.phone, details: Object.fromEntries(Object.entries(details.data).filter(([, x]) => x !== undefined)),
  }).select("id").single();
  if (error || !data) return { ok: false, error: error?.message?.includes("rate_limited") ? "rate_limited" : "generic" };
  if (v.images.length) {
    const { error: iErr } = await supabase.from("listing_images").insert(v.images.map((url, i) => ({ listing_id: data.id, url, sort_order: i })));
    if (iErr) { await supabase.from("listings").delete().eq("id", data.id); return { ok: false, error: "generic" }; }
  }
  revalidatePath("/real-estate"); revalidatePath("/cars"); revalidatePath("/jobs");
  return { ok: true, data: { id: data.id } };
}

export async function setListingStatusAction(id: string, status: "active" | "sold"): Promise<ActionResult> {
  if (!uuid.safeParse(id).success) return { ok: false, error: "invalid" };
  const { supabase, user } = await authed();
  if (!user) return { ok: false, error: "auth" };
  const { error } = await supabase.from("listings").update({ status }).eq("id", id).eq("user_id", user.id);
  if (error) return { ok: false, error: "generic" };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function deleteListingAction(id: string): Promise<ActionResult> {
  if (!uuid.safeParse(id).success) return { ok: false, error: "invalid" };
  const { supabase, user } = await authed();
  if (!user) return { ok: false, error: "auth" };
  const { error } = await supabase.from("listings").delete().eq("id", id).eq("user_id", user.id);
  if (error) return { ok: false, error: "generic" };
  revalidatePath("/", "layout");
  return { ok: true };
}
