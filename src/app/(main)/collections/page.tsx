import { ListChecks } from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { listCollections } from "@/lib/data";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t.misc.collections.title, openGraph: { images: [{ url: "/og-default.png" }] } };
}

export default async function CollectionsPage() {
  const { t } = await getI18n();
  const list = await listCollections(50);
  const c = t.misc.collections;
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-2xl font-extrabold">{c.title}</h1>
      {list.length === 0 ? <p className="py-10 text-center text-muted-foreground">{c.empty}</p> : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {list.map((x) => (
            <li key={x.id}><Link href={`/collections/${x.slug}`}><Card className="h-full space-y-2 p-4 transition hover:-translate-y-0.5 hover:shadow-md">
              <ListChecks className="size-6 text-primary" aria-hidden />
              <h2 className="font-extrabold leading-snug">{x.title}</h2>
              {x.description && <p className="line-clamp-2 text-sm text-muted-foreground">{x.description}</p>}
              <p className="text-xs font-semibold text-primary">{x.item_count} {c.places}{x.preview?.length ? ` · ${x.preview.join("، ")}` : ""}</p>
            </Card></Link></li>
          ))}
        </ul>
      )}
    </div>
  );
}
