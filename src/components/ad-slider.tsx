"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import type { AdRow } from "@/lib/data";
import { cn } from "@/lib/utils";

const INTERVAL = 5000;

/** Sponsored banner carousel: scroll-snap (swipe), auto-advances, counts each slide once when it is mostly visible. */
export function AdSlider({ ads, label, prev, next }: { ads: AdRow[]; label: string; prev: string; next: string }) {
  const track = useRef<HTMLUListElement>(null);
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const counted = useRef(new Set<string>());

  const go = useCallback((i: number) => {
    const box = track.current;
    const el = box?.children[(i + ads.length) % ads.length] as HTMLElement | undefined;
    if (!el || !box) return;
    // Scroll the track only (scrollIntoView would drag the page); works in LTR and RTL.
    box.scrollBy({ left: el.getBoundingClientRect().left - box.getBoundingClientRect().left, behavior: "smooth" });
  }, [ads.length]);

  useEffect(() => {
    const box = track.current;
    if (!box || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        const i = Number((e.target as HTMLElement).dataset.i);
        setActive(i);
        const id = ads[i]?.id;
        if (id && !counted.current.has(id)) {
          counted.current.add(id);
          import("@/lib/supabase/client").then(({ createClient }) => createClient().rpc("track_ad", { p_id: id, p_kind: "impression" })).then(() => {}, () => {});
        }
      }
    }, { root: box, threshold: 0.6 });
    [...box.children].forEach((c) => io.observe(c));
    return () => io.disconnect();
  }, [ads]);

  useEffect(() => {
    if (paused || ads.length < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => { if (!document.hidden) go(active + 1); }, INTERVAL);
    return () => clearInterval(id);
  }, [paused, active, ads.length, go]);

  if (ads.length === 0) return null;
  return (
    <section aria-roledescription="carousel" aria-label={label} className="group relative"
      onPointerEnter={() => setPaused(true)} onPointerLeave={() => setPaused(false)} onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}>
      <ul ref={track} className="flex snap-x snap-mandatory overflow-x-auto scroll-smooth rounded-2xl [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {ads.map((ad, i) => (
          <li key={ad.id} data-i={i} aria-roledescription="slide" aria-label={`${i + 1} / ${ads.length}`} className="w-full shrink-0 snap-start">
            <a href={`/ad/${ad.id}`} rel="sponsored noopener" className="relative block aspect-[16/7] min-h-36 w-full overflow-hidden bg-gradient-to-br from-primary to-accent text-white">
              {ad.image_url && <Image src={ad.image_url} alt="" fill sizes="(min-width: 1024px) 1024px, 100vw" className="object-cover" priority={i === 0} />}
              <span className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" aria-hidden />
              <span className="absolute inset-x-0 bottom-0 space-y-1 p-4 pb-7 sm:p-6 sm:pb-8">
                <span className="inline-block rounded-full bg-white/25 px-2 py-0.5 text-[11px] font-bold backdrop-blur">{label}</span>
                <span className="block text-lg font-extrabold leading-snug sm:text-2xl">{ad.title}</span>
                {ad.body && <span className="line-clamp-1 block text-sm text-white/90 sm:text-base">{ad.body}</span>}
              </span>
            </a>
          </li>
        ))}
      </ul>
      {ads.length > 1 && (
        <>
          <div className="pointer-events-none absolute inset-x-0 bottom-2 flex justify-center gap-1.5" aria-hidden>
            {ads.map((a, i) => <span key={a.id} className={cn("h-1.5 rounded-full bg-white/60 transition-all", i === active ? "w-5 bg-white" : "w-1.5")} />)}
          </div>
          <button type="button" aria-label={prev} onClick={() => go(active - 1)} className="absolute start-2 top-1/2 hidden size-9 -translate-y-1/2 place-items-center rounded-full bg-black/40 text-white opacity-0 transition group-hover:opacity-100 focus-visible:opacity-100 md:grid"><ChevronRight className="size-5 ltr:rotate-180" aria-hidden /></button>
          <button type="button" aria-label={next} onClick={() => go(active + 1)} className="absolute end-2 top-1/2 hidden size-9 -translate-y-1/2 place-items-center rounded-full bg-black/40 text-white opacity-0 transition group-hover:opacity-100 focus-visible:opacity-100 md:grid"><ChevronLeft className="size-5 ltr:rotate-180" aria-hidden /></button>
        </>
      )}
    </section>
  );
}
