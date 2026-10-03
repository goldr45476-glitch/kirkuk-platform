import { CollectionEditor, NewCollection, type AdminCollection } from "@/features/admin/collection-editor";
import { createClient } from "@/lib/supabase/server";

export default async function AdminCollections() {
  const supabase = await createClient();
  const [{ data: cols }, { data: biz }] = await Promise.all([
    supabase.from("collections").select("id, slug, title, description, status, items:collection_items(business_id, position, note, business:businesses(name))").order("sort_order").order("created_at", { ascending: false }),
    supabase.from("businesses").select("id, name").eq("status", "active").order("name").limit(500),
  ]);
  const list: AdminCollection[] = ((cols ?? []) as unknown as (Omit<AdminCollection, "items"> & { items: { business_id: string; position: number; note: string | null; business: { name: string } | null }[] })[]).map((c) => ({
    ...c, items: [...c.items].sort((a, b) => a.position - b.position).map((i) => ({ business_id: i.business_id, name: i.business?.name ?? "—", note: i.note })),
  }));
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-extrabold">القوائم المنسّقة</h1>
      <p className="text-sm text-muted-foreground">قوائم قابلة للمشاركة على واتساب والسوشال («أفضل 5 أماكن فطور»). تبدأ كمسودة ولا تظهر للعامة قبل النشر.</p>
      <NewCollection />
      {list.map((c) => <CollectionEditor key={c.id} c={c} businesses={(biz ?? []) as { id: string; name: string }[]} />)}
    </div>
  );
}
