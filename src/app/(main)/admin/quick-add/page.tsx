import { QuickAddForm } from "@/features/admin/admin-actions";
import { getCity } from "@/lib/city";
import { getCategories, getDistricts } from "@/lib/data";

export default async function QuickAdd() {
  const [cats, districts, city] = await Promise.all([getCategories(), getDistricts(), getCity()]);
  const leaf = cats.filter((c) => c.parent_id !== null || !cats.some((x) => x.parent_id === c.id));
  return (
    <div className="mx-auto max-w-xl space-y-3">
      <h1 className="text-xl font-extrabold">إدخال سريع (للفريق الميداني)</h1>
      <p className="text-sm text-muted-foreground">يُنشر المكان فوراً مع «تحققنا الآن». الساعات تُطبَّق على كل أيام الأسبوع، ويمكن تعديلها لاحقاً من اللوحة.</p>
      <QuickAddForm categories={leaf.map((c) => ({ id: c.id, label: c.name_ar })).sort((a, b) => a.label.localeCompare(b.label, "ar"))}
        districts={districts.map((d) => ({ id: d.id, label: d.name_ar }))} center={{ lat: city?.center_lat ?? 35.4681, lng: city?.center_lng ?? 44.3922 }} />
    </div>
  );
}
