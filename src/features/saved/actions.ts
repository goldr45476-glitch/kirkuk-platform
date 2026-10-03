"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const input = z.object({ type: z.enum(["business", "offer", "event", "listing"]), id: z.string().uuid() });

/** Returns the new saved state, or null when the user is logged out / the call failed. */
export async function toggleSaveAction(type: string, id: string): Promise<boolean | null> {
  const p = input.safeParse({ type, id });
  if (!p.success) return null;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data, error } = await supabase.rpc("toggle_save", { p_type: p.data.type, p_id: p.data.id });
  if (error) return null;
  revalidatePath("/saved");
  return data === true;
}
