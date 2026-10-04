"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { cn } from "@/lib/utils";
import { cancelSubscriptionRequestAction, requestSubscriptionAction } from "./actions";

export interface PanelBusiness {
  id: string; name: string; activePlan: string; activeUntil: string | null;
  pending: { id: string; plan: string } | null;
}
export interface PanelPlan { code: "pro" | "featured"; name: string; price: number; days: number }

/** Current plan + manual upgrade request (payment confirmed by the team, then activated from /admin). */
export function SubscriptionPanel({ business: b, plans, t, activeLabel }: { business: PanelBusiness; plans: PanelPlan[]; t: Dictionary; activeLabel: string }) {
  const m = t.money;
  const router = useRouter();
  const [plan, setPlan] = useState<"pro" | "featured">(plans[0]?.code ?? "pro");
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const planName = (code: string) => m.planNames[code as keyof typeof m.planNames] ?? code;

  return (
    <div className="space-y-3 rounded-xl border bg-card p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="me-auto font-bold">{b.name}</h3>
        <Badge tone={b.activePlan === "free" ? "muted" : "success"}>{m.current}: {planName(b.activePlan)}</Badge>
      </div>
      {b.activeUntil && b.activePlan !== "free" && <p className="text-xs text-muted-foreground">{activeLabel}</p>}
      {b.pending ? (
        <div className="space-y-2">
          <p role="status" className="rounded-lg bg-accent/15 p-3 text-sm font-semibold">{m.pending}: {planName(b.pending.plan)} — {m.requested}</p>
          <Button size="sm" variant="ghost" disabled={pending} onClick={() => start(async () => { const r = await cancelSubscriptionRequestAction(b.pending!.id); if (r.ok) router.refresh(); })}>{m.cancelRequest}</Button>
        </div>
      ) : (
        <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); start(async () => {
          const r = await requestSubscriptionAction(b.id, plan, note);
          setMsg(r.ok ? { ok: true, text: m.requested } : { ok: false, text: t.post.errors.generic });
          if (r.ok) { setNote(""); router.refresh(); }
        }); }}>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={m.plan}>
            {plans.map((p) => (
              <button key={p.code} type="button" role="radio" aria-checked={plan === p.code} onClick={() => setPlan(p.code)}
                className={cn("rounded-full border px-3 py-1.5 text-sm font-bold", plan === p.code ? "border-transparent bg-primary text-primary-foreground" : "bg-card hover:bg-muted")}>
                {p.name} · {new Intl.NumberFormat("en-US").format(p.price)}
              </button>
            ))}
          </div>
          <Input value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} placeholder={m.note} aria-label={m.note} />
          <Button type="submit" disabled={pending}>{m.request}</Button>
        </form>
      )}
      {msg && !b.pending && <p role={msg.ok ? "status" : "alert"} className={msg.ok ? "text-sm font-semibold text-success" : "text-sm font-semibold text-destructive"}>{msg.text}</p>}
    </div>
  );
}
