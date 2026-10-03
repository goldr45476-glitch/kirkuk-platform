"use client";

import { Plus, X } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { Avatar } from "@/components/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { StoryRing } from "@/lib/types";
import { cn } from "@/lib/utils";
import { createStoryAction } from "./actions";
import { uploadImage } from "./upload";

const DURATION = 5000;

export function StoriesRow({ rings, t, myBusinesses }: { rings: StoryRing[]; t: Dictionary; myBusinesses: { id: string; name: string }[] }) {
  const [open, setOpen] = useState<number | null>(null);
  const [seen, setSeen] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    try { setSeen(new Set(JSON.parse(localStorage.getItem("seen-stories") ?? "[]"))); } catch {}
  }, []);
  const markSeen = (id: string) => setSeen((s) => {
    if (s.has(id)) return s;
    const n = new Set(s).add(id);
    try { localStorage.setItem("seen-stories", JSON.stringify([...n].slice(-300))); } catch {}
    return n;
  });

  if (rings.length === 0 && myBusinesses.length === 0) return null;
  return (
    <section aria-label={t.stories.title}>
      <ul className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2">
        {myBusinesses.length > 0 && (
          <li className="shrink-0">
            <button onClick={() => setAdding(true)} className="flex w-[68px] flex-col items-center gap-1.5 text-xs font-semibold">
              <span className="grid size-16 place-items-center rounded-full border-2 border-dashed border-primary text-primary"><Plus aria-hidden /></span>
              <span className="w-full truncate text-center">{t.composer.addStory}</span>
            </button>
          </li>
        )}
        {rings.map((r, i) => {
          const allSeen = r.stories.every((s) => seen.has(s.id));
          return (
            <li key={r.business_id} className="shrink-0">
              <button onClick={() => setOpen(i)} className="flex w-[68px] flex-col items-center gap-1.5 text-xs font-semibold">
                <span className={cn("rounded-full p-[3px]", allSeen ? "bg-border" : "bg-gradient-to-tr from-accent to-primary")}>
                  <span className="block rounded-full border-2 border-background"><Avatar src={r.logo_url} name={r.name} size={56} /></span>
                </span>
                <span className="w-full truncate text-center">{r.name}</span>
              </button>
            </li>
          );
        })}
      </ul>
      {open !== null && <StoryViewer rings={rings} start={open} t={t} onSeen={markSeen} onClose={() => setOpen(null)} />}
      {adding && <AddStory businesses={myBusinesses} t={t} onClose={() => setAdding(false)} />}
    </section>
  );
}

