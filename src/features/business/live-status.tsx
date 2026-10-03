"use client";

import { CalendarPlus, Check, CircleSlash, Clock4 } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { cn } from "@/lib/utils";
import { addDutyAction, reportServiceStatusAction } from "./actions";

export function StatusReport({ businessId, loggedIn, t }: { businessId: string; loggedIn: boolean; t: Dictionary }) {
  const router = useRouter();
  const path = usePathname();
  const lt = t.live;
  const [open, setOpen] = useState(false);
  const [queue, setQueue] = useState(1);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  if (!loggedIn) return <Link href={`/login?next=${path}`} className="text-sm font-bold text-primary underline">{lt.loginToReport}</Link>;
  const send = (status: "available" | "unavailable" | "queue") => start(async () => {
    const r = await reportServiceStatusAction({ businessId, status, queue: status === "queue" ? queue : null });
    setNote(r.ok ? { ok: true, text: lt.reportThanks } : { ok: false, text: r.error === "rate_limited" ? t.post.errors.rate_limited : t.post.errors.generic });
    if (r.ok) { setOpen(false); router.refresh(); }
  });

  return (
    <div className="space-y-2">
      {!open ? <Button size="sm" variant="outline" onClick={() => setOpen(true)}>{lt.report}</Button> : (
        <div className="space-y-2 rounded-xl bg-muted p-3">
          <div className="grid grid-cols-3 gap-2">
            <Button size="sm" variant="success" disabled={pending} onClick={() => send("available")}><Check aria-hidden />{lt.status.available}</Button>
            <Button size="sm" variant="destructive" disabled={pending} onClick={() => send("unavailable")}><CircleSlash aria-hidden />{lt.status.unavailable}</Button>
            <Button size="sm" variant="accent" disabled={pending} onClick={() => send("queue")}><Clock4 aria-hidden />{lt.status.queue}</Button>
          </div>
          <label className="block text-xs font-semibold">{lt.queueLevel}: {lt.queue[queue]}
            <input type="range" min={0} max={3} value={queue} onChange={(e) => setQueue(+e.target.value)} className="mt-1 w-full accent-[hsl(var(--primary))]" />
          </label>
        </div>
      )}
      {note && <p role={note.ok ? "status" : "alert"} className={cn("text-xs font-semibold", note.ok ? "text-success" : "text-destructive")}>{note.text}</p>}
    </div>
  );
}

/** Lets a pharmacy owner publish their duty days. */
export function DutyForm({ pharmacies, t }: { pharmacies: { id: string; name: string }[]; t: Dictionary }) {
  const router = useRouter();
  const lt = t.live;
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Baghdad" }).format(new Date());
  const [biz, setBiz] = useState(pharmacies[0]?.id ?? "");
  const [date, setDate] = useState(today);
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  return (
    <form className="space-y-3 rounded-xl border bg-card p-4" onSubmit={(e) => {
      e.preventDefault();
      start(async () => {
        const r = await addDutyAction({ businessId: biz, date, note });
        setMsg({ ok: r.ok, text: r.ok ? lt.dutyAdded : t.post.errors.generic });
        if (r.ok) { setNote(""); router.refresh(); }
      });
    }}>
      <p className="flex items-center gap-2 font-extrabold"><CalendarPlus className="size-5" aria-hidden />{lt.addDuty}</p>
      {pharmacies.length > 1 && (
        <select value={biz} onChange={(e) => setBiz(e.target.value)} aria-label={lt.addDuty} className="h-11 w-full rounded-lg border border-input bg-card px-3">
          {pharmacies.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <Input type="date" value={date} min={today} onChange={(e) => setDate(e.target.value)} aria-label={lt.dutyDate} required />
        <Input value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} placeholder={lt.dutyNote} aria-label={lt.dutyNote} />
      </div>
      <Button type="submit" disabled={pending}>{lt.send}</Button>
      {msg && <p role={msg.ok ? "status" : "alert"} className={cn("text-sm font-semibold", msg.ok ? "text-success" : "text-destructive")}>{msg.text}</p>}
    </form>
  );
}
