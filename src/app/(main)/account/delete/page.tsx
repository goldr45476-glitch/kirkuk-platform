import Link from "next/link";
import { redirect } from "next/navigation";
import { DeleteAccountForm } from "@/features/auth/delete-account-form";
import { getCurrentProfile } from "@/lib/data";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t.misc.del.title, robots: { index: false } };
}

export default async function DeleteAccountPage() {
  if (!(await getCurrentProfile())) redirect("/login?next=/account/delete");
  const { t } = await getI18n();
  const d = t.misc.del;
  return (
    <div className="mx-auto max-w-lg space-y-4">
      <Link href="/account" className="text-sm font-semibold text-primary">← {t.account.title}</Link>
      <h1 className="text-2xl font-extrabold text-destructive">{d.title}</h1>
      <p className="rounded-xl bg-destructive/10 p-4 text-sm leading-relaxed">{d.warn}</p>
      <DeleteAccountForm d={d} />
    </div>
  );
}
