"use client";

import { Check, Flag, Heart, Share2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { toggleFollowAction } from "@/app/(main)/business/actions";
import { reportAction } from "@/features/feed/actions";
import { Button } from "@/components/ui/button";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { createClient } from "@/lib/supabase/client";

/** Counts a page view once per mount. Fire-and-forget; failures are harmless. */
export function TrackView({ id }: { id: string }) {
  useEffect(() => {
    createClient().rpc("track_event", { p_event: "view", p_type: "business", p_id: id }).then(() => {}, () => {});
  }, [id]);
  return null;
}

/** Link (tel:/wa.me) that counts a call-click before navigating. */
export function TrackedLink({ id, href, className, children, external, event = "call" }: {
  id: string; href: string; className?: string; children: React.ReactNode; external?: boolean; event?: "call" | "whatsapp" | "directions";
}) {
  return (
    <a
      href={href}
      className={className}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      onClick={() => { createClient().rpc("track_event", { p_event: event, p_type: "business", p_id: id }).then(() => {}, () => {}); }}
    >
      {children}
    </a>
  );
}

export function FollowShare({ businessId, slug, name, initialFollowing, t }: {
  businessId: string; slug: string; name: string; initialFollowing: boolean | null; t: Dictionary["business"];
}) {
  const [following, setFollowing] = useState(!!initialFollowing);
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();

  const share = async () => {
    const url = location.href;
    try {
      if (navigator.share) return await navigator.share({ title: name, url });
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <div className="flex gap-2">
      {initialFollowing === null ? (
        <Button asChild variant="outline" className="flex-1"><Link href={`/login?next=/business/${slug}`}><Heart aria-hidden />{t.loginToFollow}</Link></Button>
      ) : (
        <Button
          variant={following ? "outline" : "default"} className="flex-1" disabled={pending} aria-pressed={following}
          onClick={() => start(async () => { const r = await toggleFollowAction(businessId, slug); if (r !== null) setFollowing(r); })}
        >
          <Heart className={following ? "fill-primary text-primary" : ""} aria-hidden />{following ? t.following : t.follow}
        </Button>
      )}
      <Button variant="outline" onClick={share} aria-live="polite">
        {copied ? <Check aria-hidden /> : <Share2 aria-hidden />}{copied ? t.copied : t.share}
      </Button>
    </div>
  );
}

/** "المعلومة غلط؟" — files a wrong_info report that lands in the moderation queue. */
export function ReportWrongInfo({ businessId, loggedIn, t }: { businessId: string; loggedIn: boolean; t: Dictionary }) {
  const [state, setState] = useState<"idle" | "sent" | "login" | "error">("idle");
  const [pending, start] = useTransition();
  if (state === "sent") return <p role="status" className="text-xs font-semibold text-success">{t.trust.wrongThanks}</p>;
  if (state === "login") return <Link href="/login" className="text-xs font-bold text-primary underline">{t.post.loginToInteract}</Link>;
  return (
    <button disabled={pending} className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground"
      onClick={() => (!loggedIn ? setState("login") : start(async () => { const r = await reportAction("business", businessId, "wrong_info"); setState(r.ok ? "sent" : "error"); }))}>
      <Flag className="size-3.5" aria-hidden />{t.trust.wrongInfo}{state === "error" && ` — ${t.post.errors.generic}`}
    </button>
  );
}
