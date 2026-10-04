"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import * as A from "./money-actions";

type R = { ok: boolean };
function useAct() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState(false);
  const go = (fn: () => Promise<R>, confirmText?: string) => { if (confirmText && !confirm(confirmText)) return; start(async () => { const r = await fn(); setErr(!r.ok); if (r.ok) router.refresh(); }); };
  return { pending, err, go };
}

export function ActivateForm({ id, defaultDays }: { id: string; defaultDays: number }) {
  const { pending, err, go } = useAct();
  const [days, setDays] = useState(String(defaultDays));
  const [ref, setRef] = useState("");
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input type="number" min={1} max={3650} value={days} onChange={(e) => setDays(e.target.value)} aria-label="المدة بالأيام" className="h-9 w-24" />
      <Input value={ref} onChange={(e) => setRef(e.target.value)} placeholder="مرجع الدفع (حوالة/إيصال)" aria-label="مرجع الدفع" className="h-9 w-52" maxLength={120} />
      <Button size="sm" variant="success" disabled={pending} onClick={() => go(() => A.activateSubscriptionAction(id, Number(days) || null, ref), "تأكيد استلام المبلغ وتفعيل الباقة؟")}>تأكيد الدفع وتفعيل</Button>
      <Button size="sm" variant="ghost" disabled={pending} onClick={() => go(() => A.rejectRequestAction(id), "رفض الطلب وحذفه؟")}>رفض</Button>
      {err && <span role="alert" className="text-xs font-semibold text-destructive">فشلت العملية</span>}
    </div>
  );
}
export function CancelSub({ id }: { id: string }) {
  const { pending, err, go } = useAct();
  return <span className="inline-flex items-center gap-2"><Button size="sm" variant="destructive" disabled={pending} onClick={() => go(() => A.cancelSubscriptionAction(id), "إلغاء الباقة الآن؟ ستفقد الصفحة مزاياها فوراً.")}>إلغاء الباقة</Button>{err && <span role="alert" className="text-xs text-destructive">فشل</span>}</span>;
}

const sel = "h-10 w-full rounded-lg border border-input bg-card px-2 text-sm";
export function NewAdForm({ businesses, categories }: { businesses: { id: string; name: string }[]; categories: { id: number; name: string }[] }) {
  const router = useRouter();
  const [f, setF] = useState({ businessId: "", placement: "feed", categoryId: "", title: "", body: "", linkUrl: "", endsOn: new Date(Date.now() + 14 * 86400e3).toISOString().slice(0, 10) });
  const [err, setErr] = useState(false);
  const [pending, start] = useTransition();
  const set = (k: keyof typeof f, v: string) => setF((x) => ({ ...x, [k]: v }));
  return (
    <Card className="p-4">
      <form className="grid gap-2 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); start(async () => {
        const r = await A.createAdAction({ businessId: f.businessId || null, placement: f.placement as "feed", categoryId: f.categoryId ? Number(f.categoryId) : null, title: f.title, body: f.body, linkUrl: f.linkUrl, endsOn: f.endsOn });
        setErr(!r.ok); if (r.ok) { setF({ ...f, title: "", body: "", linkUrl: "" }); router.refresh(); }
      }); }}>
        <select value={f.businessId} onChange={(e) => set("businessId", e.target.value)} aria-label="النشاط المعلِن" className={sel}><option value="">بدون نشاط (رابط خارجي)</option>{businesses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select>
        <select value={f.placement} onChange={(e) => set("placement", e.target.value)} aria-label="المكان" className={sel}>{[["feed", "الخلاصة"], ["category", "صفحة قسم"], ["search", "البحث"], ["home_banner", "بانر الرئيسية"]].map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
        {f.placement === "category" && <select value={f.categoryId} onChange={(e) => set("categoryId", e.target.value)} aria-label="القسم" className={sel}><option value="">كل الأقسام</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>}
        <Input value={f.title} onChange={(e) => set("title", e.target.value)} placeholder="عنوان الإعلان" aria-label="العنوان" required minLength={3} maxLength={100} />
        <Input value={f.body} onChange={(e) => set("body", e.target.value)} placeholder="نص قصير" aria-label="النص" maxLength={200} />
        <Input value={f.linkUrl} onChange={(e) => set("linkUrl", e.target.value)} placeholder="https://… (اختياري، وإلا صفحة النشاط)" aria-label="الرابط" dir="ltr" className="text-start" />
        <Input type="date" value={f.endsOn} onChange={(e) => set("endsOn", e.target.value)} aria-label="ينتهي في" required />
        <Button type="submit" disabled={pending} className="sm:col-span-2">إنشاء الإعلان</Button>
        {err && <p role="alert" className="text-sm font-semibold text-destructive sm:col-span-2">تعذّر الإنشاء، تحقق من الحقول</p>}
      </form>
    </Card>
  );
}
export function AdRowActions({ id, active }: { id: string; active: boolean }) {
  const { pending, go } = useAct();
  return (
    <span className="flex gap-2">
      <Button size="sm" variant="outline" disabled={pending} onClick={() => go(() => A.setAdActiveAction(id, !active))}>{active ? "إيقاف" : "تفعيل"}</Button>
      <Button size="sm" variant="destructive" disabled={pending} onClick={() => go(() => A.deleteAdAction(id), "حذف الإعلان؟")}>حذف</Button>
    </span>
  );
}
