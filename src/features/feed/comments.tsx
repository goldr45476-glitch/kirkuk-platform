"use client";

import { Send, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Avatar } from "@/components/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { timeAgo } from "@/lib/time";
import type { CommentRow, Locale } from "@/lib/types";
import { addCommentAction, deleteCommentAction } from "./actions";

export function Comments({ postId, comments, t, locale, userId }: { postId: string; comments: CommentRow[]; t: Dictionary; locale: Locale; userId: string | null }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const send = () => {
    if (!body.trim()) return;
    setError(null);
    start(async () => {
      const r = await addCommentAction(postId, body);
      if (!r.ok) return setError(r.error === "rate_limited" || r.error === "account_banned" ? t.post.errors[r.error] : t.post.errors.generic);
      setBody(""); router.refresh();
    });
  };
  const del = (id: string) => start(async () => { await deleteCommentAction(id, postId); router.refresh(); });

  return (
    <section aria-labelledby="comments-h" className="space-y-4">
      <h2 id="comments-h" className="font-extrabold">{t.post.comments} ({comments.length})</h2>
      {comments.length === 0 ? <p className="text-sm text-muted-foreground">{t.post.noComments}</p> : (
        <ul className="space-y-3">
          {comments.map((c) => (
            <li key={c.id} className="flex gap-3">
              <Avatar src={c.author.avatar_url} name={c.author.full_name} size={36} />
              <div className="min-w-0 flex-1 rounded-2xl bg-muted px-3 py-2">
                <p className="flex items-center gap-2 text-sm"><span className="font-bold">{c.author.full_name || "—"}</span><time className="text-xs text-muted-foreground" dateTime={c.created_at} suppressHydrationWarning>{timeAgo(c.created_at, locale)}</time></p>
                <p className="whitespace-pre-line break-words">{c.body}</p>
              </div>
              {userId === c.author.id && <button onClick={() => del(c.id)} disabled={pending} aria-label={t.post.delete} className="self-center text-muted-foreground hover:text-destructive"><Trash2 className="size-4" aria-hidden /></button>}
            </li>
          ))}
        </ul>
      )}
      {userId ? (
        <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex gap-2">
          <Input value={body} onChange={(e) => setBody(e.target.value)} maxLength={1000} placeholder={t.post.writeComment} aria-label={t.post.writeComment} />
          <Button type="submit" size="icon" disabled={pending || !body.trim()} aria-label={t.post.send}><Send className="rtl:-scale-x-100" aria-hidden /></Button>
        </form>
      ) : (
        <p className="text-sm"><Link className="font-bold text-primary underline" href={`/login?next=/post/${postId}`}>{t.post.loginToInteract}</Link></p>
      )}
      {error && <p role="alert" className="text-sm font-semibold text-destructive">{error}</p>}
    </section>
  );
}
