"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionResult } from "@/features/feed/actions";
import { createClient } from "@/lib/supabase/server";

const uuid = z.string().uuid();

export async function requestSubscriptionAction(businessId: string, plan: string, note: string): Promise<ActionResult> {
  const p = z.object({ b: uuid, plan: z.enum(["pro", "featured"]), note: z.string().trim().max(300) }).safeParse({ b: businessId, plan, note });
  if (!p.success) return { ok: false, error: "invalid" };
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, error: "auth" };
  const { error } = await supabase.rpc("request_subscription", { p_business: p.data.b, p_plan: p.data.plan, p_note: p.data.note || null });
  if (error) return { ok: false, error: error.message.includes("one_pending") || error.code === "23505" ? "invalid" : "generic" };
  revalidatePath("/pricing"); revalidatePath(`/dashboard/${p.data.b}`);
  return { ok: true };
}

export async function cancelSubscriptionRequestAction(subId: string): Promise<ActionResult> {
  if (!uuid.safeParse(subId).success) return { ok: false, error: "invalid" };
  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_subscription_request", { p_sub: subId });
  if (error) return { ok: false, error: "generic" };
  revalidatePath("/pricing"); revalidatePath("/dashboard", "layout");
  return { ok: true };
}
