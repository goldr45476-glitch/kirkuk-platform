import { Badge, Card } from "@/components/ui/card";
import { UserAdminActions } from "@/features/admin/admin-actions";
import { getCurrentProfile } from "@/lib/data";
import { searchAdminUsers } from "@/lib/data-admin";

const ROLE_AR: Record<string, string> = { user: "مستخدم", owner: "صاحب نشاط", moderator: "مشرف", admin: "مدير" };

export default async function AdminUsers({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const [me, users] = await Promise.all([getCurrentProfile(), searchAdminUsers(q.slice(0, 40))]);
  return (
    <div className="space-y-4">
      <form className="flex gap-2" role="search"><input name="q" defaultValue={q} placeholder="اسم أو رقم هاتف…" aria-label="بحث" className="h-11 flex-1 rounded-lg border border-input bg-card px-3" /><button className="rounded-lg bg-primary px-5 font-bold text-primary-foreground">بحث</button></form>
      <ul className="space-y-3">
        {users.map((u) => (
          <li key={u.id}><Card className="space-y-2 p-4">
            <p className="flex flex-wrap items-center gap-2 font-bold">{u.full_name || "—"} <bdi dir="ltr" className="text-xs font-normal text-muted-foreground">{u.phone}</bdi><Badge>{ROLE_AR[u.role]}</Badge>{u.is_banned && <Badge tone="accent">محظور</Badge>}</p>
            <UserAdminActions u={u} isAdmin={me?.role === "admin"} selfId={me?.id ?? ""} />
          </Card></li>
        ))}
      </ul>
    </div>
  );
}
