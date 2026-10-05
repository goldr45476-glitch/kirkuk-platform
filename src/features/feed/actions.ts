"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getFeed } from "@/lib/data";
import { SUPABASE_URL } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import type { FeedPost } from "@/lib/types";

export type ActionResult<T = undefined> = { ok: true; data?: T } | { ok: false; error: "rate_limited" | "account_banned" | "auth" | "invalid" | "generic" | "plan_limit_images" | "plan_limit_offers" };

const uuid = z.string().uuid();
const fail = (e: { message?: string } | null): ActionResult => ({
  ok: false,
  error: e?.message?.includes("rate_limited") ? "rate_limited" : e?.message?.includes("account_banned") ? "account_banned" : "generic",
});

async function authed() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return { supabase, user: data.user };
}

/** Only accept images that live in the caller's own folder of our storage bucket. */
const mediaUrl = (uid: string, bucket: string) =>
  z.string().url().refine((u) => u.startsWith(`${SUPABASE_URL}/storage/v1/object/public/${bucket}/${uid}/`));

const postSchema = z.object({
  body: z.string().trim().max(3000),
  businessId: uuid.nullable(),
  isOffer: z.boolean(),
  offerEndsAt: z.string().datetime().nullable(),
  media: z.array(z.object({ url: z.string(), width: z.number().int().positive().max(5000), height: z.number().int().positive().max(5000) })).max(4),
});

export async function createPostAction(input: z.input<typeof postSchema>): Promise<ActionResult<{ id: string }>> {
  const parsed = postSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const { supabase, user } = await authed();
  if (!user) return { ok: false, error: "auth" };
  const v = parsed.data;
  if (!v.body && v.media.length === 0) return { ok: false, error: "invalid" };
  const urlOk = mediaUrl(user.id, "post-media");
  if (!v.media.every((m) => urlOk.safeParse(m.url).success)) return { ok: false, error: "invalid" };

  const { data, error } = await supabase.from("posts").insert({
    author_id: user.id, business_id: v.businessId, body: v.body || " ",
    is_offer: v.isOffer && !!v.businessId, offer_ends_at: v.isOffer && v.businessId ? v.offerEndsAt : null,
  }).select("id").single();
  if (error || !data) return fail(error);
  if (v.media.length) {
    const { error: mErr } = await supabase.from("post_media").insert(v.media.map((m, i) => ({ post_id: data.id, url: m.url, width: m.width, height: m.height, sort_order: i })));
    if (mErr) { await supabase.from("posts").delete().eq("id", data.id); return fail(mErr); }
  }
  revalidatePath("/");
  if (v.businessId) revalidatePath("/business/[slug]", "page");
  return { ok: true, data: { id: data.id } };
}

export async function toggleLikeAction(postId: string, like: boolean): Promise<ActionResult> {
  if (!uuid.safeParse(postId).success) return { ok: false, error: "invalid" };
  const { supabase, user } = await authed();
  if (!user) return { ok: false, error: "auth" };
  const { error } = like
    ? await supabase.from("likes").upsert({ post_id: postId, user_id: user.id }, { onConflict: "post_id,user_id", ignoreDuplicates: true })
    : await supabase.from("likes").delete().eq("post_id", postId).eq("user_id", user.id);
  return error ? fail(error) : { ok: true };
}

export async function addCommentAction(postId: string, body: string): Promise<ActionResult> {
  const parsed = z.object({ postId: uuid, body: z.string().trim().min(1).max(1000) }).safeParse({ postId, body });
  if (!parsed.success) return { ok: false, error: "invalid" };
  const { supabase, user } = await authed();
  if (!user) return { ok: false, error: "auth" };
  const { error } = await supabase.from("comments").insert({ post_id: postId, author_id: user.id, body: parsed.data.body });
  if (error) return fail(error);
  revalidatePath(`/post/${postId}`);
  return { ok: true };
}

