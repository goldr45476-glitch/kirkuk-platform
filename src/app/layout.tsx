import type { Metadata, Viewport } from "next";
import { Cairo } from "next/font/google";
import { themeInitScript } from "@/components/layout/theme-toggle";
import { SwRegister } from "@/components/sw-register";
import { SITE_URL, SUPABASE_URL } from "@/lib/env";
import { getI18n } from "@/lib/i18n/server";
import "./globals.css";

const cairo = Cairo({ subsets: ["arabic", "latin"], variable: "--font-cairo", display: "swap" });

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: `${t.appName} — ${t.tagline}`, template: `%s | ${t.appName}` },
    description: t.tagline,
    openGraph: { siteName: t.appName, type: "website", locale: "ar_IQ", images: [{ url: "/og-default.png", width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", images: ["/og-default.png"] },
    appleWebApp: { capable: true, title: t.appName, statusBarStyle: "default" },
  };
}

export const viewport: Viewport = {
  themeColor: [{ media: "(prefers-color-scheme: light)", color: "#f8f8fd" }, { media: "(prefers-color-scheme: dark)", color: "#0e0d1a" }],
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { locale, dir } = await getI18n();
  return (
    <html lang={locale} dir={dir} suppressHydrationWarning className={cairo.variable}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        {SUPABASE_URL && <link rel="preconnect" href={SUPABASE_URL} crossOrigin="" />}
        <link rel="dns-prefetch" href="https://tile.openstreetmap.org" />
      </head>
      <body className="min-h-dvh font-sans">{children}<SwRegister /></body>
    </html>
  );
}
