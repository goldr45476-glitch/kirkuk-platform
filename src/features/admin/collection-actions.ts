"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionResult } from "@/features/feed/actions";
import { getCity } from "@/lib/city";
import { createClient } from "@/lib/supabase/server";

const uuid = z.string().uuid();
async function staffClient() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return { supabase, user: data.user };
}
const done = (): ActionResult => { revalidatePath("/admin/collections"); revalidatePath("/collections", "layout"); revalidatePath("/"); return { ok: true }; };
const fail: ActionResult = { ok: false, error: "generic" };

export async function createCollectionAction(i: { title: string; slug: string; description: string }): Promise<ActionResult> {
  const p = z.object({ title: z.string().trim().min(3).max(120), slug: z.string().trim().toLowerCase().regex(/^[a-z0-9-]{3,60}$/), description: z.string().trim().max(500) }).safeParse(i);
  if (!p.success) return { ok: false, error: "invalid" };
  const { supabase, user } = await staffClient();
  const city = await getCity();
  if (!user || !city) return { ok: false, error: "auth" };
  const { error } = await supabase.from("collections").insert({ city_id: city.id, slug: p.data.slug, title: p.data.title, description: p.data.description || null });
  return error ? fail : done();
}
export async function setCollectionStatusAction(id: string, status: "draft" | "published"): Promise<ActionResult> {
  if (!uuid.safeParse(id).success) return { ok: false, error: "invalid" };
  const { supabase } = await staffClient();
  const { data, error } = await supabase.from("collections").update({ status }).eq("id", id).select("id");
  return error || !data?.length ? fail : done();
}
export async function deleteCollectionAction(id: string): Promise<ActionResult> {
  if (!uuid.safeParse(id).success) return { ok: false, error: "invalid" };
  const { supabase } = await staffClient();
  const { error } = await supabase.from("collections").delete().eq("id", id);
  return error ? fail : done();
}
export async function addCollectionItemAction(collectionId: string, businessId: string, note: string): Promise<ActionResult> {
  if (!uuid.safeParse(collectionId).success || !uuid.safeParse(businessId).success) return { ok: false, error: "invalid" };
  const { supabase } = await staffClient();
  const { data: last } = await supabase.from("collection_items").select("position").eq("collection_id", collectionId).order("position", { ascending: false }).limit(1);
  const { error } = await supabase.from("collection_items").insert({ collection_id: collectionId, business_id: businessId, position: (last?.[0]?.position ?? 0) + 1, note: note.trim().slice(0, 200) || null });
  return error ? fail : done();
}
export async function removeCollectionItemAction(collectionId: string, businessId: string): Promise<ActionResult> {
  if (!uuid.safeParse(collectionId).success || !uuid.safeParse(businessId).success) return { ok: false, error: "invalid" };
  const { supabase } = await staffClient();
  const { error } = await supabase.from("collection_items").delete().eq("collection_id", collectionId).eq("business_id", businessId);
  return error ? fail : done();
}
/** Swap an item with its neighbour (dir = -1 up / +1 down). */
export async function moveCollectionItemAction(collectionId: string, businessId: string, dir: -1 | 1): Promise<ActionResult> {
  if (!uuid.safeParse(collectionId).success || !uuid.safeParse(businessId).success) return { ok: false, error: "invalid" };
  const { supabase } = await staffClient();
  const { data } = await supabase.from("collection_items").select("business_id, position").eq("collection_id", collectionId).order("position").order("business_id");
  const rows = data ?? [];
  const i = rows.findIndex((r) => r.business_id === businessId), j = i + dir;
  if (i < 0 || j < 0 || j >= rows.length) return { ok: true };
  const order = rows.map((r) => r.business_id as string);
  [order[i], order[j]] = [order[j], order[i]];
  for (let k = 0; k < order.length; k++) await supabase.from("collection_items").update({ position: k + 1 }).eq("collection_id", collectionId).eq("business_id", order[k]);
  return done();
}
