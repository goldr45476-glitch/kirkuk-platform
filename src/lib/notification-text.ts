/** Shared text + target URL for a notification (used by the notifications page and the push dispatcher). */
import type { Dictionary } from "./i18n/dictionaries";

export type NotificationLike = {
  type: string;
  data: { event?: string; excerpt?: string } | null;
  post_id: string | null;
  actor_name: string | null;
  business_name: string | null;
  business_slug: string | null;
};

export function notificationText(n: NotificationLike, t: Dictionary["notifications"]): string {
  if (n.type === "system") {
    const ev = n.data?.event;
    const tpl = ev ? (t.events as Record<string, string>)[ev] : undefined;
    if (tpl) return tpl.replace("{name}", n.data?.excerpt ?? n.business_name ?? "");
  }
  const tpl = (t as unknown as Record<string, string>)[n.type];
  return (typeof tpl === "string" ? tpl : t.system).replace("{actor}", n.actor_name || t.someone).replace("{business}", n.business_name ?? "");
}

export function notificationHref(n: NotificationLike): string {
  if (n.post_id) return `/post/${n.post_id}`;
  if (n.business_slug) return `/business/${n.business_slug}${n.type.startsWith("review") ? "#reviews" : ""}`;
  return "/notifications";
}
