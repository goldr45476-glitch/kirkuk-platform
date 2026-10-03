import { getI18n } from "@/lib/i18n/server";

export interface LegalSection { h: string; p: string[] }

/** Legal copy is shown in Arabic (primary) and English; other locales fall back to English. */
export async function LegalPage({ title, updated, ar, en }: { title: { ar: string; en: string }; updated: string; ar: LegalSection[]; en: LegalSection[] }) {
  const { locale, t } = await getI18n();
  const useAr = locale === "ar" || locale === "ku";
  const sections = useAr ? ar : en;
  return (
    <article className="mx-auto max-w-2xl space-y-6" lang={useAr ? "ar" : "en"} dir={useAr ? "rtl" : "ltr"}>
      <header className="space-y-1">
        <h1 className="text-2xl font-extrabold">{useAr ? title.ar : title.en}</h1>
        <p className="text-xs text-muted-foreground">{t.misc.legal.updated}: {updated}</p>
      </header>
      {sections.map((s) => (
        <section key={s.h} className="space-y-2">
          <h2 className="text-lg font-extrabold">{s.h}</h2>
          {s.p.map((x) => <p key={x} className="leading-relaxed text-muted-foreground">{x}</p>)}
        </section>
      ))}
      <p className="rounded-xl bg-muted p-3 text-xs text-muted-foreground">{useAr ? "هذه الصياغة نموذج أولي للإطلاق ويجب مراجعتها من مستشار قانوني قبل الاعتماد." : "This text is a launch draft and should be reviewed by legal counsel before it is relied upon."}</p>
    </article>
  );
}
