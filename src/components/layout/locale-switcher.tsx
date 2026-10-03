"use client";

import { Languages } from "lucide-react";
import { useTransition } from "react";
import { setLocaleAction } from "@/lib/actions";
import { LOCALES } from "@/lib/i18n/config";

export function LocaleSwitcher({ current, label }: { current: string; label: string }) {
  const [pending, start] = useTransition();
  return (
    <label className="relative inline-flex size-9 items-center justify-center rounded-lg hover:bg-muted sm:size-10" title={label}>
      <Languages className="size-5" aria-hidden />
      <span className="sr-only">{label}</span>
      <select
        aria-label={label}
        value={current}
        disabled={pending}
        onChange={(e) => start(() => setLocaleAction(e.target.value))}
        className="absolute inset-0 cursor-pointer opacity-0"
      >
        {LOCALES.map((l) => (
          <option key={l.code} value={l.code}>{l.label}</option>
        ))}
      </select>
    </label>
  );
}
