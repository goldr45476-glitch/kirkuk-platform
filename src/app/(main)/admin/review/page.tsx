import Image from "next/image";
import { Badge, Card } from "@/components/ui/card";
import { ClaimActions, EventActions, ReportActions, SubmissionActions } from "@/features/admin/admin-actions";
import { getCategories } from "@/lib/data";
import { getReviewQueues } from "@/lib/data-admin";
import { formatDateTime } from "@/lib/format-time";
import { timeAgo } from "@/lib/time";

const TYPE_AR: Record<string, string> = { post: "منشور", comment: "تعليق", review: "تقييم", listing: "إعلان", business: "نشاط", user: "مستخدم" };
const REASON_AR: Record<string, string> = { spam: "مزعج", fake: "مزيف", inappropriate: "غير لائق", scam: "احتيال", wrong_info: "معلومة خاطئة", other: "أخرى" };
const EVENT_AR: Record<string, string> = { music: "موسيقى", family: "عائلية", sports: "رياضة", culture: "ثقافة", food: "طعام", education: "تعليم", charity: "خيرية", other: "أخرى" };
const Empty = () => <p className="text-sm text-muted-foreground">لا يوجد شيء بانتظار المراجعة 🎉</p>;

export default async function ReviewPage() {
  const [q, cats] = await Promise.all([getReviewQueues(), getCategories()]);
  const catName = new Map(cats.map((c) => [c.id, c.name_ar]));
  return (
    <div className="space-y-8">
      <section id="submissions" className="space-y-3"><h2 className="text-lg font-extrabold">اقتراحات الأماكن والتعديلات <Badge tone="accent">{q.submissions.length}</Badge></h2>
        {q.submissions.length === 0 ? <Empty /> : q.submissions.map((s) => (
          <Card key={s.id} className="space-y-2 p-4">
            <p className="font-bold">{s.type === "edit" ? "تعديل على: " + (s.business?.name ?? "") : String(s.payload.name ?? "")} <Badge>{s.type === "edit" ? "تعديل" : "مكان جديد"}</Badge></p>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              {s.type !== "edit" && <><dt className="text-muted-foreground">التصنيف</dt><dd>{catName.get(Number(s.payload.category_id)) ?? "—"}</dd></>}
              {(["phone", "address", "description"] as const).map((k) => s.payload[k] ? <div key={k} className="contents"><dt className="text-muted-foreground">{{ phone: "الهاتف", address: "العنوان", description: "الوصف" }[k]}</dt><dd className="break-words">{String(s.payload[k])}</dd></div> : null)}
              {s.payload.lat != null && <><dt className="text-muted-foreground">الموقع</dt><dd><a className="text-primary underline" target="_blank" rel="noopener noreferrer" href={`https://www.openstreetmap.org/?mlat=${s.payload.lat}&mlon=${s.payload.lng}#map=18/${s.payload.lat}/${s.payload.lng}`}>خريطة</a></dd></>}
              {s.payload.is_owner && <><dt className="text-muted-foreground">ملاحظة</dt><dd className="font-semibold">يدّعي أنه المالك</dd></>}
            </dl>
            <p className="text-xs text-muted-foreground">من {s.submitter?.full_name || "—"} <bdi dir="ltr">{s.submitter?.phone}</bdi> · <time suppressHydrationWarning>{timeAgo(s.created_at, "ar")}</time></p>
            <SubmissionActions id={s.id} />
          </Card>
        ))}</section>

      <section id="claims" className="space-y-3"><h2 className="text-lg font-extrabold">مطالبات بالصفحات <Badge tone="accent">{q.claims.length}</Badge></h2>
        {q.claims.length === 0 ? <Empty /> : q.claims.map((c) => (
          <Card key={c.id} className="space-y-2 p-4">
            <p className="font-bold">{c.business?.name} <a className="text-sm font-normal text-primary underline" href={`/business/${c.business?.slug}`}>الصفحة</a></p>
            <p className="text-sm">المطالِب: {c.claimant?.full_name || "—"} · اتصل على <bdi dir="ltr" className="font-bold">{c.phone}</bdi> للتأكد من الملكية</p>
            {c.proof_url ? <a href={c.proof_url} target="_blank" rel="noopener noreferrer" className="relative block h-40 w-full max-w-xs overflow-hidden rounded-lg border"><Image src={c.proof_url} alt="صورة الإثبات" fill unoptimized className="object-cover" /></a> : <p className="text-xs text-muted-foreground">لا توجد صورة إثبات</p>}
            <ClaimActions id={c.id} />
          </Card>
        ))}</section>

      <section id="reports" className="space-y-3"><h2 className="text-lg font-extrabold">البلاغات <Badge tone="accent">{q.reports.length}</Badge></h2>
        {q.reports.length === 0 ? <Empty /> : q.reports.map((r) => (
          <Card key={r.id} className="space-y-2 p-4">
            <p className="flex flex-wrap items-center gap-2 text-sm"><Badge>{TYPE_AR[r.target_type] ?? r.target_type}</Badge><Badge tone="accent">{REASON_AR[r.reason] ?? r.reason}</Badge><span className="text-xs text-muted-foreground">بلّغ: {r.reporter?.full_name || "—"} · <time suppressHydrationWarning>{timeAgo(r.created_at, "ar")}</time></span></p>
            <blockquote className="rounded-lg bg-muted p-3 text-sm">{r.preview || "(المحتوى غير متاح)"}</blockquote>
            <ReportActions id={r.id} hideLabel={r.target_type === "business" ? "إيقاف الصفحة" : "إخفاء المحتوى"} />
          </Card>
        ))}</section>

      <section id="events" className="space-y-3"><h2 className="text-lg font-extrabold">فعاليات مقترحة <Badge tone="accent">{q.events.length}</Badge></h2>
        {q.events.length === 0 ? <Empty /> : q.events.map((e) => (
          <Card key={e.id} className="space-y-2 p-4">
            <p className="font-bold">{e.title}</p>
            <p className="text-sm text-muted-foreground">{formatDateTime(e.starts_at, "ar")}{e.venue_name && ` · ${e.venue_name}`}{e.category && ` · ${EVENT_AR[e.category] ?? e.category}`}</p>
            {e.details && <p className="text-sm">{e.details}</p>}
            <p className="text-xs text-muted-foreground">اقترحها: {e.creator?.full_name || "—"}</p>
            <EventActions id={e.id} />
          </Card>
        ))}</section>
    </div>
  );
}
