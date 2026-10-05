import { Plus } from "lucide-react";
import Link from "next/link";
import { ReelsPlayer } from "@/features/reels/reels-player";
import { getCurrentProfile, getReels } from "@/lib/data";
import { getI18n } from "@/lib/i18n/server";

export const metadata = { title: "Reels" };

export default async function ReelsPage({ searchParams }: { searchParams: Promise<{ r?: string }> }) {
  const { r } = await searchParams;
  const { t } = await getI18n();
  const [reels, profile] = await Promise.all([getReels(30, r ?? null), getCurrentProfile()]);
  return (
    <div className="mx-auto max-w-md">
      <div className="mb-2 flex items-center justify-between">
        <h1 className="text-xl font-extrabold">🎬 {t.reels.title}</h1>
        <Link href={profile ? "/reels/new" : "/login?next=/reels/new"} className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-sm font-bold text-primary-foreground"><Plus className="size-4" aria-hidden />{t.reels.create}</Link>
      </div>
      {reels.length === 0 ? (
        <p className="rounded-2xl border bg-card p-8 text-center text-muted-foreground">{t.reels.empty}</p>
      ) : (
        <div className="h-[calc(100dvh-11rem)] md:h-[calc(100dvh-9.5rem)]"><ReelsPlayer reels={reels} t={t} userId={profile?.id ?? null} /></div>
      )}
    </div>
  );
}
