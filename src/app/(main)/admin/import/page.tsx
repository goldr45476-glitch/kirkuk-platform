import { ImportForm } from "@/features/admin/import-form";
import { getCategories, getDistricts } from "@/lib/data";

export default async function ImportPage() {
  const [cats, districts] = await Promise.all([getCategories(), getDistricts()]);
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-extrabold">استيراد أماكن (CSV)</h1>
      <p className="text-sm text-muted-foreground">لإدخال مئات الأماكن دفعة واحدة من جدول يجمعه الفريق. الأعمدة المطلوبة: <bdi dir="ltr">name, category</bdi>. تُنشر الأماكن المستوردة <b>بدون توثيق</b>؛ ابدأ بعدها جولات «تحققنا الآن». الأماكن المكررة (نفس الاسم مع نفس الهاتف أو على بُعد أقل من 150 م) تُتجاهل تلقائياً، فاستيراد الملف مرتين آمن.</p>
      <ImportForm />
      <details className="rounded-xl border bg-card p-4 text-sm">
        <summary className="cursor-pointer font-bold">قيم slug المسموحة للأقسام والأحياء</summary>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <ul className="space-y-0.5">{cats.map((c) => <li key={c.id}><code dir="ltr" className="rounded bg-muted px-1">{c.slug}</code> {c.name_ar}</li>)}</ul>
          <ul className="space-y-0.5">{districts.map((d) => <li key={d.id}><code dir="ltr" className="rounded bg-muted px-1">{d.slug}</code> {d.name_ar}</li>)}</ul>
        </div>
      </details>
    </div>
  );
}
