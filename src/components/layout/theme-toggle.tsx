"use client";

import { Moon, Sun } from "lucide-react";

/** Theme is applied by an inline script in <head> (no flash); this just flips it. */
export function ThemeToggle({ label }: { label: string }) {
  const toggle = () => {
    const dark = document.documentElement.classList.toggle("dark");
    try { localStorage.setItem("theme", dark ? "dark" : "light"); } catch {}
  };
  return (
    <button onClick={toggle} title={label} aria-label={label} className="inline-flex size-10 items-center justify-center rounded-lg hover:bg-muted">
      <Sun className="size-5 hidden dark:block" aria-hidden />
      <Moon className="size-5 dark:hidden" aria-hidden />
    </button>
  );
}

export const themeInitScript = `try{var t=localStorage.getItem('theme');if(t==='dark'||(!t&&matchMedia('(prefers-color-scheme: dark)').matches))document.documentElement.classList.add('dark')}catch(e){}`;
