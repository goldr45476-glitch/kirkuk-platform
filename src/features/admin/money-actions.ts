"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionResult } from "@/features/feed/actions";
import { createClient } from "@/lib/supabase/server";

const uuid = z.string().uuid();
const done = (): ActionResult => { revalidatePath("/admin", "layout"); revalidatePath("/", "layout"); return { ok: true }; };

// All of these re-check is_admin() inside SQL / via RLS (ads_admin policy).
export async function activateSubscriptionAction(id: string, days: number | null, ref: string): Promise<ActionResult> {
  if (!uuid.safeParse(id).success || (days != null && !(Number.isInteger(days) && days >= 1 && days <= 3650))) return { ok: false, error: "invalid" };
  const supabase = await createClient();
  const { error } = await supabase.rpc("activate_subscription", { p_sub: id, p_days: days, p_payment_ref: ref.trim().slice(0, 120) || null });
  return error ? { ok: false, error: "generic" } : done();
}
export async function cancelSubscriptionAction(id: string): Promise<ActionResult> {
  if (!uuid.safeParse(id).success) return { ok: false, error: "invalid" };
  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_subscription", { p_sub: id });
  return error ? { ok: false, error: "generic" } : done();
}
export async function rejectRequestAction(id: string): Promise<ActionResult> {
  if (!uuid.safeParse(id).success) return { ok: false, error: "invalid" };
  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_subscription_request", { p_sub: id });
  return error ? { ok: false, error: "generic" } : done();
}

const adSchema = z.object({
  businessId: uuid.nullable(), placement: z.enum(["feed", "category", "home_banner", "search"]), categoryId: z.number().int().positive().nullable(),
  title: z.string().trim().min(3).max(100), body: z.string().trim().max(200), linkUrl: z.string().trim().refine((v) => v === "" || /^https:\/\//.test(v)),
  endsOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});
export async function createAdAction(input: z.input<typeof adSchema>): Promise<ActionResult> {
  const p = adSchema.safeParse(input);
  if (!p.success) return { ok: false, error: "invalid" };
  const supabase = await createClient();
  const v = p.data;
  const { error } = await supabase.from("ads").insert({
    business_id: v.businessId, placement: v.placement, category_id: v.categoryId, title: v.title, body: v.body || null, link_url: v.linkUrl || null,
    ends_at: new Date(`${v.endsOn}T23:59:59+03:00`).toISOString(),
  });
  return error ? { ok: false, error: "generic" } : done();
}
export async function setAdActiveAction(id: string, active: boolean): Promise<ActionResult> {
  if (!uuid.safeParse(id).success) return { ok: false, error: "invalid" };
  const supabase = await createClient();
  const { data, error } = await supabase.from("ads").update({ is_active: active }).eq("id", id).select("id");
  return error || !data?.length ? { ok: false, error: "generic" } : done();
}
export async function deleteAdAction(id: string): Promise<ActionResult> {
  if (!uuid.safeParse(id).success) return { ok: false, error: "invalid" };
  const supabase = await createClient();
  const { error } = await supabase.from("ads").delete().eq("id", id);
  return error ? { ok: false, error: "generic" } : done();
}
