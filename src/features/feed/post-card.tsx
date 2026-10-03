"use client";

import { BadgeCheck, Flag, Heart, MessageCircle, MoreHorizontal, Share2, Tag, Trash2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState, useTransition } from "react";
import { Avatar } from "@/components/avatar";
import { Badge, Card } from "@/components/ui/card";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { formatDate, timeAgo } from "@/lib/time";
import type { FeedPost, Locale } from "@/lib/types";
import { cn } from "@/lib/utils";
import { deletePostAction, reportAction, toggleLikeAction } from "./actions";

type Props = { post: FeedPost; t: Dictionary; locale: Locale; userId: string | null; onDeleted?: (id: string) => void; detail?: boolean };

export function PostCard({ post, t, locale, userId, onDeleted, detail }: Props) {
  const [liked, setLiked] = useState(post.liked);
  const [likes, setLikes] = useState(post.likes_count);
  const [menu, setMenu] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const pt = t.post;
  const mine = userId === post.author.id;
  const name = post.business?.name ?? post.author.full_name;
  const expired = post.is_offer && post.offer_ends_at && new Date(post.offer_ends_at) < new Date();

  const toggleLike = () => {
    if (!userId) return setNote(pt.loginToInteract);
    const next = !liked;
    setLiked(next); setLikes((n) => n + (next ? 1 : -1)); // optimistic
    start(async () => {
      const r = await toggleLikeAction(post.id, next);
      if (!r.ok) { setLiked(!next); setLikes((n) => n + (next ? -1 : 1)); setNote(pt.errors[r.error === "auth" ? "generic" : (r.error as "generic")] ?? pt.errors.generic); }
    });
  };

  const share = async () => {
    const url = `${location.origin}/post/${post.id}`;
    try {
      if (navigator.share) await navigator.share({ title: name, url });
      else { await navigator.clipboard.writeText(url); setNote(pt.copied); setTimeout(() => setNote(null), 2000); }
    } catch {}
  };

  const del = () => {
    setMenu(false);
    if (!confirm(pt.confirmDelete)) return;
    start(async () => { const r = await deletePostAction(post.id); if (r.ok) onDeleted?.(post.id); else setNote(pt.errors.generic); });
  };

  const report = (reason: string) => {
    setReporting(false); setMenu(false);
    start(async () => { const r = await reportAction("post", post.id, reason); setNote(r.ok ? pt.reported : r.error === "auth" ? pt.loginToInteract : pt.errors.generic); });
  };

  const header = (
    <div className="flex items-center gap-3">
      <Avatar src={post.business ? post.business.logo_url : post.author.avatar_url} name={name} square={!!post.business} />
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1 font-bold leading-tight">
          <span className="truncate">{name}</span>
          {post.business?.is_verified && <BadgeCheck className="size-4 shrink-0 text-primary" aria-label={t.common.verified} />}
        </p>
        <p className="text-xs text-muted-foreground">
          <time dateTime={post.created_at} suppressHydrationWarning>{timeAgo(post.created_at, locale)}</time>
        </p>
      </div>
    </div>
  );

  return (
    <Card className="animate-fade-up p-4">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          {post.business ? <Link href={`/business/${post.business.slug}`} className="block hover:opacity-80">{header}</Link> : header}
        </div>
        <div className="relative">
          <button className="grid size-9 place-items-center rounded-full hover:bg-muted" aria-label={pt.more} aria-expanded={menu} onClick={() => setMenu(!menu)}>
            <MoreHorizontal className="size-5" aria-hidden />
          </button>
          {menu && (
            <div className="absolute end-0 top-10 z-20 w-48 overflow-hidden rounded-lg border bg-card text-sm shadow-lg" role="menu">
              {mine && <button role="menuitem" className="flex w-full items-center gap-2 px-3 py-2.5 text-destructive hover:bg-muted" onClick={del}><Trash2 className="size-4" aria-hidden />{pt.delete}</button>}
              {!mine && !reporting && <button role="menuitem" className="flex w-full items-center gap-2 px-3 py-2.5 hover:bg-muted" onClick={() => (userId ? setReporting(true) : (setMenu(false), setNote(pt.loginToInteract)))}><Flag className="size-4" aria-hidden />{pt.report}</button>}
              {reporting && (Object.keys(pt.reasons) as (keyof typeof pt.reasons)[]).map((k) => (
                <button key={k} role="menuitem" className="block w-full px-3 py-2.5 text-start hover:bg-muted" onClick={() => report(k)}>{pt.reasons[k]}</button>
              ))}
            </div>
          )}
        </div>
      </div>

      {post.is_offer && (
        <div className="mt-3 flex items-center gap-2">
          <Badge tone={expired ? "muted" : "accent"}><Tag className="size-3" aria-hidden />{expired ? pt.offerExpired : pt.offer}</Badge>
          {post.offer_ends_at && !expired && <span className="text-xs text-muted-foreground">{pt.offerEnds} {formatDate(post.offer_ends_at, locale)}</span>}
        </div>
      )}

      {post.body.trim() && <p className="mt-3 whitespace-pre-line break-words leading-relaxed">{post.body}</p>}

      {post.media.length > 0 && (
        <div className={cn("mt-3 grid gap-1 overflow-hidden rounded-xl", post.media.length > 1 && "grid-cols-2")}>
          {post.media.map((m, i) => (
            <div key={m.url} className={cn("relative bg-muted", post.media.length === 1 ? "aspect-[4/3]" : "aspect-square", post.media.length === 3 && i === 0 && "row-span-2 aspect-auto")}>
              <Image src={m.url} alt="" fill sizes="(min-width: 768px) 420px, 100vw" className="object-cover" loading={i === 0 && detail ? "eager" : "lazy"} />
            </div>
          ))}
        </div>
      )}

      <div className="mt-3 flex items-center gap-1 border-t pt-2 text-sm">
        <button onClick={toggleLike} disabled={pending} aria-pressed={liked} className={cn("flex h-10 items-center gap-1.5 rounded-lg px-3 font-semibold hover:bg-muted", liked && "text-destructive")}>
          <Heart className={cn("size-5", liked && "fill-current")} aria-hidden />{likes > 0 && <span>{likes}</span>}<span className="sr-only">{pt.like}</span>
        </button>
        <Link href={`/post/${post.id}`} className="flex h-10 items-center gap-1.5 rounded-lg px-3 font-semibold hover:bg-muted">
          <MessageCircle className="size-5" aria-hidden />{post.comments_count > 0 && <span>{post.comments_count}</span>}<span className="sr-only">{pt.comment}</span>
        </Link>
        <button onClick={share} className="ms-auto flex h-10 items-center gap-1.5 rounded-lg px-3 font-semibold hover:bg-muted"><Share2 className="size-5" aria-hidden /><span className="sr-only">{pt.share}</span></button>
      </div>
      {note && <p role="status" className="mt-1 text-xs font-semibold text-muted-foreground">{note} {note === pt.loginToInteract && <Link className="text-primary underline" href="/login">{t.nav.login}</Link>}</p>}
    </Card>
  );
}
