import { LogOut } from "lucide-react";
import { redirect } from "next/navigation";
import { Badge, Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ProfileForm } from "@/features/auth/profile-form";
import { getCurrentProfile } from "@/lib/data";
import { getI18n } from "@/lib/i18n/server";
import { signOutAction } from "./actions";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t.account.title, robots: { index: false } };
}

export default async function AccountPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login?next=/account");
  const { t } = await getI18n();

  return (
    <div className="mx-auto max-w-lg space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold">{t.account.title}</h1>
        <Badge tone="primary">{t.account.roles[profile.role]}</Badge>
      </div>
      {profile.phone && <p className="text-sm text-muted-foreground" dir="ltr">+{profile.phone.replace(/^\+/, "")}</p>}
      <Card className="p-5"><ProfileForm profile={profile} t={t.account} common={t.common} /></Card>
      <form action={signOutAction}>
        <Button variant="outline" className="w-full"><LogOut aria-hidden />{t.auth.logout}</Button>
      </form>
    </div>
  );
}
