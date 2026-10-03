"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/features/feed/actions";

const uuid = z.string().uuid();
const err = (m?: string): ActionResult => ({ ok: false, error: m?.includes("rate_limited") ? "rate_limited" : m?.includes("account_banned") ? "account_banned" : "generic" });
async function authed() { const supabase = await createClient(); const { data } = await supabase.auth.getUser(); return { supabase, user: data.user }; }

const reviewSchema = z.object({ businessId: uuid, rating: z.number().int().min(1).max(5), body: z.string().trim().max(1500) });

/** Creates or updates the caller's single review of a business. */
export async function saveReviewAction(slug: string, input: z.input<typeof reviewSchema>): Promise<ActionResult> {
  const p = reviewSchema.safeParse(input);
  if (!p.success) return { ok: false, error: "invalid" };
  const { supabase, user } = await authed();
  if (!user) return { ok: false, error: "auth" };
  const { data: existing } = await supabase.from("reviews").select("id").eq("business_id", p.data.businessId).eq("user_id", user.id).maybeSingle();
  const { error } = existing
    ? await supabase.from("reviews").update({ rating: p.data.rating, body: p.data.body || null }).eq("id", existing.id)
    : await supabase.from("reviews").insert({ business_id: p.data.businessId, user_id: user.id, rating: p.data.rating, body: p.data.body || null });
  if (error) return err(error.message);
  revalidatePath(`/business/${slug}`);
  return { ok: true };
}

export async function deleteReviewAction(slug: string, reviewId: string): Promise<ActionResult> {
  if (!uuid.safeParse(reviewId).success) return { ok: false, error: "invalid" };
  const { supabase, user } = await authed();
  if (!user) return { ok: false, error: "auth" };
  const { error } = await supabase.from("reviews").delete().eq("id", reviewId);
  if (error) return err(error.message);
  revalidatePath(`/business/${slug}`);
  return { ok: true };
}

export async function replyReviewAction(slug: string, reviewId: string, reply: string): Promise<ActionResult> {
  const p = z.object({ id: uuid, reply: z.string().trim().min(1).max(1000) }).safeParse({ id: reviewId, reply });
  if (!p.success) return { ok: false, error: "invalid" };
  const { supabase, user } = await authed();
  if (!user) return { ok: false, error: "auth" };
  const { error } = await supabase.rpc("reply_to_review", { p_review: p.data.id, p_reply: p.data.reply });
  if (error) return err(error.message);
  revalidatePath(`/business/${slug}`);
  return { ok: true };
}

const reportSchema = z.object({ businessId: uuid, status: z.enum(["available", "unavailable", "queue"]), queue: z.number().int().min(0).max(3).nullable() });

/** Crowd report for fuel / water stations. */
export async function reportServiceStatusAction(input: z.input<typeof reportSchema>): Promise<ActionResult> {
  const p = reportSchema.safeParse(input);
  if (!p.success) return { ok: false, error: "invalid" };
  const { supabase, user } = await authed();
  if (!user) return { ok: false, error: "auth" };
  const { error } = await supabase.from("service_status_reports").insert({
    business_id: p.data.businessId, user_id: user.id, status: p.data.status, queue_level: p.data.status === "queue" ? p.data.queue ?? 1 : null,
  });
  if (error) return err(error.message);
  revalidatePath("/live/[type]", "page");
  return { ok: true };
}

const dutySchema = z.object({ businessId: uuid, date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), note: z.string().trim().max(200) });

export async function addDutyAction(input: z.input<typeof dutySchema>): Promise<ActionResult> {
  const p = dutySchema.safeParse(input);
  if (!p.success) return { ok: false, error: "invalid" };
  const { supabase, user } = await authed();
  if (!user) return { ok: false, error: "auth" };
  const { error } = await supabase.from("pharmacy_duty").upsert(
    { business_id: p.data.businessId, duty_date: p.data.date, note: p.data.note || null, created_by: user.id },
    { onConflict: "business_id,duty_date" },
  );
  if (error) return err(error.message);
  revalidatePath("/", "layout");
  return { ok: true };
}
