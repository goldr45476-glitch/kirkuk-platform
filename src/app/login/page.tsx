import { MapPin } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { LoginForm } from "@/features/auth/login-form";
import { getCurrentProfile } from "@/lib/data";
import { supabaseConfigured } from "@/lib/env";
import { getI18n } from "@/lib/i18n/server";
import { safeNext } from "@/lib/safe-next";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t.nav.login, robots: { index: false } };
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const target = safeNext(next, "/account");
  if (await getCurrentProfile()) redirect(target);
  const { t } = await getI18n();

  return (
    <main className="container grid min-h-dvh place-items-center py-10">
      <div className="w-full max-w-md space-y-6">
        <Link href="/" className="flex items-center justify-center gap-2 text-xl font-extrabold text-primary">
          <span className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground"><MapPin className="size-5" aria-hidden /></span>
          {t.appName}
        </Link>
        <Card className="space-y-5 p-6">
          <div className="space-y-1 text-center">
            <h1 className="text-xl font-extrabold">{t.auth.title}</h1>
            <p className="text-sm text-muted-foreground">{t.auth.subtitle}</p>
          </div>
          <LoginForm t={t.auth} next={target} configured={supabaseConfigured} />
        </Card>
      </div>
    </main>
  );
}
