"use client";

import Link from "next/link";
import { useEffect } from "react";

/** Route-level error UI (inside the root layout). Strings are bilingual because i18n is server-only. */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(JSON.stringify({ level: "error", where: "client", message: error.message, digest: error.digest })); }, [error]);
  return (
    <main className="grid min-h-[60dvh] place-items-center px-6 text-center">
      <div className="space-y-4">
        <p className="text-5xl" aria-hidden>😕</p>
        <h1 className="text-xl font-extrabold">حدث خطأ غير متوقع <span className="block text-sm font-medium text-muted-foreground">Something went wrong</span></h1>
        <div className="flex justify-center gap-3">
          <button onClick={reset} className="h-11 rounded-lg bg-primary px-5 font-semibold text-primary-foreground">حاول مجدداً / Retry</button>
          <Link href="/" className="inline-flex h-11 items-center rounded-lg border px-5 font-semibold">الرئيسية / Home</Link>
        </div>
        {error.digest && <p className="text-xs text-muted-foreground" dir="ltr">ref: {error.digest}</p>}
      </div>
    </main>
  );
}