export async function deletePostAction(postId: string): Promise<ActionResult> {
  if (!uuid.safeParse(postId).success) return { ok: false, error: "invalid" };
  const { supabase, user } = await authed();
  if (!user) return { ok: false, error: "auth" };
  const { error } = await supabase.from("posts").delete().eq("id", postId); // RLS: author or staff
  if (error) return fail(error);
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function deleteCommentAction(commentId: string, postId: string): Promise<ActionResult> {
  if (!uuid.safeParse(commentId).success) return { ok: false, error: "invalid" };
  const { supabase, user } = await authed();
  if (!user) return { ok: false, error: "auth" };
  const { error } = await supabase.from("comments").delete().eq("id", commentId);
  if (error) return fail(error);
  revalidatePath(`/post/${postId}`);
  return { ok: true };
}

const REASONS = ["spam", "fake", "inappropriate", "scam", "wrong_info", "other"] as const;
export async function reportAction(targetType: "post" | "comment" | "business" | "review" | "listing", targetId: string, reason: string): Promise<ActionResult> {
  const parsed = z.object({ t: z.enum(["post", "comment", "business", "review", "listing"]), id: uuid, r: z.enum(REASONS) }).safeParse({ t: targetType, id: targetId, r: reason });
  if (!parsed.success) return { ok: false, error: "invalid" };
  const { supabase, user } = await authed();
  if (!user) return { ok: false, error: "auth" };
  const { error } = await supabase.from("reports").insert({ reporter_id: user.id, target_type: parsed.data.t, target_id: parsed.data.id, reason: parsed.data.r });
  if (error && error.code !== "23505") return fail(error); // already reported = success for the user
  return { ok: true };
}

export async function loadFeedAction(mode: "all" | "following", before: string | null): Promise<FeedPost[]> {
  if (before && Number.isNaN(Date.parse(before))) return [];
  return getFeed({ mode: mode === "following" ? "following" : "all", before });
}

const storySchema = z.object({ businessId: uuid, caption: z.string().trim().max(200), mediaUrl: z.string() });
export async function createStoryAction(input: z.input<typeof storySchema>): Promise<ActionResult> {
  const parsed = storySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const { supabase, user } = await authed();
  if (!user) return { ok: false, error: "auth" };
  if (!mediaUrl(user.id, "post-media").safeParse(parsed.data.mediaUrl).success) return { ok: false, error: "invalid" };
  const { error } = await supabase.from("stories").insert({ business_id: parsed.data.businessId, media_url: parsed.data.mediaUrl, caption: parsed.data.caption || null });
  if (error) return fail(error);
  revalidatePath("/");
  return { ok: true };
}

export async function markNotificationsReadAction(): Promise<void> {
  const { supabase, user } = await authed();
  if (!user) return;
  await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", user.id).is("read_at", null);
  revalidatePath("/", "layout");
}

const reelSchema = z.object({ businessId: uuid.nullable(), caption: z.string().trim().max(300), videoUrl: z.string() });
export async function createReelAction(input: z.input<typeof reelSchema>): Promise<ActionResult<{ id: string }>> {
  const parsed = reelSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const { supabase, user } = await authed();
  if (!user) return { ok: false, error: "auth" };
  if (!mediaUrl(user.id, "reels").safeParse(parsed.data.videoUrl).success) return { ok: false, error: "invalid" };
  const { data, error } = await supabase.from("reels")
    .insert({ author_id: user.id, business_id: parsed.data.businessId, video_url: parsed.data.videoUrl, caption: parsed.data.caption || null })
    .select("id").single();
  if (error || !data) return fail(error);
  revalidatePath("/");
  revalidatePath("/reels");
  return { ok: true, data: { id: data.id } };
}

export async function toggleReelLikeAction(reelId: string, like: boolean): Promise<ActionResult> {
  if (!uuid.safeParse(reelId).success) return { ok: false, error: "invalid" };
  const { supabase, user } = await authed();
  if (!user) return { ok: false, error: "auth" };
  const { error } = like
    ? await supabase.from("reel_likes").upsert({ reel_id: reelId, user_id: user.id }, { onConflict: "reel_id,user_id", ignoreDuplicates: true })
    : await supabase.from("reel_likes").delete().eq("reel_id", reelId).eq("user_id", user.id);
  return error ? fail(error) : { ok: true };
}

export async function deleteReelAction(reelId: string): Promise<ActionResult> {
  if (!uuid.safeParse(reelId).success) return { ok: false, error: "invalid" };
  const { supabase, user } = await authed();
  if (!user) return { ok: false, error: "auth" };
  const { error } = await supabase.from("reels").delete().eq("id", reelId);
  if (error) return fail(error);
  revalidatePath("/reels");
  revalidatePath("/");
  return { ok: true };
}
