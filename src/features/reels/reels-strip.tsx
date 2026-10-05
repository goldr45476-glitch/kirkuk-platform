import { Plus, Play } from "lucide-react";
import Link from "next/link";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { ReelRow } from "@/lib/types";

/** Horizontal row of reel thumbnails for the home page (first frame of each video). */
export function ReelsStrip({ reels, t, canPost }: { reels: ReelRow[]; t: Dictionary; canPost: boolean }) {
  if (reels.length === 0 && !canPost) return null;
  return (
    <section aria-label={t.reels.title} className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-extrabold">🎬 {t.reels.title}</h2>
        {reels.length > 0 && <Link href="/reels" className="text-sm font-bold text-primary">{t.now.seeAll}</Link>}
      </div>
      <ul className="-mx-4 flex snap-x gap-2.5 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <li className="shrink-0 snap-start">
          <Link href={canPost ? "/reels/new" : "/login?next=/reels/new"} className="grid aspect-[9/16] w-28 place-items-center rounded-2xl border-2 border-dashed border-primary text-center text-xs font-bold text-primary sm:w-32">
            <span className="grid place-items-center gap-1"><Plus aria-hidden />{t.reels.create}</span>
          </Link>
        </li>
        {reels.map((r) => (
          <li key={r.id} className="shrink-0 snap-start">
            <Link href={`/reels?r=${r.id}`} className="relative block aspect-[9/16] w-28 overflow-hidden rounded-2xl bg-black sm:w-32">
              <video src={`${r.video_url}#t=0.1`} preload="metadata" muted playsInline tabIndex={-1} aria-hidden className="size-full object-cover" />
              <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2 pt-8 text-white">
                <span className="line-clamp-2 text-[11px] font-semibold leading-tight">{r.business?.name ?? r.author?.full_name}</span>
                <span className="mt-0.5 flex items-center gap-1 text-[10px] text-white/80"><Play className="size-3" aria-hidden />{r.views_count}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
