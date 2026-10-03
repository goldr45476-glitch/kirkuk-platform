import Link from "next/link";
import { Badge, Card } from "@/components/ui/card";
import { BusinessAdminActions } from "@/features/admin/admin-actions";
import { searchAdminBusinesses } from "@/lib/data-admin";
import { timeAgo } from "@/lib/time";

const FILTERS = [["", "الكل"], ["pending", "بانتظار التفعيل"], ["unverified", "غير متحقق منها"], ["stale", "قديمة (60 يوماً)"], ["suspended", "موقوفة"]] as const;

export default async function AdminBusinesses({ searchParams }: { searchParams: Promise<{ q?: string; filter?: string }> }) {
  const { q = "", filter = "" } = await searchParams;
  const list = await searchAdminBusinesses(q.slice(0, 60), filter);
  return (
    <div className="space-y-4">
      <form className="flex gap-2" role="search"><input name="q" defaultValue={q} placeholder="ابحث باسم النشاط…" aria-label="بحث" className="h-11 flex-1 rounded-lg border border-input bg-card px-3" />
        {filter && <input type="hidden" name="filter" value={filter} />}<button className="rounded-lg bg-primary px-5 font-bold text-primary-foreground">بحث</button></form>
      <div className="flex flex-wrap gap-2 text-sm font-bold">{FILTERS.map(([k, l]) => <Link key={k} href={`/admin/businesses?filter=${k}${q ? `&q=${encodeURIComponent(q)}` : ""}`} className={`rounded-full border px-3 py-1 ${filter === k ? "border-transparent bg-primary text-primary-foreground" : "bg-card"}`}>{l}</Link>)}</div>
      <p className="text-sm text-muted-foreground">{list.length} نتيجة</p>
      <ul className="space-y-3">
        {list.map((b) => (
          <li key={b.id}><Card className="space-y-2 p-4">
            <p className="flex flex-wrap items-center gap-2 font-bold"><Link className="hover:underline" href={`/business/${b.slug}`}>{b.name}</Link>
              <Badge tone={b.status === "active" ? "success" : b.status === "pending" ? "accent" : "muted"}>{{ active: "منشور", pending: "بانتظار", suspended: "موقوف" }[b.status]}</Badge>
              {b.is_verified && <Badge tone="primary">موثّق</Badge>}{b.is_featured && <Badge tone="accent">مميز</Badge>}{!b.owner_id && <Badge>بلا مالك</Badge>}
              <Link className="text-xs font-normal text-primary underline" href={`/dashboard/${b.id}`}>اللوحة</Link></p>
            <p className="text-xs text-muted-foreground">{b.last_verified_at ? <>آخر تحقق: <time suppressHydrationWarning>{timeAgo(b.last_verified_at, "ar")}</time></> : "لم يُتحقَّق منه"}</p>
            <BusinessAdminActions b={b} />
          </Card></li>
        ))}
      </ul>
    </div>
  );
}
