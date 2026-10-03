"use client";

import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import * as A from "./collection-actions";

export interface AdminCollection { id: string; slug: string; title: string; description: string | null; status: string; items: { business_id: string; name: string; note: string | null }[] }

export function NewCollection() {
  const router = useRouter();
  const [f, setF] = useState({ title: "", slug: "", description: "" });
  const [err, setErr] = useState(false);
  const [pending, start] = useTransition();
  return (
    <Card className="p-4"><form className="grid gap-2 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await A.createCollectionAction(f); setErr(!r.ok); if (r.ok) { setF({ title: "", slug: "", description: "" }); router.refresh(); } }); }}>
      <Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="عنوان القائمة (مثل: أفضل 5 أماكن فطور)" aria-label="العنوان" required minLength={3} />
      <Input value={f.slug} onChange={(e) => setF({ ...f, slug: e.target.value })} placeholder="slug-english (للرابط)" aria-label="الرابط" dir="ltr" className="text-start" required pattern="[a-zA-Z0-9-]{3,60}" />
      <Input value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} placeholder="وصف قصير" aria-label="الوصف" className="sm:col-span-2" />
      <Button type="submit" disabled={pending} className="sm:col-span-2">إنشاء قائمة (مسودة)</Button>
      {err && <p role="alert" className="text-sm font-semibold text-destructive sm:col-span-2">تعذّر الإنشاء (ربما الرابط مستخدم)</p>}
    </form></Card>
  );
}

export function CollectionEditor({ c, businesses }: { c: AdminCollection; businesses: { id: string; name: string }[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [biz, setBiz] = useState(""); const [note, setNote] = useState("");
  const run = (fn: () => Promise<{ ok: boolean }>, confirmText?: string) => { if (confirmText && !confirm(confirmText)) return; start(async () => { const r = await fn(); if (r.ok) router.refresh(); }); };
  const taken = new Set(c.items.map((i) => i.business_id));
  return (
    <Card className="space-y-3 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="me-auto font-extrabold">{c.title} <span className="text-xs font-normal text-muted-foreground" dir="ltr">/{c.slug}</span></h2>
        <Button size="sm" variant={c.status === "published" ? "outline" : "success"} disabled={pending} onClick={() => run(() => A.setCollectionStatusAction(c.id, c.status === "published" ? "draft" : "published"))}>{c.status === "published" ? "إلغاء النشر" : "نشر"}</Button>
        <Button size="sm" variant="destructive" disabled={pending} onClick={() => run(() => A.deleteCollectionAction(c.id), "حذف القائمة؟")}>حذف</Button>
      </div>
      <ol className="divide-y text-sm">
        {c.items.map((i, idx) => (
          <li key={i.business_id} className="flex items-center gap-2 py-2">
            <span className="w-5 text-muted-foreground">{idx + 1}</span><span className="min-w-0 flex-1 truncate font-semibold">{i.name}{i.note && <span className="ms-2 text-xs font-normal text-muted-foreground">— {i.note}</span>}</span>
            <button aria-label="أعلى" disabled={pending || idx === 0} onClick={() => run(() => A.moveCollectionItemAction(c.id, i.business_id, -1))} className="p-1 disabled:opacity-30"><ArrowUp className="size-4" aria-hidden /></button>
            <button aria-label="أسفل" disabled={pending || idx === c.items.length - 1} onClick={() => run(() => A.moveCollectionItemAction(c.id, i.business_id, 1))} className="p-1 disabled:opacity-30"><ArrowDown className="size-4" aria-hidden /></button>
            <button aria-label="حذف" disabled={pending} onClick={() => run(() => A.removeCollectionItemAction(c.id, i.business_id))} className="p-1 text-muted-foreground hover:text-destructive"><Trash2 className="size-4" aria-hidden /></button>
          </li>
        ))}
      </ol>
      <div className="grid grid-cols-[1fr_1fr_auto] gap-2">
        <select value={biz} onChange={(e) => setBiz(e.target.value)} aria-label="النشاط" className="h-10 rounded-lg border border-input bg-card px-2 text-sm"><option value="">اختر نشاطاً…</option>{businesses.filter((b) => !taken.has(b.id)).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select>
        <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="ملاحظة (اختياري)" aria-label="ملاحظة" maxLength={200} className="h-10" />
        <Button size="sm" disabled={pending || !biz} onClick={() => { run(() => A.addCollectionItemAction(c.id, biz, note)); setBiz(""); setNote(""); }}>إضافة</Button>
      </div>
    </Card>
  );
}
