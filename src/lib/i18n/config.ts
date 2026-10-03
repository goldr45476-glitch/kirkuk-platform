import type { Locale } from "@/lib/types";

export const LOCALES: { code: Locale; label: string; dir: "rtl" | "ltr" }[] = [
  { code: "ar", label: "العربية", dir: "rtl" },
  { code: "ku", label: "کوردی", dir: "rtl" },
  { code: "tr", label: "Türkmence", dir: "ltr" },
  { code: "en", label: "English", dir: "ltr" },
];
export const DEFAULT_LOCALE: Locale = "ar";
export const LOCALE_COOKIE = "locale";

export const isLocale = (v: unknown): v is Locale => LOCALES.some((l) => l.code === v);
export const dirOf = (l: Locale) => LOCALES.find((x) => x.code === l)!.dir;
