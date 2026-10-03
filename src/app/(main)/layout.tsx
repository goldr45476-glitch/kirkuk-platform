import { BottomNav } from "@/components/layout/bottom-nav";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { SavedProvider } from "@/features/saved/saved-context";
import { getSavedIds } from "@/lib/data";
import { getI18n } from "@/lib/i18n/server";

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const [{ t }, { ids, loggedIn }] = await Promise.all([getI18n(), getSavedIds()]);
  return (
    <SavedProvider initial={ids} loggedIn={loggedIn}>
      <Header />
      <main className="container pb-8 pt-4 md:pt-6">{children}</main>
      <Footer t={t} />
      <BottomNav labels={t.nav} />
    </SavedProvider>
  );
}
