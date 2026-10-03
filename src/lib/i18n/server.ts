import { cookies } from "next/headers";
import type { Locale } from "@/lib/types";
import { DEFAULT_LOCALE, LOCALE_COOKIE, dirOf, isLocale } from "./config";
import { dictionaries } from "./dictionaries";

export async function getLocale(): Promise<Locale> {
  const v = (await cookies()).get(LOCALE_COOKIE)?.value;
  return isLocale(v) ? v : DEFAULT_LOCALE;
}

export async function getI18n() {
  const locale = await getLocale();
  return { locale, dir: dirOf(locale), t: dictionaries[locale] };
}

/** Picks name_<locale> from a row, falling back to Arabic. */
export function localized<T extends { name_ar: string; name_ku?: string | null; name_tr?: string | null; name_en?: string | null }>(
  row: T,
  locale: Locale,
): string {
  return (locale === "ar" ? row.name_ar : row[`name_${locale}` as "name_ku" | "name_tr" | "name_en"]) || row.name_ar;
}
