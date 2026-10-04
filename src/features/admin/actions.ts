"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionResult } from "@/features/feed/actions";
import { SUPABASE_URL } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

const uuid = z.string().uuid();
async function rpc(name: string, args: Record<string, unknown>): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, error: "auth" };
  const { error } = await supabase.rpc(name, args); // every RPC re-checks is_staff()/is_admin() in SQL
  if (error) return { ok: false, error: "generic" };
  revalidatePath("/admin", "layout");
  return { ok: true };
}

export const approveSubmissionAction = async (id: string) => (uuid.safeParse(id).success ? rpc("approve_submission", { p_id: id }) : { ok: false as const, error: "invalid" as const });
export const rejectSubmissionAction = async (id: string, note: string) => (uuid.safeParse(id).success ? rpc("reject_submission", { p_id: id, p_note: note.slice(0, 300) }) : { ok: false as const, error: "invalid" as const });
export const reviewClaimAction = async (id: string, approve: boolean) => (uuid.safeParse(id).success ? rpc("review_claim", { p_claim: id, p_approve: approve }) : { ok: false as const, error: "invalid" as const });
export const moderateReportAction = async (id: string, action: "dismiss" | "resolve" | "hide") => (uuid.safeParse(id).success && ["dismiss", "resolve", "hide"].includes(action) ? rpc("moderate_report", { p_report: id, p_action: action }) : { ok: false as const, error: "invalid" as const });
export const moderateEventAction = async (id: string, status: "published" | "hidden") => (uuid.safeParse(id).success ? rpc("moderate_event", { p_event: id, p_status: status }) : { ok: false as const, error: "invalid" as const });

export async function setBusinessStateAction(id: string, patch: { status?: "pending" | "active" | "suspended"; verified?: boolean; featuredDays?: number }): Promise<ActionResult> {
  if (!uuid.safeParse(id).success) return { ok: false, error: "invalid" };
  return rpc("set_business_state", { p_business: id, p_status: patch.status ?? null, p_verified: patch.verified ?? null, p_featured_days: patch.featuredDays ?? null });
}
export async function markVerifiedAction(id: string): Promise<ActionResult> { return uuid.safeParse(id).success ? rpc("mark_verified", { p_business: id }) : { ok: false, error: "invalid" }; }

export async function setUserAction(id: string, patch: { role?: string; banned?: boolean }): Promise<ActionResult> {
  if (!uuid.safeParse(id).success) return { ok: false, error: "invalid" };
  return rpc("admin_set_user", { p_user: id, p_role: patch.role ?? null, p_banned: patch.banned ?? null });
}

const quick = z.object({
  name: z.string().trim().min(2).max(120), categoryId: z.number().int().positive(), districtId: z.number().int().positive().nullable(),
  lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180), phone: z.string().trim().max(20), address: z.string().trim().max(200),
  open: z.string().regex(/^\d{2}:\d{2}$/).or(z.literal("")), close: z.string().regex(/^\d{2}:\d{2}$/).or(z.literal("")),
  priceLevel: z.number().int().min(1).max(4).nullable(), photoUrl: z.string().nullable(),
});

/** Field-team quick add: creates a verified, published place in one call (+ optional photo as logo & gallery). */
export async function quickAddAction(input: z.input<typeof quick>): Promise<ActionResult<{ id: string; slug: string }>> {
  const p = quick.safeParse(input);
  if (!p.success) return { ok: false, error: "invalid" };
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, error: "auth" };
  const v = p.data;
  if (v.photoUrl && !v.photoUrl.startsWith(`${SUPABASE_URL}/storage/v1/object/public/business-media/${auth.user.id}/`)) return { ok: false, error: "invalid" };
  const { data: id, error } = await supabase.rpc("staff_add_business", { p: {
    name: v.name, category_id: v.categoryId, district_id: v.districtId, lat: v.lat, lng: v.lng, phone: v.phone, address: v.address, open: v.open, close: v.close, price_level: v.priceLevel,
  } });
  if (error || !id) return { ok: false, error: "generic" };
  if (v.photoUrl) {
    await supabase.from("business_images").insert({ business_id: id, url: v.photoUrl, sort_order: 0 });
    await supabase.from("businesses").update({ logo_url: v.photoUrl }).eq("id", id);
  }
  const { data: b } = await supabase.from("businesses").select("slug").eq("id", id).single();
  revalidatePath("/admin", "layout");
  return { ok: true, data: { id: id as string, slug: (b?.slug as string) ?? "" } };
}

const importRows = z.array(z.record(z.string(), z.string().max(500))).min(1).max(1000);
export interface ImportReport { total: number; valid: number; inserted: number; dry_run: boolean; errors: { row: number; code: string; name: string | null }[]; duplicates: { row: number; name: string; existing: string | null }[] }

/** Staff-only bulk import. dryRun=true validates and reports; false inserts valid, non-duplicate rows (SQL re-checks the role). */
export async function importPlacesAction(rows: Record<string, string>[], dryRun: boolean): Promise<{ ok: true; report: ImportReport } | { ok: false; error: string }> {
  const p = importRows.safeParse(rows);
  if (!p.success) return { ok: false, error: "invalid" };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("import_businesses", { p_rows: p.data, p_dry_run: dryRun });
  if (error) return { ok: false, error: error.message.includes("not_allowed") ? "not_allowed" : "generic" };
  if (!dryRun) revalidatePath("/admin", "layout");
  return { ok: true, report: data as ImportReport };
}
