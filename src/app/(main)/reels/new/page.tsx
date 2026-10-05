import { redirect } from "next/navigation";
import { ReelForm } from "@/features/reels/reel-form";
import { getCurrentProfile, getMyBusinesses } from "@/lib/data";
import { getI18n } from "@/lib/i18n/server";

export const metadata = { title: "Reels" };

export default async function NewReelPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login?next=/reels/new");
  const [{ t }, businesses] = await Promise.all([getI18n(), getMyBusinesses()]);
  return <ReelForm t={t} businesses={businesses} />;
}
