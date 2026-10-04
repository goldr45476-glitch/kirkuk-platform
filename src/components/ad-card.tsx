"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { Badge, Card } from "@/components/ui/card";
import type { AdRow } from "@/lib/data";

/** Sponsored card: always labelled, counted once when it scrolls into view, click goes through /ad/[id] (counted, then redirected). */
export function AdCard({ ad, label }: { ad: AdRow; label: string }) {
  const ref = useRef<HTMLAnchorElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      io.disconnect();
      import("@/lib/supabase/client").then(({ createClient }) => createClient().rpc("track_ad", { p_id: ad.id, p_kind: "impression" })).then(() => {}, () => {});
    }, { threshold: 0.6 });
    io.observe(el);
    return () => io.disconnect();
  }, [ad.id]);
  return (
    <Card className="overflow-hidden border-accent/40 bg-accent/5">
      <a ref={ref} href={`/ad/${ad.id}`} rel="sponsored noopener" className="flex gap-3 p-4">
        {ad.image_url && <span className="relative size-16 shrink-0 overflow-hidden rounded-xl"><Image src={ad.image_url} alt="" fill sizes="64px" className="object-cover" /></span>}
        <span className="min-w-0 space-y-1">
          <Badge tone="accent">{label}</Badge>
          <span className="block font-extrabold leading-snug">{ad.title}</span>
          {ad.body && <span className="block text-sm text-muted-foreground">{ad.body}</span>}
        </span>
      </a>
    </Card>
  );
}
