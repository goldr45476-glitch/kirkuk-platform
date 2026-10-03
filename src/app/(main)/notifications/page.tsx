import { Bell, Heart, MessageCircle, Megaphone, Reply, Star, Tag, UserPlus } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { MarkRead } from "@/features/notifications/mark-read";
import { getCurrentProfile, getNotifications } from "@/lib/data";
import { getI18n } from "@/lib/i18n/server";
import { timeAgo } from "@/lib/time";
import { cn } from "@/lib/utils";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t.notifications.title, robots: { index: false } };
}

const ICONS = { follow: UserPlus, like: Heart, comment: MessageCircle, offer: Tag, post: Megaphone, review: Star, review_reply: Reply } as const;

export default async function NotificationsPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login?next=/notifications");
  const { t, locale } = await getI18n();
  const items = await getNotifications();
  const n = t.notifications;
  const text = (i: (typeof items)[number]) => {
    const tpl = (n as unknown as Record<string, string>)[i.type] ?? n.system;
    return tpl.replace("{actor}", i.actor?.full_name || n.someone).replace("{business}", i.business?.name ?? "");
  };

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <h1 className="text-2xl font-extrabold">{n.title}</h1>
      <MarkRead hasUnread={items.some((i) => !i.read_at)} />
      {items.length === 0 ? (
        <p className="flex flex-col items-center gap-2 py-16 text-muted-foreground"><Bell className="size-8" aria-hidden />{n.empty}</p>
      ) : (
        <ul className="space-y-2">
          {items.map((i) => {
            const Icon = ICONS[i.type as keyof typeof ICONS] ?? Bell;
            const href = i.post_id ? `/post/${i.post_id}` : i.business ? `/business/${i.business.slug}${i.type.startsWith("review") ? "#reviews" : ""}` : "#";
            return (
              <li key={i.id}>
                <Link href={href}>
                  <Card className={cn("flex items-start gap-3 p-3 transition hover:bg-muted", !i.read_at && "border-primary/40 bg-primary/5")}>
                    <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/12 text-primary"><Icon className="size-5" aria-hidden /></span>
                    <div className="min-w-0">
                      <p className="font-semibold leading-snug">{text(i)}</p>
                      {i.data?.excerpt && <p className="truncate text-sm text-muted-foreground">“{i.data.excerpt}”</p>}
                      <p className="text-xs text-muted-foreground">{timeAgo(i.created_at, locale)}</p>
                    </div>
                  </Card>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
