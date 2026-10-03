"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { deleteAccountAction } from "@/app/(main)/account/actions";

export function DeleteAccountForm({ d }: { d: Dictionary["misc"]["del"] }) {
  const [word, setWord] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); setErr(null); start(async () => { const r = await deleteAccountAction(); if (r) setErr(r === "last_admin" ? d.lastAdmin : d.error); }); }}>
      <div><Label htmlFor="del">{d.confirm.replace("{word}", d.word)}</Label><Input id="del" value={word} onChange={(e) => setWord(e.target.value)} autoComplete="off" /></div>
      <Button type="submit" variant="destructive" className="w-full" disabled={pending || word.trim() !== d.word}>{d.button}</Button>
      {err && <p role="alert" className="text-sm font-semibold text-destructive">{err}</p>}
    </form>
  );
}
