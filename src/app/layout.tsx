import type { Metadata, Viewport } from "next";
import { Cairo } from "next/font/google";
import { themeInitScript } from "@/components/layout/theme-toggle";
import { SITE_URL } from "@/lib/env";
import { getI18n } from "@/lib/i18n/server";
import "./globals.css";

const cairo = Cairo({ subsets: ["arabic", "latin"], variable: "--font-cairo", display: "swap" });

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: `${t.appName} — ${t.tagline}`, template: `%s | ${t.appName}` },
    description: t.tagline,
    openGraph: { siteName: t.appName, type: "website", locale: "ar_IQ" },
  };
}

export const viewport: Viewport = {
  themeColor: [{ media: "(prefers-color-scheme: light)", color: "#f8f6f1" }, { media: "(prefers-color-scheme: dark)", color: "#0f1218" }],
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { locale, dir } = await getI18n();
  return (
    <html lang={locale} dir={dir} suppressHydrationWarning className={cairo.variable}>
      <head><script dangerouslySetInnerHTML={{ __html: themeInitScript }} /></head>
      <body className="min-h-dvh font-sans">{children}</body>
    </html>
  );
}
