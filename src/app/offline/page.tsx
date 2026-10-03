import Link from "next/link";
import { getI18n } from "@/lib/i18n/server";

export const dynamic = "force-static";

export default async function Offline() {
  const { t } = await getI18n();
  return (
    <main className="grid min-h-dvh place-items-center px-6 text-center">
      <div className="space-y-3">
        <p className="text-5xl" aria-hidden>📡</p>
        <h1 className="text-xl font-extrabold">{t.misc.err.offline}</h1>
        <p className="max-w-sm text-sm text-muted-foreground">{t.misc.err.offlineHint}</p>
        <Link href="/" prefetch={false} className="inline-flex h-11 items-center rounded-lg bg-primary px-5 font-semibold text-primary-foreground">{t.misc.err.retry}</Link>
      </div>
    </main>
  );
}
