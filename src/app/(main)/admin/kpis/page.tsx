import Link from "next/link";
import { getKpis } from "@/lib/data-admin";
import { timeAgo } from "@/lib/time";

const pct = (a: number, b: number) => (b > 0 ? `${Math.round((100 * a) / b)}%` : "—");

function Stat({ k, v, hint }: { k: string; v: string | number; hint?: string }) {
  return <div className="rounded-xl border bg-card p-3"><dt className="text-xs text-muted-foreground">{k}</dt><dd className="text-2xl font-extrabold">{v}</dd>{hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}</div>;
}

export default async function KpiPage() {
  const k = await getKpis();
  if (!k) return <p className="text-sm text-muted-foreground">تعذّر جلب المؤشرات.</p>;
  const maxViews = Math.max(1, ...k.weekly.map((w) => w.views));
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-extrabold">مؤشرات النجاح</h1>

      <section aria-labelledby="k-data" className="space-y-2">
        <h2 id="k-data" className="font-extrabold">جودة البيانات <span className="text-xs font-normal text-muted-foreground">(هدف الإطلاق: 400 مكان متحقق منه)</span></h2>
        <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat k="أماكن منشورة" v={k.data.published} />
          <Stat k="متحقَّق منها (60 يوماً)" v={k.data.verified_60d} hint={pct(k.data.verified_60d, k.data.published)} />
          <Stat k="لم يُتحقق منها قط" v={k.data.never_verified} />
          <Stat k="العائدون أسبوعياً" v={pct(k.returning.returned, k.returning.last_week_users)} hint={`${k.returning.returned} من ${k.returning.last_week_users} (مسجَّلون)`} />
        </dl>
      </section>

      <section aria-labelledby="k-week" className="space-y-2">
        <h2 id="k-week" className="font-extrabold">آخر 8 أسابيع</h2>
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted"><tr>{["الأسبوع", "نشطون (مسجَّلون)", "مشاهدات الأنشطة", "إجراءات تواصل", "لكل 100 مشاهدة"].map((h) => <th key={h} className="p-2 text-start">{h}</th>)}</tr></thead>
            <tbody>
              {k.weekly.length === 0 && <tr><td colSpan={5} className="p-3 text-center text-muted-foreground">لا بيانات بعد</td></tr>}
              {k.weekly.map((w) => (
                <tr key={w.week} className="border-t">
                  <td className="p-2" dir="ltr">{w.week}</td><td className="p-2">{w.wau}</td>
                  <td className="p-2"><span className="inline-flex items-center gap-2"><span aria-hidden className="inline-block h-2 rounded bg-primary" style={{ width: `${Math.max(2, Math.round((60 * w.views) / maxViews))}px` }} />{w.views}</span></td>
                  <td className="p-2">{w.contact}</td><td className="p-2">{w.views ? Math.round((100 * w.contact) / w.views) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="k-money" className="space-y-2">
        <h2 id="k-money" className="font-extrabold">المطالبات والدخل <span className="text-xs font-normal text-muted-foreground">(هدف 90 يوماً: 50 مطالبة، 10 مستعدون للدفع)</span></h2>
        <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat k="مطالبات مقبولة" v={k.money.claims_approved} /><Stat k="مطالبات معلّقة" v={k.money.claims_pending} />
          <Stat k="طلبات دفع" v={k.money.payment_requests} /><Stat k="مشتركون فعّالون" v={k.money.paying_now} />
        </dl>
      </section>

      <section aria-labelledby="k-queue" className="space-y-2">
        <h2 id="k-queue" className="font-extrabold">طابور المراجعة <span className="text-xs font-normal text-muted-foreground">(يجب أن يبقى قصيراً)</span></h2>
        <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat k="اقتراحات" v={k.queue.submissions} /><Stat k="مطالبات" v={k.queue.claims} />
          <Stat k="بلاغات مفتوحة" v={k.queue.reports} hint={k.queue.oldest_open_report ? `الأقدم: ${timeAgo(k.queue.oldest_open_report, "ar")}` : undefined} /><Stat k="فعاليات" v={k.queue.events} />
        </dl>
      </section>

      <section aria-labelledby="k-top" className="space-y-2">
        <h2 id="k-top" className="font-extrabold">الأكثر تواصلاً (30 يوماً)</h2>
        {k.top_places.length === 0 ? <p className="text-sm text-muted-foreground">لا بيانات بعد</p> : (
          <ol className="divide-y rounded-xl border bg-card text-sm">
            {k.top_places.map((p) => (
              <li key={p.slug} className="flex items-center justify-between gap-2 p-2.5">
                <Link href={`/business/${p.slug}`} className="min-w-0 truncate font-semibold hover:underline">{p.name}</Link>
                <span className="shrink-0 text-xs text-muted-foreground">اتصال {p.calls} · اتجاهات {p.directions} · مشاهدات {p.views}</span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
