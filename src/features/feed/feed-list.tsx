"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { FeedPost, Locale } from "@/lib/types";
import { loadFeedAction } from "./actions";
import { PostCard } from "./post-card";

export function FeedList({ initial, mode, t, locale, userId, pageSize, emptyText }: {
  initial: FeedPost[]; mode: "all" | "following"; t: Dictionary; locale: Locale; userId: string | null; pageSize: number; emptyText: string;
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
      {posts.map((p) => <PostCard key={p.id} post={p} t={t} locale={locale} userId={userId} onDeleted={(id) => setPosts((l) => l.filter((x) => x.id !== id))} />)}
      {more && <Button variant="outline" className="w-full" onClick={loadMore} disabled={pending}>{pending ? t.common.loading : t.feed.loadMore}</Button>}
    </div>
  );
}
