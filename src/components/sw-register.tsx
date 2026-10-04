"use client";

import { useEffect } from "react";
import { supabaseConfigured } from "@/lib/env";

/**
 * Registers the service worker (production only) and wipes cached pages on sign-out (shared devices).
 * The Supabase client is loaded lazily and only for signed-in visitors, so guests don't pay for it.
 */
export function SwRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
    if (!supabaseConfigured || !document.cookie.includes("-auth-token")) return;
    let unsub: (() => void) | undefined;
    import("@/lib/supabase/client").then(({ createClient }) => {
      const { data } = createClient().auth.onAuthStateChange((event) => {
        if (event === "SIGNED_OUT") {
          navigator.serviceWorker.controller?.postMessage("clear-pages");
          // stop pushes for the previous user on this device (the stale server row is purged on the first 410)
          navigator.serviceWorker.getRegistration().then((r) => r?.pushManager.getSubscription()).then((s) => s?.unsubscribe()).catch(() => {});
        }
      });
      unsub = () => data.subscription.unsubscribe();
    });
    return () => unsub?.();
  }, []);
  return null;
}
