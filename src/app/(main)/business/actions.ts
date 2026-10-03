"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const id = z.string().uuid();

/** Toggles follow for the signed-in user. Returns the new state, or null when logged out. */
export async function toggleFollowAction(businessId: string, slug: string): Promise<boolean | null> {
  if (!id.safeParse(businessId).success) return null;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data: existing } = await supabase.from("follows").select("business_id")
    .eq("business_id", businessId).eq("user_id", auth.user.id).maybeSingle();
  const { error } = existing
    ? await supabase.from("follows").delete().eq("business_id", businessId).eq("user_id", auth.user.id)
    : await supabase.from("follows").insert({ business_id: businessId, user_id: auth.user.id });
  if (error) return !!existing;
  revalidatePath(`/business/${slug}`);
  return !existing;
}
