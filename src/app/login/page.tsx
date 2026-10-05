import { CitadelLogo } from "@/components/citadel-logo";
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

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; type?: string }> }) {
  const { next, type } = await searchParams;
  const explicitNext = next ? safeNext(next, "/") : null;
  if (await getCurrentProfile()) redirect(explicitNext ?? (type === "owner" ? "/dashboard" : "/"));
  const { t } = await getI18n();

  return (
    <main className="container grid min-h-dvh place-items-center py-10">
      <div className="w-full max-w-md space-y-6">
        <Link href="/" className="flex items-center justify-center gap-2 text-xl font-extrabold text-primary">
          <span className="grid size-11 place-items-center rounded-xl bg-gradient-to-br from-primary to-primary/75 p-1.5 shadow-sm shadow-primary/30"><CitadelLogo className="size-full" /></span>
          {t.appName}
        </Link>
        <Card className="space-y-5 p-6">
          <LoginForm t={t.auth} explicitNext={explicitNext} initialType={type === "owner" ? "owner" : "user"} configured={supabaseConfigured} />
        </Card>
      </div>
    </main>
  );
}
