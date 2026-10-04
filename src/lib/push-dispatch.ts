import { dictionaries } from "./i18n/dictionaries";
import { notificationHref, notificationText, type NotificationLike } from "./notification-text";
import type { Locale } from "./types";

export type PendingPush = NotificationLike & {
  id: string; user_id: string; locale: Locale | null;
  subscriptions: { endpoint: string; keys: { p256dh: string; auth: string } }[] | null;
};
export type SendResult = { ok: true } | { ok: false; gone: boolean };
export type Sender = (sub: { endpoint: string; keys: { p256dh: string; auth: string } }, payload: string) => Promise<SendResult>;

/** Builds the JSON the service worker shows. `tag` collapses duplicates of the same notification. */
export function buildPayload(n: PendingPush) {
  const t = (dictionaries[n.locale ?? "ar"] ?? dictionaries.ar).notifications;
  return { title: t.title, body: notificationText(n, t), url: notificationHref(n), tag: n.id };
}

/** Sends every pending notification to all of the user's devices. Returns ids to mark pushed and endpoints to delete. */
export async function dispatch(pending: PendingPush[], send: Sender) {
  const done: string[] = [];
  const dead = new Set<string>();
  let sent = 0, failed = 0;
  for (const n of pending) {
    const payload = JSON.stringify(buildPayload(n));
    const results = await Promise.all((n.subscriptions ?? []).map(async (s) => {
      try { return { s, r: await send(s, payload) }; } catch { return { s, r: { ok: false, gone: false } as SendResult }; }
    }));
    for (const { s, r } of results) {
      if (r.ok) sent++; else { failed++; if (r.gone) dead.add(s.endpoint); }
    }
    // Mark as handled unless every attempt failed transiently (then retry next run, within the 6h window).
    const transient = results.length > 0 && results.every(({ r }) => !r.ok && !r.gone);
    if (!transient) done.push(n.id);
  }
  return { done, dead: [...dead], sent, failed };
}
