// Drains pending notifications to Web Push. Called by a Supabase Database Webhook (notifications INSERT)
// and/or a once-a-minute cron (also queues "saved offer ends soon" alerts). Auth: shared secret header.
import { createClient } from "@supabase/supabase-js";
import { timingSafeEqual } from "node:crypto";
import webpush from "web-push";
import { SUPABASE_URL } from "@/lib/env";
import { dispatch, type PendingPush, type Sender } from "@/lib/push-dispatch";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const safeEqual = (a: string, b: string) => {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

export async function POST(req: Request) {
  const secret = process.env.PUSH_DISPATCH_SECRET;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY, priv = process.env.VAPID_PRIVATE_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret || !pub || !priv || !serviceKey) return Response.json({ error: "push not configured" }, { status: 503 });
  const given = req.headers.get("x-push-secret") ?? req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!safeEqual(given, secret)) return Response.json({ error: "unauthorized" }, { status: 401 });

  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:admin@example.com", pub, priv);
  const db = createClient(SUPABASE_URL, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

  const queued = await db.rpc("queue_expiring_offer_alerts");
  const { data, error } = await db.rpc("pending_push", { p_limit: 200 });
  if (error) { console.error(JSON.stringify({ level: "error", msg: "pending_push failed", error: error.message })); return Response.json({ error: "db" }, { status: 500 }); }

  const send: Sender = async (sub, payload) => {
    try {
      await webpush.sendNotification(sub, payload, { TTL: 6 * 3600, urgency: "normal" });
      return { ok: true };
    } catch (e) {
      const code = (e as { statusCode?: number }).statusCode;
      return { ok: false, gone: code === 404 || code === 410 };
    }
  };
  const r = await dispatch((data ?? []) as PendingPush[], send);
  if (r.dead.length) await db.from("push_subscriptions").delete().in("endpoint", r.dead);
  if (r.done.length) await db.rpc("mark_pushed", { p_ids: r.done });
  return Response.json({ alerts: queued.data ?? 0, pending: (data ?? []).length, sent: r.sent, failed: r.failed, removed: r.dead.length });
}
