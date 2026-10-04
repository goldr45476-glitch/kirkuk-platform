import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { getPushStats } from "@/lib/data-admin";
import { timeAgo } from "@/lib/time";

export default async function PushHealthPage() {
  const s = await getPushStats();
  const configured = Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.PUSH_DISPATCH_SECRET && process.env.SUPABASE_SERVICE_ROLE_KEY);
  // A backlog older than 5 minutes means the dispatcher cron/webhook is not running.
  const stuck = !!s && s.backlog > 0 && s.oldest_backlog_min > 5;
  const cards: [string, string | number][] = s ? [
    ["مستخدمون مشتركون", s.subscribed_users], ["أجهزة مسجّلة", s.devices], ["بانتظار الإرسال", s.backlog],
    ["أُرسلت آخر 24 ساعة", s.pushed_24h], ["أقدم إشعار معلّق (دقيقة)", s.oldest_backlog_min], ["أوقفوا التفاعلات الاجتماعية", `${s.opted_out_social} / ${s.prefs_rows}`],
  ] : [];
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-extrabold">صحة إشعارات Push</h1>
      <p className={`flex items-center gap-2 rounded-xl border p-3 text-sm font-semibold ${configured ? "bg-success/10" : "bg-destructive/10"}`}>
        {configured ? <CheckCircle2 className="size-5 text-success" aria-hidden /> : <AlertTriangle className="size-5 text-destructive" aria-hidden />}
        {configured ? "المتغيّرات مضبوطة (VAPID + سرّ المُرسِل + مفتاح الخدمة)" : "الإعداد ناقص: اضبط NEXT_PUBLIC_VAPID_PUBLIC_KEY وVAPID_PRIVATE_KEY وPUSH_DISPATCH_SECRET وSUPABASE_SERVICE_ROLE_KEY"}
      </p>
      {stuck && <p role="alert" className="flex items-center gap-2 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm font-semibold"><AlertTriangle className="size-5 text-destructive" aria-hidden />المُرسِل متوقف على الأرجح: يوجد إشعارات معلّقة منذ أكثر من 5 دقائق. تحقق من الـ Cron أو الـ Webhook.</p>}
      {!s ? <p className="text-sm text-muted-foreground">تعذّر جلب الإحصاءات.</p> : (
        <>
          <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {cards.map(([k, v]) => <div key={k} className="rounded-xl border bg-card p-3"><dt className="text-xs text-muted-foreground">{k}</dt><dd className="text-2xl font-extrabold">{v}</dd></div>)}
          </dl>
          <p className="text-sm text-muted-foreground">آخر إرسال: {s.last_pushed_at ? <time suppressHydrationWarning>{timeAgo(s.last_pushed_at, "ar")}</time> : "لم يُرسل شيء بعد"}</p>
        </>
      )}
    </div>
  );
}
