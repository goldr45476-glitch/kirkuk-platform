"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import type { AdminBusiness, AdminUser } from "@/lib/data-admin";
import { LocationPicker, type LatLng } from "@/features/suggest/location-picker-loader";
import { uploadImage } from "@/features/feed/upload";
import * as A from "./actions";

type R = { ok: boolean };
function useAct() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState(false);
  const go = (fn: () => Promise<R>, confirmText?: string) => {
    if (confirmText && !confirm(confirmText)) return;
    start(async () => { const r = await fn(); setErr(!r.ok); if (r.ok) router.refresh(); });
  };
  return { pending, err, go };
}
const Err = ({ show }: { show: boolean }) => (show ? <span role="alert" className="text-xs font-semibold text-destructive">فشلت العملية</span> : null);

export function SubmissionActions({ id }: { id: string }) {
  const { pending, err, go } = useAct();
  const [note, setNote] = useState("");
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button size="sm" variant="success" disabled={pending} onClick={() => go(() => A.approveSubmissionAction(id))}>موافقة ونشر</Button>
      <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="سبب الرفض (اختياري)" className="h-9 w-44" aria-label="سبب الرفض" />
      <Button size="sm" variant="destructive" disabled={pending} onClick={() => go(() => A.rejectSubmissionAction(id, note))}>رفض</Button><Err show={err} />
    </div>
  );
}
export function ClaimActions({ id }: { id: string }) {
  const { pending, err, go } = useAct();
  return (
    <div className="flex gap-2">
      <Button size="sm" variant="success" disabled={pending} onClick={() => go(() => A.reviewClaimAction(id, true), "نقل ملكية الصفحة لهذا المستخدم؟")}>قبول (نقل الملكية)</Button>
      <Button size="sm" variant="destructive" disabled={pending} onClick={() => go(() => A.reviewClaimAction(id, false))}>رفض</Button><Err show={err} />
    </div>
  );
}
export function ReportActions({ id, hideLabel }: { id: string; hideLabel: string }) {
  const { pending, err, go } = useAct();
  return (
    <div className="flex flex-wrap gap-2">
      <Button size="sm" variant="destructive" disabled={pending} onClick={() => go(() => A.moderateReportAction(id, "hide"), "إخفاء المحتوى المُبلَّغ عنه؟")}>{hideLabel}</Button>
      <Button size="sm" variant="outline" disabled={pending} onClick={() => go(() => A.moderateReportAction(id, "resolve"))}>تمت المعالجة</Button>
      <Button size="sm" variant="ghost" disabled={pending} onClick={() => go(() => A.moderateReportAction(id, "dismiss"))}>تجاهل</Button><Err show={err} />
    </div>
  );
}
export function EventActions({ id }: { id: string }) {
  const { pending, err, go } = useAct();
  return (
    <div className="flex gap-2">
      <Button size="sm" variant="success" disabled={pending} onClick={() => go(() => A.moderateEventAction(id, "published"))}>نشر</Button>
      <Button size="sm" variant="destructive" disabled={pending} onClick={() => go(() => A.moderateEventAction(id, "hidden"))}>إخفاء</Button><Err show={err} />
    </div>
  );
}

export function BusinessAdminActions({ b }: { b: AdminBusiness }) {
  const { pending, err, go } = useAct();
  const featured = b.is_featured && (!b.featured_until || new Date(b.featured_until) > new Date());
  return (
    <div className="flex flex-wrap gap-1.5">
      {b.status !== "active" && <Button size="sm" variant="success" disabled={pending} onClick={() => go(() => A.setBusinessStateAction(b.id, { status: "active" }))}>تفعيل</Button>}
      {b.status !== "suspended" && <Button size="sm" variant="destructive" disabled={pending} onClick={() => go(() => A.setBusinessStateAction(b.id, { status: "suspended" }), "إيقاف هذه الصفحة؟")}>إيقاف</Button>}
      <Button size="sm" variant="outline" disabled={pending} onClick={() => go(() => A.markVerifiedAction(b.id))}>تحققنا الآن</Button>
      <Button size="sm" variant="outline" disabled={pending} onClick={() => go(() => A.setBusinessStateAction(b.id, { verified: !b.is_verified }))}>{b.is_verified ? "إلغاء الشارة" : "منح شارة موثّق"}</Button>
      <Button size="sm" variant="accent" disabled={pending} onClick={() => go(() => A.setBusinessStateAction(b.id, { featuredDays: featured ? 0 : 30 }))}>{featured ? "إلغاء التمييز" : "تمييز 30 يوماً"}</Button><Err show={err} />
    </div>
  );
}

export function UserAdminActions({ u, isAdmin, selfId }: { u: AdminUser; isAdmin: boolean; selfId: string }) {
  const { pending, err, go } = useAct();
  if (u.id === selfId) return <span className="text-xs text-muted-foreground">أنت</span>;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button size="sm" variant={u.is_banned ? "outline" : "destructive"} disabled={pending || (u.role === "admin" && !isAdmin)} onClick={() => go(() => A.setUserAction(u.id, { banned: !u.is_banned }), u.is_banned ? undefined : "حظر هذا المستخدم؟")}>{u.is_banned ? "رفع الحظر" : "حظر"}</Button>
      {isAdmin && (
        <select aria-label="الدور" value={u.role} disabled={pending} onChange={(e) => go(() => A.setUserAction(u.id, { role: e.target.value }), "تغيير دور المستخدم؟")} className="h-9 rounded-lg border border-input bg-card px-2 text-sm">
          {[["user", "مستخدم"], ["owner", "صاحب نشاط"], ["moderator", "مشرف"], ["admin", "مدير"]].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      )}<Err show={err} />
    </div>
  );
}

