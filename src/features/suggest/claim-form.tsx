"use client";

import { useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { uploadPrivate } from "@/features/feed/upload";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { createClaimAction } from "./actions";

export function ClaimForm({ businessId, t }: { businessId: string; t: Dictionary }) {
  const c = t.claim;
  const file = useRef<HTMLInputElement>(null);
  const [phone, setPhone] = useState("");
  const [proof, setProof] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  const pick = async (f: File | undefined) => {
    if (!f) return;
    setBusy(true); setMsg(null);
    try { setProof(await uploadPrivate(f)); } catch { setMsg({ ok: false, text: c.uploadError }); }
    setBusy(false);
  };
  const submit = () => start(async () => {
    const r = await createClaimAction({ businessId, phone, proofPath: proof ?? "" });
    setMsg(r.ok ? { ok: true, text: c.sent } : { ok: false, text: r.error === "invalid" ? c.already : t.post.errors.generic });
  });

  return (
    <Card className="space-y-4 p-4">
      <p className="text-sm text-muted-foreground">{c.intro}</p>
      <div><Label htmlFor="cp">{c.phone}</Label><Input id="cp" type="tel" dir="ltr" className="text-start" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="07701234567" /></div>
      <div>
        <Label htmlFor="cf">{c.proof}</Label>
        <input ref={file} id="cf" type="file" accept="image/*" onChange={(e) => pick(e.target.files?.[0])} disabled={busy}
          className="block w-full text-sm file:me-3 file:rounded-lg file:border-0 file:bg-muted file:px-4 file:py-2.5 file:font-semibold" />
        {proof && <p className="mt-1 text-xs font-semibold text-success">✓</p>}
      </div>
      <Button className="w-full" disabled={pending || busy || !proof || phone.length < 7} onClick={submit}>{c.submit}</Button>
      {msg && <p role={msg.ok ? "status" : "alert"} className={msg.ok ? "text-sm font-semibold text-success" : "text-sm font-semibold text-destructive"}>{msg.text}</p>}
    </Card>
  );
}
