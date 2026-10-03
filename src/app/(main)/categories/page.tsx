import Link from "next/link";
import { DynamicIcon } from "@/components/icon";
import { Card } from "@/components/ui/card";
import { getCategories } from "@/lib/data";
import { getI18n, localized } from "@/lib/i18n/server";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t.nav.categories };
}

export default async function CategoriesPage() {
  const { t, locale } = await getI18n();
  const all = await getCategories();
  const top = all.filter((c) => c.parent_id === null);
  if (top.length === 0) return <p className="py-16 text-center text-muted-foreground">{t.common.empty}</p>;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold">{t.nav.categories}</h1>
      <div className="grid gap-4 md:grid-cols-2">
        {top.map((c) => {
          const subs = all.filter((s) => s.parent_id === c.id);
          return (
            <Card key={c.id} className="p-4">
              <Link href={`/categories/${c.slug}`} className="flex items-center gap-3">
                <span className="grid size-11 place-items-center rounded-xl text-white" style={{ background: c.color ?? "hsl(var(--primary))" }}>
                  <DynamicIcon icon={c.icon} className="size-5" aria-hidden />
                </span>
                <span className="font-extrabold">{localized(c, locale)}</span>
              </Link>
              {subs.length > 0 && (
                <ul className="mt-3 flex flex-wrap gap-2">
                  {subs.map((s) => (
                    <li key={s.id}>
                      <Link href={`/categories/${s.slug}`} className="inline-block rounded-full bg-muted px-3 py-1 text-sm hover:bg-primary/15">{localized(s, locale)}</Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
