import { notFound, redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/data";
import type { Profile } from "@/lib/types";

/** Pages for moderators/admins only. Guests go to login, signed-in non-staff get a 404 (don't reveal the panel). */
export async function requireStaff(next = "/admin"): Promise<Profile> {
  const p = await getCurrentProfile();
  if (!p) redirect(`/login?next=${encodeURIComponent(next)}`);
  if (p.role !== "admin" && p.role !== "moderator") notFound();
  return p;
}