function StoryViewer({ rings, start, t, onSeen, onClose }: { rings: StoryRing[]; start: number; t: Dictionary; onSeen: (id: string) => void; onClose: () => void }) {
  const [ri, setRi] = useState(start);
  const [si, setSi] = useState(0);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const ring = rings[ri];
  const story = ring.stories[si];
  const raf = useRef(0);

  const next = useCallback(() => {
    setProgress(0);
    if (si < ring.stories.length - 1) setSi(si + 1);
    else if (ri < rings.length - 1) { setRi(ri + 1); setSi(0); }
    else onClose();
  }, [si, ri, ring.stories.length, rings.length, onClose]);
  const prev = () => {
    setProgress(0);
    if (si > 0) setSi(si - 1);
    else if (ri > 0) { setRi(ri - 1); setSi(0); }
  };

  useEffect(() => { onSeen(story.id); }, [story.id, onSeen]);
  useEffect(() => {
    if (paused) return;
    let last = performance.now();
    const tick = (now: number) => {
      setProgress((p) => {
        const np = p + (now - last) / DURATION;
        return np;
      });
      last = now;
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [paused, story.id]);
  useEffect(() => { if (progress >= 1) next(); }, [progress, next]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); if (e.key === "ArrowRight") (document.dir === "rtl" ? prev : next)(); if (e.key === "ArrowLeft") (document.dir === "rtl" ? next : prev)(); };
    window.addEventListener("keydown", k);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", k); document.body.style.overflow = ""; };
  });

  return (
    <div role="dialog" aria-modal="true" aria-label={ring.name} className="fixed inset-0 z-50 grid place-items-center bg-black">
      <div className="relative h-dvh w-full max-w-md select-none" onPointerDown={() => setPaused(true)} onPointerUp={() => setPaused(false)} onPointerLeave={() => setPaused(false)}>
        <Image key={story.id} src={story.media_url} alt={story.caption ?? ""} fill sizes="448px" className="object-contain" priority />
        <div className="absolute inset-x-0 top-0 space-y-3 bg-gradient-to-b from-black/60 to-transparent p-3 pt-4">
          <div className="flex gap-1" aria-hidden>
            {ring.stories.map((s, i) => (
              <span key={s.id} className="h-1 flex-1 overflow-hidden rounded-full bg-white/30">
                <span className="block h-full bg-white" style={{ width: `${i < si ? 100 : i === si ? Math.min(progress, 1) * 100 : 0}%` }} />
              </span>
            ))}
          </div>
          <div className="flex items-center gap-2 text-white">
            <Avatar src={ring.logo_url} name={ring.name} size={32} />
            <a href={`/business/${ring.slug}`} className="flex-1 truncate font-bold">{ring.name}</a>
            <button onClick={onClose} aria-label={t.stories.close} className="grid size-9 place-items-center rounded-full hover:bg-white/15"><X aria-hidden /></button>
          </div>
        </div>
        {story.caption && <p className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-5 pb-8 text-center text-white">{story.caption}</p>}
        <button aria-label={t.stories.prev} onClick={prev} className="absolute inset-y-20 start-0 w-1/3" />
        <button aria-label={t.stories.next} onClick={next} className="absolute inset-y-20 end-0 w-1/3" />
      </div>
    </div>
  );
}

function AddStory({ businesses, t, onClose }: { businesses: { id: string; name: string }[]; t: Dictionary; onClose: () => void }) {
  const router = useRouter();
  const c = t.composer;
  const [biz, setBiz] = useState(businesses[0]?.id ?? "");
  const [url, setUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const pick = async (f: File | undefined) => {
    if (!f) return;
    setBusy(true); setError(null);
    try { setUrl((await uploadImage(f, "post-media")).url); } catch { setError(c.uploadError); }
    setBusy(false);
  };
  const share = () => start(async () => {
    const r = await createStoryAction({ businessId: biz, caption, mediaUrl: url! });
    if (!r.ok) return setError(t.post.errors.generic);
    onClose(); router.refresh();
  });

  return (
    <div role="dialog" aria-modal="true" aria-label={c.addStory} className="fixed inset-0 z-50 grid place-items-end bg-black/60 sm:place-items-center">
      <div className="w-full max-w-md space-y-3 rounded-t-2xl bg-card p-5 sm:rounded-2xl">
        <div className="flex items-center justify-between"><h2 className="font-extrabold">{c.addStory}</h2><button onClick={onClose} aria-label={t.stories.close}><X aria-hidden /></button></div>
        {businesses.length > 1 && (
          <select value={biz} onChange={(e) => setBiz(e.target.value)} aria-label={c.postAs} className="h-11 w-full rounded-lg border border-input bg-card px-3">
            {businesses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        )}
        {url ? <div className="relative aspect-[9/16] max-h-80 w-full overflow-hidden rounded-xl bg-muted"><Image src={url} alt="" fill sizes="400px" className="object-contain" /></div>
          : <input type="file" accept="image/*" onChange={(e) => pick(e.target.files?.[0])} disabled={busy} aria-label={c.addPhotos} className="block w-full text-sm file:me-3 file:rounded-lg file:border-0 file:bg-primary file:px-4 file:py-2.5 file:font-semibold file:text-primary-foreground" />}
        <Input value={caption} maxLength={200} onChange={(e) => setCaption(e.target.value)} placeholder={c.storyCaption} />
        {error && <p role="alert" className="text-sm font-semibold text-destructive">{error}</p>}
        <Button className="w-full" disabled={!url || pending} onClick={share}>{pending ? c.publishing : c.storyShare}</Button>
      </div>
    </div>
  );
}
