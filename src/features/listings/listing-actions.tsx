"use client";

import { Flag } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { reportAction } from "@/features/feed/actions";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { createClient } from "@/lib/supabase/client";
import { deleteListingAction, setListingStatusAction } from "./actions";

export function TrackListingView({ id }: { id: string }) {
  useEffect(() => { createClient().rpc("track_listing", { p_id: id }).then(() => {}, () => {}); }, [id]);
  return null;
}

/** Owner controls: mark as done / reactivate / delete. */
export function OwnerControls({ id, status, t, redirectTo }: { id: string; status: string; t: Dictionary; redirectTo?: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const L = t.listings;
  return (
    <div className="flex flex-wrap gap-2">
      <Button size="sm" variant="outline" disabled={pending}
        onClick={() => start(async () => { await setListingStatusAction(id, status === "active" ? "sold" : "active"); router.refresh(); })}>
        {status === "active" ? L.markSold : L.reactivate}
      </Button>
      <Button size="sm" variant="destructive" disabled={pending}
        onClick={() => { if (confirm(L.confirmDelete)) start(async () => { await deleteListingAction(id); redirectTo ? router.push(redirectTo) : router.refresh(); }); }}>
        {L.delete}
      </Button>
    </div>
  );
}

export function ReportListing({ id, t, loggedIn }: { id: string; t: Dictionary; loggedIn: boolean }) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [pending, start] = useTransition();
  if (note) return <p role="status" className="text-sm font-semibold text-muted-foreground">{note}</p>;
  return (
    <div className="relative">
      <Button variant="ghost" size="sm" onClick={() => (loggedIn ? setOpen(!open) : setNote(t.post.loginToInteract))} aria-expanded={open}><Flag aria-hidden />{t.post.report}</Button>
      {open && (
        <div className="absolute start-0 top-10 z-20 w-48 overflow-hidden rounded-lg border bg-card text-sm shadow-lg" role="menu">
          {(Object.keys(t.post.reasons) as (keyof typeof t.post.reasons)[]).map((k) => (
            <button key={k} role="menuitem" disabled={pending} className="block w-full px-3 py-2.5 text-start hover:bg-muted"
              onClick={() => start(async () => { const r = await reportAction("listing", id, k); setOpen(false); setNote(r.ok ? t.post.reported : t.post.errors.generic); })}>{t.post.reasons[k]}</button>
          ))}
        </div>
      )}
    </div>
  );
}
