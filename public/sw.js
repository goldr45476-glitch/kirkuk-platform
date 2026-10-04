/* Service worker: fast repeat visits + graceful offline.
 * - static assets: cache-first (they are content-hashed)
 * - public content pages (business/collection/listing): network-first, cached copy when offline
 * - everything user-specific (account, saved, dashboard, admin, notifications…) is NEVER cached
 * - all other navigations: network, falling back to /offline
 */
const V = "v1";
const STATIC = `static-${V}`;
const PAGES = `pages-${V}`;
const OFFLINE = "/offline";
const CACHEABLE_PAGE = /^\/(business|collections|listings|categories)(\/|$)/;

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(STATIC).then((c) => c.add(OFFLINE)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => ![STATIC, PAGES].includes(k)).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("message", (e) => { if (e.data === "clear-pages") caches.delete(PAGES); });  // sent on sign-out

const timeout = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), ms))]);

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin || url.pathname.startsWith("/api/") || url.pathname.startsWith("/auth/")) return;

  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/") || /\.(?:woff2?|png|jpg|webp|svg)$/.test(url.pathname)) {
    e.respondWith(caches.open(STATIC).then(async (c) => {
      const hit = await c.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok) c.put(req, res.clone());
      return res;
    }));
    return;
  }

  if (req.mode === "navigate") {
    const cacheable = CACHEABLE_PAGE.test(url.pathname);
    e.respondWith((async () => {
      try {
        const res = await timeout(fetch(req), cacheable ? 4000 : 15000);
        if (cacheable && res.ok && !res.redirected) (await caches.open(PAGES)).put(req, res.clone());
        return res;
      } catch {
        if (cacheable) { const hit = await caches.match(req, { cacheName: PAGES }); if (hit) return hit; }
        return (await caches.match(OFFLINE, { cacheName: STATIC })) || Response.error();
      }
    })());
  }
});

/* ---- Web Push ---- */
self.addEventListener("push", (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch {}
  e.waitUntil(self.registration.showNotification(d.title || "Kirkuk", {
    body: d.body || "", tag: d.tag, icon: "/icons/icon-192.png", badge: "/icons/icon-192.png", data: { url: typeof d.url === "string" && d.url.startsWith("/") ? d.url : "/notifications" },
  }));
});
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = new URL(e.notification.data?.url || "/notifications", location.origin).href;
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((cs) => {
    const c = cs.find((w) => w.url.startsWith(location.origin));
    return c ? c.focus().then(() => c.navigate(url)) : self.clients.openWindow(url);
  }));
});
