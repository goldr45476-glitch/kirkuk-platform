import { Badge, Card } from "@/components/ui/card";
import { AdRowActions, NewAdForm } from "@/features/admin/money-ui";
import { getCategories } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/time";

const PLACE: Record<string, string> = { feed: "الخلاصة", category: "قسم", search: "البحث", home_banner: "بانر الرئيسية" };

export default async function AdminAds() {
  const supabase = await createClient();
  const [{ data: ads }, { data: biz }, cats] = await Promise.all([
    supabase.from("ads").select("id, placement, title, body, link_url, starts_at, ends_at, is_active, impressions, clicks, business:businesses(name)").order("created_at", { ascending: false }).limit(100),
    supabase.from("businesses").select("id, name").eq("status", "active").order("name").limit(500),
    getCategories(),
  ]);
  const rows = (ads ?? []) as unknown as { id: string; placement: string; title: string; body: string | null; link_url: string | null; ends_at: string; is_active: boolean; impressions: number; clicks: number; business: { name: string } | null }[];
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-extrabold">الإعلانات الممولة</h1>
      <p className="text-sm text-muted-foreground">تظهر دائماً بوسم «إعلان». في الخلاصة: إعلان واحد بعد كل 6 منشورات. الرابط الخارجي يجب أن يبدأ بـ https.</p>
      <NewAdForm businesses={(biz ?? []) as { id: string; name: string }[]} categories={cats.filter((c) => !c.parent_id).map((c) => ({ id: c.id, name: c.name_ar }))} />
      <ul className="space-y-3">
        {rows.map((a) => {
          const live = a.is_active && new Date(a.ends_at) > new Date();
          return (
            <li key={a.id}><Card className="space-y-2 p-4">
              <p className="flex flex-wrap items-center gap-2 font-bold">{a.title}<Badge>{PLACE[a.placement]}</Badge><Badge tone={live ? "success" : "muted"}>{live ? "فعّال" : a.is_active ? "منتهٍ" : "موقوف"}</Badge>{a.business && <span className="text-xs font-normal text-muted-foreground">{a.business.name}</span>}</p>
              <p className="text-xs text-muted-foreground">حتى {formatDate(a.ends_at, "ar")} · ظهور {a.impressions} · نقرات {a.clicks} · نسبة النقر {a.impressions ? ((a.clicks / a.impressions) * 100).toFixed(1) : "0"}%</p>
              <AdRowActions id={a.id} active={a.is_active} />
            </Card></li>
          );
        })}
      </ul>
    </div>
  );
}