const sel = "h-11 w-full rounded-lg border border-input bg-card px-3 text-base";
/** Fast entry for the field team: GPS, optional photo, hours preset — one tap to publish a verified place. */
export function QuickAddForm({ categories, districts, center }: { categories: { id: number; label: string }[]; districts: { id: number; label: string }[]; center: LatLng }) {
  const [f, setF] = useState({ name: "", categoryId: "", districtId: "", phone: "", address: "", open: "09:00", close: "22:00", priceLevel: "" });
  const [pos, setPos] = useState<LatLng | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string; slug?: string } | null>(null);
  const [pending, start] = useTransition();
  const set = (k: keyof typeof f, v: string) => setF((x) => ({ ...x, [k]: v }));

  const submit = () => {
    if (!pos || !f.name || !f.categoryId) return setMsg({ ok: false, text: "الاسم والتصنيف والموقع مطلوبة" });
    start(async () => {
      const r = await A.quickAddAction({ name: f.name, categoryId: Number(f.categoryId), districtId: f.districtId ? Number(f.districtId) : null, lat: pos.lat, lng: pos.lng, phone: f.phone, address: f.address, open: f.open, close: f.close, priceLevel: f.priceLevel ? Number(f.priceLevel) : null, photoUrl: photo });
      if (!r.ok) return setMsg({ ok: false, text: "تعذّر الحفظ" });
      setMsg({ ok: true, text: "تمت الإضافة والتحقق", slug: r.data?.slug });
      setF((x) => ({ ...x, name: "", phone: "", address: "" })); setPhoto(null);
    });
  };

  return (
    <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); submit(); }}>
      <div><Label htmlFor="q-n">اسم المكان</Label><Input id="q-n" value={f.name} onChange={(e) => set("name", e.target.value)} required maxLength={120} /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label htmlFor="q-c">التصنيف</Label><select id="q-c" value={f.categoryId} onChange={(e) => set("categoryId", e.target.value)} className={sel} required><option value="">—</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</select></div>
        <div><Label htmlFor="q-d">الحي</Label><select id="q-d" value={f.districtId} onChange={(e) => set("districtId", e.target.value)} className={sel}><option value="">—</option>{districts.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</select></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label htmlFor="q-p">الهاتف</Label><Input id="q-p" type="tel" dir="ltr" className="text-start" value={f.phone} onChange={(e) => set("phone", e.target.value)} /></div>
        <div><Label htmlFor="q-pl">مستوى السعر</Label><select id="q-pl" value={f.priceLevel} onChange={(e) => set("priceLevel", e.target.value)} className={sel}><option value="">—</option>{[1, 2, 3, 4].map((n) => <option key={n} value={n}>{"$".repeat(n)}</option>)}</select></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label htmlFor="q-o">يفتح</Label><Input id="q-o" type="time" dir="ltr" className="text-start" value={f.open} onChange={(e) => set("open", e.target.value)} /></div>
        <div><Label htmlFor="q-cl">يغلق</Label><Input id="q-cl" type="time" dir="ltr" className="text-start" value={f.close} onChange={(e) => set("close", e.target.value)} /></div>
      </div>
      <div><Label htmlFor="q-a">العنوان / أقرب معلم</Label><Input id="q-a" value={f.address} onChange={(e) => set("address", e.target.value)} maxLength={200} /></div>
      <div><Label>الموقع (زر «موقعي» يستخدم GPS)</Label><LocationPicker value={pos} onChange={setPos} center={center} hint="اضغط على الخريطة" myLocation="موقعي" /></div>
      <div>
        <Label htmlFor="q-ph">صورة (كاميرا الهاتف)</Label>
        <input id="q-ph" type="file" accept="image/*" capture="environment" disabled={busy} className="block w-full text-sm file:me-3 file:rounded-lg file:border-0 file:bg-muted file:px-4 file:py-2.5 file:font-semibold"
          onChange={async (e) => { const file = e.target.files?.[0]; if (!file) return; setBusy(true); try { setPhoto((await uploadImage(file, "business-media")).url); } catch { setMsg({ ok: false, text: "فشل رفع الصورة" }); } setBusy(false); }} />
        {photo && <p className="mt-1 text-xs font-semibold text-success">✓ تم رفع الصورة</p>}
      </div>
      <Button type="submit" size="lg" className="w-full" disabled={pending || busy}>إضافة وتحقق</Button>
      {msg && <p role={msg.ok ? "status" : "alert"} className={msg.ok ? "text-sm font-semibold text-success" : "text-sm font-semibold text-destructive"}>{msg.text}{msg.slug && <> — <a className="underline" href={`/business/${msg.slug}`}>عرض</a></>}</p>}
    </form>
  );
}
