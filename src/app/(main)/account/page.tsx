import { LogOut } from "lucide-react";
import { redirect } from "next/navigation";
import { Badge, Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ProfileForm } from "@/features/auth/profile-form";
import { PostCard } from "@/features/feed/post-card";
import { getCurrentProfile, getFeed, getFollowedBusinesses } from "@/lib/data";
import Link from "next/link";
import { getI18n } from "@/lib/i18n/server";
import { signOutAction } from "./actions";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t.account.title, robots: { index: false } };
}

export default async function AccountPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login?next=/account");
  const { t, locale } = await getI18n();
  const [mine, followed] = await Promise.all([getFeed({ author: profile.id, limit: 20 }), getFollowedBusinesses()]);

  return (
    <div className="mx-auto max-w-lg space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold">{t.account.title}</h1>
        <Badge tone="primary">{t.account.roles[profile.role]}</Badge>
      </div>
      {profile.phone && <p className="text-sm text-muted-foreground" dir="ltr">+{profile.phone.replace(/^\+/, "")}</p>}
      <Card className="p-5"><ProfileForm profile={profile} t={t.account} common={t.common} /></Card>
      <section aria-labelledby="following-h" className="space-y-2">
        <h2 id="following-h" className="font-extrabold">{t.profile.following}</h2>
        {followed.length === 0 ? <p className="text-sm text-muted-foreground">{t.profile.noFollowing}</p> : (
          <ul className="flex flex-wrap gap-2">{followed.map((b) => <li key={b.slug}><Link href={`/business/${b.slug}`} className="inline-block rounded-full border bg-card px-3 py-1.5 text-sm font-semibold hover:bg-muted">{b.name}</Link></li>)}</ul>
        )}
      </section>
      <section aria-labelledby="mine-h" className="space-y-3">
        <h2 id="mine-h" className="font-extrabold">{t.profile.myPosts}</h2>
        {mine.length === 0 ? <p className="text-sm text-muted-foreground">{t.profile.noPosts}</p> : mine.map((p) => <PostCard key={p.id} post={p} t={t} locale={locale} userId={profile.id} />)}
      </section>
      <form action={signOutAction}>
        <Button variant="outline" className="w-full"><LogOut aria-hidden />{t.auth.logout}</Button>
      </form>
    </div>
  );
}
