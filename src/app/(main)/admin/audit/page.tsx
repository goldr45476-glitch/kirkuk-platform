import { getAudit } from "@/lib/data-admin";
import { timeAgo } from "@/lib/time";

export default async function AuditPage() {
  const rows = await getAudit();
  return (
    <div className="space-y-3">
      <h1 className="text-xl font-extrabold">سجل التغييرات الإدارية</h1>
      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted text-start"><tr>{["الوقت", "المنفّذ", "الإجراء", "الهدف"].map((h) => <th key={h} className="p-2 text-start">{h}</th>)}</tr></thead>
          <tbody>{rows.map((r) => (
            <tr key={r.id} className="border-t"><td className="p-2"><time suppressHydrationWarning>{timeAgo(r.created_at, "ar")}</time></td><td className="p-2">{r.actor?.full_name ?? "—"}</td>
              <td className="p-2 font-semibold">{r.action}</td><td className="p-2 text-xs text-muted-foreground" dir="ltr">{r.entity}:{r.entity_id?.slice(0, 8)} {Object.keys(r.detail).length ? JSON.stringify(r.detail) : ""}</td></tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
}
