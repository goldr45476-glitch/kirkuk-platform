import { BottomNav } from "@/components/layout/bottom-nav";
import { Header } from "@/components/layout/header";
import { getI18n } from "@/lib/i18n/server";

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const { t } = await getI18n();
  return (
    <>
      <Header />
      <main className="container pb-24 pt-4 md:pb-10 md:pt-6">{children}</main>
      <BottomNav labels={t.nav} />
    </>
  );
}
