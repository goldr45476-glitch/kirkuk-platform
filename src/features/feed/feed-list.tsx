"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { FeedPost, Locale } from "@/lib/types";
import { AdCard } from "@/components/ad-card";
import type { AdRow } from "@/lib/data";
import { loadFeedAction } from "./actions";
import { PostCard } from "./post-card";

export function FeedList({ initial, mode, t, locale, userId, pageSize, emptyText, ads = [] }: {
  initial: FeedPost[]; mode: "all" | "following"; t: Dictionary; locale: Locale; userId: string | null; pageSize: number; emptyText: string; ads?: AdRow[];
}) {
  const [posts, setPosts] = useState(initial);
  const [more, setMore] = useState(initial.length >= pageSize);
  const [pending, start] = useTransition();

  const loadMore = () => start(async () => {
    const next = await loadFeedAction(mode, posts[posts.length - 1]?.created_at ?? null);
    setPosts((p) => [...p, ...next.filter((n) => !p.some((x) => x.id === n.id))]);
    setMore(next.length >= pageSize);
  });

  if (posts.length === 0) return <p className="py-10 text-center text-muted-foreground">{emptyText}</p>;
  return (
    <div className="space-y-3">
      {posts.map((p, i) => (
        <div key={p.id} className="space-y-3">
          <PostCard post={p} t={t} locale={locale} userId={userId} onDeleted={(id) => setPosts((l) => l.filter((x) => x.id !== id))} />
          {ads.length > 0 && i % 6 === 2 && <AdCard ad={ads[Math.floor(i / 6) % ads.length]} label={t.money.sponsored} />}
        </div>
      ))}
      {more && <Button variant="outline" className="w-full" onClick={loadMore} disabled={pending}>{pending ? t.common.loading : t.feed.loadMore}</Button>}
    </div>
  );
}
