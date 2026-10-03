"use client";

import { Bookmark } from "lucide-react";
import Link from "next/link";
import { createContext, useCallback, useContext, useMemo, useState, useTransition } from "react";
import { cn } from "@/lib/utils";
import { toggleSaveAction } from "./actions";

export type SavedKind = "business" | "offer" | "event" | "listing";
type Sets = Record<SavedKind, string[]>;
interface Ctx { loggedIn: boolean; has: (k: SavedKind, id: string) => boolean; set: (k: SavedKind, id: string, v: boolean) => void }
const SavedCtx = createContext<Ctx>({ loggedIn: false, has: () => false, set: () => {} });

/** Holds the viewer's saved ids so every card can render its bookmark state without extra queries. */
export function SavedProvider({ initial, loggedIn, children }: { initial: Sets; loggedIn: boolean; children: React.ReactNode }) {
  const [sets, setSets] = useState<Sets>(initial);
  const set = useCallback((k: SavedKind, id: string, v: boolean) => setSets((s) => ({ ...s, [k]: v ? [...new Set([...s[k], id])] : s[k].filter((x) => x !== id) })), []);
  const value = useMemo<Ctx>(() => ({ loggedIn, has: (k, id) => sets[k].includes(id), set }), [loggedIn, sets, set]);
  return <SavedCtx.Provider value={value}>{children}</SavedCtx.Provider>;
}

export function SaveButton({ kind, id, labels, className, withLabel }: { kind: SavedKind; id: string; labels: { save: string; saved: string; login: string }; className?: string; withLabel?: boolean }) {
  const ctx = useContext(SavedCtx);
  const [pending, start] = useTransition();
  const on = ctx.has(kind, id);
  const label = on ? labels.saved : labels.save;
  const cls = cn("relative z-10 inline-flex items-center justify-center gap-1.5 rounded-full font-semibold transition active:scale-90", withLabel ? "h-10 px-4 text-sm border bg-card hover:bg-muted" : "size-9 hover:bg-muted", on && "text-primary", className);
  const icon = <Bookmark className={cn("size-5", on && "fill-current")} aria-hidden />;
  if (!ctx.loggedIn) return <Link href="/login" className={cls} title={labels.login} aria-label={labels.login}>{icon}{withLabel && label}</Link>;
  return (
    <button type="button" aria-pressed={on} aria-label={label} title={label} disabled={pending} className={cls}
      onClick={() => {
        const next = !on;
        ctx.set(kind, id, next);
        if (next && "vibrate" in navigator) navigator.vibrate?.(15);       // tiny haptic on save
        start(async () => { const r = await toggleSaveAction(kind, id); if (r === null) ctx.set(kind, id, !next); else ctx.set(kind, id, r); });
      }}>
      {icon}{withLabel && label}
    </button>
  );
}
