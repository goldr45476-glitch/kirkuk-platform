import Link from "next/link";
import { requireStaff } from "@/lib/staff";

const TABS = [["/admin", "نظرة عامة"], ["/admin/kpis", "المؤشرات"], ["/admin/review", "المراجعة"], ["/admin/businesses", "الأنشطة"], ["/admin/users", "المستخدمون"], ["/admin/subscriptions", "الاشتراكات"], ["/admin/ads", "الإعلانات"], ["/admin/collections", "القوائم"], ["/admin/quick-add", "إدخال سريع"], ["/admin/import", "استيراد CSV"], ["/admin/push", "Push"], ["/admin/audit", "السجل"]] as const;

export const metadata = { title: "الإدارة", robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireStaff();
  return (
    <div className="space-y-4" lang="ar" dir="rtl">
      <nav aria-label="الإدارة" className="-mx-4 flex gap-2 overflow-x-auto border-b px-4 pb-3">
        {TABS.map(([href, label]) => <Link key={href} href={href} className="shrink-0 rounded-full border bg-card px-4 py-1.5 text-sm font-bold hover:bg-muted">{label}</Link>)}
      </nav>
      {children}
    </div>
  );
}
