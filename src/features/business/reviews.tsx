"use client";

import { Star, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Avatar } from "@/components/avatar";
import { Stars } from "@/components/stars";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/input";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { timeAgo } from "@/lib/time";
import type { Locale, ReviewRow } from "@/lib/types";
import { cn } from "@/lib/utils";
import { deleteReviewAction, replyReviewAction, saveReviewAction } from "./actions";

interface Props {
  businessId: string; slug: string; reviews: ReviewRow[]; avg: number; count: number;
  userId: string | null; isOwner: boolean; t: Dictionary; locale: Locale;
}

export function ReviewsSection({ businessId, slug, reviews, avg, count, userId, isOwner, t, locale }: Props) {
  const router = useRouter();
  const rt = t.reviews;
  const mine = reviews.find((r) => r.user_id === userId);
  const [editing, setEditing] = useState(false);
  const [rating, setRating] = useState(mine?.rating ?? 0);
  const [body, setBody] = useState(mine?.body ?? "");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [replyFor, setReplyFor] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [pending, start] = useTransition();

  const dist = [5, 4, 3, 2, 1].map((n) => ({ n, c: reviews.filter((r) => r.rating === n).length }));
  const fail = (e: string) => setMsg({ ok: false, text: e === "rate_limited" || e === "account_banned" ? t.post.errors[e] : t.post.errors.generic });

  const save = () => {
    if (rating < 1) return setMsg({ ok: false, text: rt.pickRating });
    start(async () => {
      const r = await saveReviewAction(slug, { businessId, rating, body });
      if (!r.ok) return fail(r.error);
      setMsg({ ok: true, text: rt.sent }); setEditing(false); router.refresh();
    });
  };
  const remove = (id: string) => start(async () => { await deleteReviewAction(slug, id); setRating(0); setBody(""); router.refresh(); });
  const sendReply = (id: string) => start(async () => {
    const r = await replyReviewAction(slug, id, reply);
    if (!r.ok) return fail(r.error);
    setReplyFor(null); setReply(""); router.refresh();
  });

  const form = (
    <div className="space-y-3 rounded-xl bg-muted p-3">
      <p className="text-sm font-bold">{rt.yourRating}</p>
      <div className="flex gap-1" role="radiogroup" aria-label={rt.yourRating}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n}`} onClick={() => setRating(n)} className="p-1">
            <Star className={cn("size-8 transition", n <= rating ? "fill-accent text-accent" : "text-muted-foreground/40")} aria-hidden />
          </button>
        ))}
      </div>
      <Textarea value={body} onChange={(e) => setBody(e.target.value)} maxLength={1500} placeholder={rt.placeholder} aria-label={rt.placeholder} />
      <div className="flex gap-2">
        <Button onClick={save} disabled={pending}>{mine ? rt.update : rt.submit}</Button>
        {mine && <Button variant="ghost" onClick={() => setEditing(false)}>{t.post.cancel}</Button>}
      </div>
    </div>
  );

  return (
    <Card className="space-y-4 p-4" id="reviews">
      <h2 className="font-extrabold">{rt.title}</h2>

      {count > 0 && (
        <div className="flex items-center gap-4">
          <div className="text-center">
            <p className="text-4xl font-extrabold">{avg.toFixed(1)}</p>
            <Stars value={avg} />
            <p className="mt-1 text-xs text-muted-foreground">{count}</p>
          </div>
          <ul className="flex-1 space-y-1" aria-hidden>
            {dist.map(({ n, c }) => (
              <li key={n} className="flex items-center gap-2 text-xs">
                <span className="w-3 text-center">{n}</span>
                <span className="h-2 flex-1 overflow-hidden rounded-full bg-muted"><span className="block h-full bg-accent" style={{ width: `${reviews.length ? (c / reviews.length) * 100 : 0}%` }} /></span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!userId ? (
        <Link href={`/login?next=/business/${slug}`} className="block rounded-xl bg-muted p-3 text-center text-sm font-bold text-primary">{rt.loginToReview}</Link>
      ) : isOwner ? (
        <p className="text-sm text-muted-foreground">{rt.ownerCannot}</p>
      ) : mine && !editing ? (
        <Button variant="outline" size="sm" onClick={() => setEditing(true)}>{rt.edit}</Button>
      ) : form}

      {msg && <p role={msg.ok ? "status" : "alert"} className={cn("text-sm font-semibold", msg.ok ? "text-success" : "text-destructive")}>{msg.text}</p>}

      {reviews.length === 0 ? <p className="text-sm text-muted-foreground">{rt.noReviews}</p> : (
        <ul className="divide-y">
          {reviews.map((r) => (
            <li key={r.id} className="space-y-2 py-4 first:pt-0">
              <div className="flex items-center gap-3">
                <Avatar src={r.author.avatar_url} name={r.author.full_name} size={36} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{r.author.full_name || "—"}</p>
                  <p className="flex items-center gap-2 text-xs text-muted-foreground"><Stars value={r.rating} size={13} /><time dateTime={r.created_at} suppressHydrationWarning>{timeAgo(r.created_at, locale)}</time></p>
                </div>
                {r.user_id === userId && <button onClick={() => remove(r.id)} disabled={pending} aria-label={rt.delete} title={rt.delete} className="text-muted-foreground hover:text-destructive"><Trash2 className="size-4" aria-hidden /></button>}
              </div>
              {r.body && <p className="whitespace-pre-line break-words text-sm leading-relaxed">{r.body}</p>}
              {r.owner_reply && (
                <div className="ms-6 rounded-xl border-s-4 border-primary bg-primary/5 p-3 text-sm">
                  <p className="mb-1 text-xs font-bold text-primary">{rt.ownerReply}</p>
                  <p className="whitespace-pre-line break-words">{r.owner_reply}</p>
                </div>
              )}
              {isOwner && !r.owner_reply && (
                replyFor === r.id ? (
                  <div className="ms-6 space-y-2">
                    <Textarea value={reply} onChange={(e) => setReply(e.target.value)} maxLength={1000} placeholder={rt.replyPlaceholder} aria-label={rt.replyPlaceholder} className="min-h-16" />
                    <div className="flex gap-2"><Button size="sm" onClick={() => sendReply(r.id)} disabled={pending || !reply.trim()}>{t.post.send}</Button><Button size="sm" variant="ghost" onClick={() => setReplyFor(null)}>{t.post.cancel}</Button></div>
                  </div>
                ) : <Button size="sm" variant="ghost" className="ms-6" onClick={() => { setReplyFor(r.id); setReply(""); }}>{rt.reply}</Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
