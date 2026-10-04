import { Badge, Card } from "@/components/ui/card";
import { ActivateForm, CancelSub } from "@/features/admin/money-ui";
import { createClient } from "@/lib/supabase/server";
import { formatDate, timeAgo } from "@/lib/time";

interface Row { id: string; status: string; starts_at: string | null; ends_at: string | null; amount_iqd: number | null; note: string | null; payment_ref: string | null; created_at: string;
  business: { name: string; slug: string; owner: { full_name: string; phone: string | null } | null } | null; plan: { code: string; name_ar: string; duration_days: number } | null }

export default async function AdminSubscriptions() {
  const supabase = await createClient();
  await supabase.rpc("sync_subscriptions");           // expire what has ended before we list
  const { data } = await supabase.from("subscriptions")
    .select("id, status, starts_at, ends_at, amount_iqd, note, payment_ref, created_at, business:businesses(name, slug, owner:profiles!businesses_owner_id_fkey(full_name, phone)), plan:plans(code, name_ar, duration_days)")
    .in("status", ["pending", "active"]).order("created_at", { ascending: false }).limit(100);
  const rows = (data ?? []) as unknown as Row[];
  const pending = rows.filter((r) => r.status === "pending"), active = rows.filter((r) => r.status === "active");
  const money = (n: number | null) => (n == null ? "" : new Intl.NumberFormat("ar-IQ").format(n) + " د.ع");
  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">التفعيل لمدير النظام فقط. ثبّت استلام المبلغ (نقداً أو حوالة) ثم فعّل؛ تُرفَع حدود الصور والعروض فوراً، والباقة المميزة تُظهر الصفحة أعلى النتائج.</p>
      <section className="space-y-3"><h1 className="text-lg font-extrabold">طلبات بانتظار الدفع <Badge tone="accent">{pending.length}</Badge></h1>
        {pending.length === 0 ? <p className="text-sm text-muted-foreground">لا توجد طلبات.</p> : pending.map((r) => (
          <Card key={r.id} className="space-y-2 p-4">
            <p className="font-bold">{r.business?.name} <Badge tone="primary">{r.plan?.name_ar}</Badge> <span className="text-sm font-normal">{money(r.amount_iqd)}</span></p>
            <p className="text-sm text-muted-foreground">المالك: {r.business?.owner?.full_name || "—"} <bdi dir="ltr">{r.business?.owner?.phone}</bdi> · <time suppressHydrationWarning>{timeAgo(r.created_at, "ar")}</time></p>
            {r.note && <p className="rounded-lg bg-muted p-2 text-sm">ملاحظة: {r.note}</p>}
            <ActivateForm id={r.id} defaultDays={r.plan?.duration_days ?? 30} />
          </Card>
        ))}</section>
      <section className="space-y-3"><h2 className="text-lg font-extrabold">باقات فعّالة <Badge tone="success">{active.length}</Badge></h2>
        {active.map((r) => (
          <Card key={r.id} className="flex flex-wrap items-center gap-2 p-4">
            <span className="me-auto font-bold">{r.business?.name} <Badge tone="primary">{r.plan?.name_ar}</Badge></span>
            <span className="text-xs text-muted-foreground">حتى {r.ends_at ? formatDate(r.ends_at, "ar") : "—"}{r.payment_ref && ` · ${r.payment_ref}`}</span>
            <CancelSub id={r.id} />
          </Card>
        ))}</section>
    </div>
  );
}
