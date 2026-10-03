"use client";

import { Check, Heart, Share2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { toggleFollowAction } from "@/app/(main)/business/actions";
import { Button } from "@/components/ui/button";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { createClient } from "@/lib/supabase/client";

/** Counts a page view once per mount. Fire-and-forget; failures are harmless. */
export function TrackView({ id }: { id: string }) {
  useEffect(() => {
    createClient().rpc("track_business", { p_id: id, p_kind: "view" }).then(() => {}, () => {});
  }, [id]);
  return null;
}

/** Link (tel:/wa.me) that counts a call-click before navigating. */
export function TrackedLink({ id, href, className, children, external }: {
  id: string; href: string; className?: string; children: React.ReactNode; external?: boolean;
}) {
  return (
    <a
      href={href}
      className={className}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      onClick={() => { createClient().rpc("track_business", { p_id: id, p_kind: "call" }).then(() => {}, () => {}); }}
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
