import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ClaimForm } from "@/features/suggest/claim-form";
import { getBusinessBySlug, getCurrentProfile } from "@/lib/data";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t.claim.title, robots: { index: false } };
}

export default async function ClaimPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const b = await getBusinessBySlug(slug);
  if (!b) notFound();
  const profile = await getCurrentProfile();
  if (!profile) redirect(`/login?next=/business/${slug}/claim`);
  const { t } = await getI18n();
  return (
    <div className="mx-auto max-w-lg space-y-4">
      <Link href={`/business/${slug}`} className="text-sm font-semibold text-primary">← {b.name}</Link>
      <h1 className="text-2xl font-extrabold">{t.claim.title}</h1>
      {b.owner_id ? <p className="rounded-xl bg-muted p-4 text-sm font-semibold">{t.claim.owned}</p> : <ClaimForm businessId={b.id} t={t} />}
    </div>
  );
}
