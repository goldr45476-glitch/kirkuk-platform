"use client";

import { Heart, Share2, Trash2, Volume2, VolumeX } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Avatar } from "@/components/avatar";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { ReelRow } from "@/lib/types";
import { cn } from "@/lib/utils";
import { deleteReelAction, toggleReelLikeAction } from "@/features/feed/actions";

/** Vertical snap-scrolling reels; only the reel that is mostly on screen plays. Starts muted (browser autoplay rule). */
export function ReelsPlayer({ reels, t, userId }: { reels: ReelRow[]; t: Dictionary; userId: string | null }) {
  const [muted, setMuted] = useState(true);
  return (
    <div className="h-full snap-y snap-mandatory overflow-y-scroll rounded-2xl bg-black [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {reels.map((r) => <Reel key={r.id} reel={r} t={t} userId={userId} muted={muted} setMuted={setMuted} />)}
    </div>
  );
}

function Reel({ reel, t, userId, muted, setMuted }: { reel: ReelRow; t: Dictionary; userId: string | null; muted: boolean; setMuted: (m: boolean) => void }) {
  const router = useRouter();
  const box = useRef<HTMLElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const viewed = useRef(false);
  const [liked, setLiked] = useState(!!reel.liked);
  const [likes, setLikes] = useState(reel.likes_count);
  const [playing, setPlaying] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const r = t.reels;

  useEffect(() => {
    const el = box.current, v = video.current;
    if (!el || !v) return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        v.play().then(() => setPlaying(true), () => setPlaying(false));
        if (!viewed.current) {
          viewed.current = true;
          import("@/lib/supabase/client").then(({ createClient }) => createClient().rpc("track_reel_view", { p_id: reel.id })).then(() => {}, () => {});
        }
      } else { v.pause(); v.currentTime = 0; setPlaying(false); }
    }, { threshold: 0.7 });
    io.observe(el);
    return () => io.disconnect();
  }, [reel.id]);

  const like = () => {
    if (!userId) return router.push("/login?next=/reels");
    const next = !liked;
    setLiked(next); setLikes((n) => Math.max(0, n + (next ? 1 : -1)));
    start(async () => { const res = await toggleReelLikeAction(reel.id, next); if (!res.ok) { setLiked(!next); setLikes((n) => Math.max(0, n + (next ? -1 : 1))); } });
  };
  const share = async () => {
    const url = `${location.origin}/reels?r=${reel.id}`;
    try {
      if (navigator.share) await navigator.share({ url, text: reel.caption ?? undefined });
      else { await navigator.clipboard.writeText(url); setNote(r.copied); setTimeout(() => setNote(null), 1800); }
    } catch {}
  };
  const remove = () => {
    if (!confirm(r.removeConfirm)) return;
    start(async () => { await deleteReelAction(reel.id); router.refresh(); });
  };
  const toggle = () => { const v = video.current; if (!v) return; if (v.paused) v.play().then(() => setPlaying(true), () => {}); else { v.pause(); setPlaying(false); } };

  const name = reel.business?.name ?? reel.author?.full_name ?? "";
  const avatar = reel.business?.logo_url ?? reel.author?.avatar_url ?? null;
  const own = !!userId && reel.author?.id === userId;
  const btn = "grid size-11 place-items-center rounded-full bg-black/40 text-white backdrop-blur transition hover:bg-black/60";
  return (
    <section ref={box} aria-label={name} className="relative h-full w-full snap-start snap-always bg-black">
      <video ref={video} src={reel.video_url} loop playsInline muted={muted} preload="metadata" onClick={toggle} className="h-full w-full object-contain" />
      {!playing && <button type="button" onClick={toggle} aria-label="play" className="absolute inset-0 grid place-items-center"><span className="grid size-16 place-items-center rounded-full bg-black/50 text-3xl text-white">▶</span></button>}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/75 to-transparent" aria-hidden />
      <div className="absolute inset-x-0 bottom-0 flex items-end gap-3 p-4">
        <div className="min-w-0 flex-1 space-y-2 text-white">
          <Link href={reel.business ? `/business/${reel.business.slug}` : "/"} className="flex items-center gap-2 font-bold"><Avatar src={avatar} name={name} size={36} /><span className="truncate">{name}</span></Link>
          {reel.caption && <p className="line-clamp-3 text-sm">{reel.caption}</p>}
          <p className="text-xs text-white/70">{reel.views_count} {r.views}</p>
        </div>
        <div className="flex flex-col items-center gap-3">
          <button type="button" onClick={like} disabled={pending} aria-pressed={liked} aria-label={r.like} className={btn}><Heart className={cn("size-6", liked && "fill-red-500 text-red-500")} aria-hidden /></button>
          <span className="-mt-2 text-xs font-bold text-white">{likes}</span>
          <button type="button" onClick={share} aria-label={r.share} className={btn}><Share2 className="size-5" aria-hidden /></button>
          <button type="button" onClick={() => setMuted(!muted)} aria-label={muted ? r.unmute : r.mute} className={btn}>{muted ? <VolumeX className="size-5" aria-hidden /> : <Volume2 className="size-5" aria-hidden />}</button>
          {own && <button type="button" onClick={remove} disabled={pending} aria-label={r.remove} className={btn}><Trash2 className="size-5" aria-hidden /></button>}
        </div>
      </div>
      {note && <p role="status" className="absolute inset-x-0 top-4 mx-auto w-fit rounded-full bg-black/70 px-4 py-1.5 text-sm font-semibold text-white">{note}</p>}
    </section>
  );
}
