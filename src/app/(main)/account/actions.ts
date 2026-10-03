"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  full_name: z.string().trim().min(2).max(80),
  username: z.string().trim().toLowerCase().regex(/^[a-z0-9_]{3,30}$/).or(z.literal("")),
  bio: z.string().trim().max(300),
});

export type ProfileState = { ok?: boolean; error?: "name" | "username" | "taken" | "generic" };

export async function updateProfileAction(_: ProfileState, form: FormData): Promise<ProfileState> {
  const parsed = schema.safeParse({
    full_name: form.get("full_name") ?? "",
    username: form.get("username") ?? "",
    bio: form.get("bio") ?? "",
  });
  if (!parsed.success) {
    const field = parsed.error.issues[0]?.path[0];
    return { error: field === "username" ? "username" : "name" };
  }
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const { full_name, username, bio } = parsed.data;
  const { error } = await supabase
    .from("profiles")
    .update({ full_name, username: username || null, bio: bio || null })
    .eq("id", auth.user.id);
  if (error) return { error: error.code === "23505" ? "taken" : "generic" };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}

/** Permanently deletes the caller's account (SQL: delete_my_account). Returns an error code or redirects home. */
export async function deleteAccountAction(): Promise<"last_admin" | "error" | void> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");
  const { error } = await supabase.rpc("delete_my_account");
  if (error) return error.message.includes("last_admin") ? "last_admin" : "error";
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}
