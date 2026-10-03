import { LogOut } from "lucide-react";
import { redirect } from "next/navigation";
import { Badge, Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ProfileForm } from "@/features/auth/profile-form";
import { PostCard } from "@/features/feed/post-card";
import { ListingCard } from "@/components/listing-card";
import { OwnerControls } from "@/features/listings/listing-actions";
import { getCurrentProfile, getFeed, getFollowedBusinesses, getMyListings } from "@/lib/data";
import { getMyContributions, getOwnedBusinesses } from "@/lib/data-dashboard";
import { formatDate } from "@/lib/time";
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
  const [mine, followed, myListings, contribs, owned] = await Promise.all([getFeed({ author: profile.id, limit: 20 }), getFollowedBusinesses(), getMyListings(), getMyContributions(), getOwnedBusinesses()]);
  const isStaff = profile.role === "admin" || profile.role === "moderator";

  return (
    <div className="mx-auto max-w-lg space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold">{t.account.title}</h1>
        <Badge tone="primary">{t.account.roles[profile.role]}</Badge>
      </div>
      {profile.phone && <p className="text-sm text-muted-foreground" dir="ltr">+{profile.phone.replace(/^\+/, "")}</p>}
      <Card className="p-5"><ProfileForm profile={profile} t={t.account} common={t.common} /></Card>
      <nav aria-label={t.account.title} className="flex flex-wrap gap-2 text-sm font-bold">
        {(owned.length > 0 || profile.role === "owner") && <Link href="/dashboard" className="rounded-full bg-primary px-4 py-2 text-primary-foreground">{t.dash.title}</Link>}
        <Link href="/suggest" className="rounded-full border bg-card px-4 py-2 hover:bg-muted">{t.suggest.title}</Link>
        {isStaff && <Link href="/admin" className="rounded-full bg-accent px-4 py-2 text-accent-foreground">الإدارة</Link>}
      </nav>
      <section aria-labelledby="contrib-h" className="space-y-2">
        <h2 id="contrib-h" className="font-extrabold">{t.suggest.mine}</h2>
        {contribs.length === 0 ? <p className="text-sm text-muted-foreground">{t.suggest.empty}</p> : (
          <ul className="divide-y rounded-xl border bg-card text-sm">
            {contribs.map((c) => (
              <li key={`${c.kind}-${c.id}`} className="flex items-center justify-between gap-2 p-3">
                <span className="min-w-0"><span className="block truncate font-semibold">{c.label}</span><span className="text-xs text-muted-foreground">{c.kind === "claim" ? t.claim.typeClaim : c.type === "edit" ? t.suggest.typeEdit : t.suggest.typeNew} · {formatDate(c.created_at, locale)}</span></span>
                <Badge tone={c.status === "approved" ? "success" : c.status === "pending" ? "accent" : "muted"}>{t.suggest.status[c.status]}</Badge>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section aria-labelledby="following-h" className="space-y-2">
        <h2 id="following-h" className="font-extrabold">{t.profile.following}</h2>
        {followed.length === 0 ? <p className="text-sm text-muted-foreground">{t.profile.noFollowing}</p> : (
          <ul className="flex flex-wrap gap-2">{followed.map((b) => <li key={b.slug}><Link href={`/business/${b.slug}`} className="inline-block rounded-full border bg-card px-3 py-1.5 text-sm font-semibold hover:bg-muted">{b.name}</Link></li>)}</ul>
        )}
      </section>
      <section aria-labelledby="ads-h" className="space-y-3">
        <h2 id="ads-h" className="font-extrabold">{t.listings.mine}</h2>
        {myListings.length === 0 ? <p className="text-sm text-muted-foreground">{t.listings.noMine}</p> : myListings.map((l) => (
          <div key={l.id} className="space-y-2">
            <ListingCard l={l} t={t} locale={locale} />
            <OwnerControls id={l.id} status={(l as { status?: string }).status ?? "active"} t={t} />
          </div>
        ))}
      </section>
      <section aria-labelledby="mine-h" className="space-y-3">
        <h2 id="mine-h" className="font-extrabold">{t.profile.myPosts}</h2>
        {mine.length === 0 ? <p className="text-sm text-muted-foreground">{t.profile.noPosts}</p> : mine.map((p) => <PostCard key={p.id} post={p} t={t} locale={locale} userId={profile.id} />)}
      </section>
      <p className="text-center text-xs"><Link href="/account/delete" className="font-semibold text-muted-foreground underline hover:text-destructive">{t.misc.del.link}</Link></p>
      <form action={signOutAction}>
        <Button variant="outline" className="w-full"><LogOut aria-hidden />{t.auth.logout}</Button>
      </form>
    </div>
  );
}
