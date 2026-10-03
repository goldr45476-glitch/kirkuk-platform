import { ListingsPage } from "@/features/listings/listings-page";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t.listings.kinds.property };
}

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <ListingsPage kind="property" raw={await searchParams} />;
}
