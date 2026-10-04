"use client";

import { BellRing } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { deletePushSubscriptionAction, savePushPrefsAction, savePushSubscriptionAction, type PushPrefs } from "@/app/(main)/account/actions";
import type { Dictionary } from "@/lib/i18n/dictionaries";

const urlB64ToUint8 = (b64: string) => {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
};

type State = "loading" | "unsupported" | "denied" | "off" | "on";

/** Enable/disable Web Push on this device + choose which categories to receive. */
export function PushSettings({ vapidKey, initial, t }: { vapidKey: string; initial: PushPrefs; t: Dictionary["push"] }) {
  const [state, setState] = useState<State>("loading");
  const [prefs, setPrefs] = useState(initial);
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();

  useEffect(() => {
    (async () => {
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return setState("unsupported");
      if (Notification.permission === "denied") return setState("denied");
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      setState(sub ? "on" : "off");
    })().catch(() => setState("unsupported"));
  }, []);

  const enable = () => start(async () => {
    setMsg("");
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") return setState(perm === "denied" ? "denied" : "off");
      const reg = (await navigator.serviceWorker.getRegistration()) ?? (await navigator.serviceWorker.register("/sw.js"));
      await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlB64ToUint8(vapidKey) });
      const j = sub.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
      const ok = await savePushSubscriptionAction({ endpoint: j.endpoint, keys: j.keys }, navigator.userAgent);
      if (!ok) { await sub.unsubscribe(); return setMsg(t.error); }
      await savePushPrefsAction(prefs);
      setState("on");
    } catch { setMsg(t.error); }
  });

  const disable = () => start(async () => {
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    if (sub) { await deletePushSubscriptionAction(sub.endpoint); await sub.unsubscribe(); }
    setState("off");
  });

  const toggle = (k: keyof PushPrefs) => {
    const next = { ...prefs, [k]: !prefs[k] };
    setPrefs(next);
    start(async () => { setMsg((await savePushPrefsAction(next)) ? t.saved : t.error); });
  };

  const fields: [keyof PushPrefs, string][] = [["push_offers", t.offers], ["push_reviews", t.reviews], ["push_system", t.system], ["push_social", t.social]];
  return (
    <section aria-labelledby="push-h" className="space-y-3 rounded-xl border bg-card p-4">
      <h2 id="push-h" className="flex items-center gap-2 font-extrabold"><BellRing className="size-5 text-primary" aria-hidden />{t.title}</h2>
      {state === "unsupported" && <p className="text-sm text-muted-foreground">{t.unsupported}</p>}
      {state === "denied" && <p className="text-sm text-muted-foreground">{t.denied}</p>}
      {state === "off" && <Button onClick={enable} disabled={pending} className="w-full">{t.enable}</Button>}
      {state === "on" && (
        <>
          <p className="text-sm font-semibold text-success">{t.on}</p>
          <ul className="space-y-2 text-sm">
            {fields.map(([k, label]) => (
              <li key={k}><label className="flex items-center gap-2"><input type="checkbox" className="size-4 accent-primary" checked={prefs[k]} onChange={() => toggle(k)} />{label}</label></li>
            ))}
          </ul>
          <Button variant="outline" onClick={disable} disabled={pending} className="w-full">{t.disable}</Button>
        </>
      )}
      {msg && <p role="status" className="text-xs text-muted-foreground">{msg}</p>}
    </section>
  );
}
