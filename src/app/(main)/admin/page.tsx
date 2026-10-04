import Link from "next/link";
import { Card } from "@/components/ui/card";
import { getOverview } from "@/lib/data-admin";
import { createClient } from "@/lib/supabase/server";

export default async function AdminOverview() {
  const o = await getOverview();
  const { count: pendingSubs } = await (await createClient()).from("subscriptions").select("id", { count: "exact", head: true }).eq("status", "pending");
  if (!o) return <p className="text-sm text-muted-foreground">تعذّر تحميل الإحصائيات</p>;
  const todo = [
    ["اقتراحات أماكن", o.pending_submissions, "/admin/review#submissions"], ["مطالبات بالصفحات", o.pending_claims, "/admin/review#claims"],
    ["بلاغات مفتوحة", o.open_reports, "/admin/review#reports"], ["فعاليات بانتظار المراجعة", o.pending_events, "/admin/review#events"],
    ["صفحات بانتظار التفعيل", o.pending_businesses, "/admin/businesses?filter=pending"], ["طلبات اشتراك", pendingSubs ?? 0, "/admin/subscriptions"],
  ] as const;
  const health = [
    ["أنشطة منشورة", o.businesses], ["غير متحقق منها", o.unverified], ["لم تُحدَّث منذ 60 يوماً", o.stale],
    ["المستخدمون", o.users], ["نشطون أسبوعياً", o.weekly_active], ["أحداث 7 أيام", o.events_7d], ["اتصال/اتجاهات 7 أيام", o.contacts_7d],
  ] as const;
  return (
    <div className="space-y-6">
      <section aria-labelledby="todo"><h1 id="todo" className="mb-3 text-xl font-extrabold">بانتظار الإجراء</h1>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {todo.map(([label, n, href]) => (
            <li key={label}><Link href={href}><Card className={`p-4 transition hover:bg-muted ${n > 0 ? "border-accent" : ""}`}><p className="text-3xl font-extrabold">{n}</p><p className="text-xs text-muted-foreground">{label}</p></Card></Link></li>
          ))}
        </ul></section>
      <section aria-labelledby="health"><h2 id="health" className="mb-3 text-xl font-extrabold">صحة المنصة</h2>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {health.map(([label, n]) => <li key={label}><Card className="p-4"><p className="text-2xl font-extrabold">{n}</p><p className="text-xs text-muted-foreground">{label}</p></Card></li>)}
        </ul>
        <p className="mt-3 text-xs text-muted-foreground">هدف 90 يوماً: 5,000 مستخدم شهرياً، 25% يعودون أسبوعياً، 50 مطالبة بصفحة، 10 أعمال مستعدة للدفع.</p></section>
    </div>
  );
}
