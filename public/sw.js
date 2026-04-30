// Inspector PWA Service Worker
//
// Design rule: the SW must never make things worse than no SW. We only
// intercept requests where we can deliver a real benefit (offline navigation,
// long-lived static icon assets). Everything else is passed straight through to
// the browser, so a transient fetch failure looks like a normal network error
// instead of a synthesized 504 that triggers ChunkLoadError / React #423.

const CACHE_NAME = "inspector-v3";
const OFFLINE_URL = "/offline";

const PRECACHE_URLS = [
  "/offline",
  "/manifest.webmanifest",
  "/icons/icon-192.svg",
  "/icons/icon-512.svg",
  "/icons/logo.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await Promise.all(
        PRECACHE_URLS.map((url) =>
          fetch(url, { cache: "reload" })
            .then((res) => {
              if (res && res.ok) return cache.put(url, res.clone());
            })
            .catch(() => {}),
        ),
      );
    })(),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

function fallbackOffline() {
  return new Response(
    "<!doctype html><meta charset=utf-8><title>Offline</title><div style=\"font-family:system-ui;display:grid;place-items:center;height:100vh;color:#0f172a\"><div style=\"text-align:center\"><h1 style=\"font-size:2rem;margin:0\">You're offline</h1><p style=\"color:#64748b\">Reconnect to load this page.</p></div></div>",
    { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}

async function handleNavigate(request) {
  try {
    const network = await fetch(request);
    return network;
  } catch {
    const offline = await caches.match(OFFLINE_URL);
    return offline ?? fallbackOffline();
  }
}

async function handleStaticIcon(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const res = await fetch(request);
    if (res && res.ok) {
      const copy = res.clone();
      caches.open(CACHE_NAME).then((c) => c.put(request, copy)).catch(() => {});
    }
    return res;
  } catch {
    return new Response("", { status: 504, statusText: "Offline" });
  }
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  let url;
  try {
    url = new URL(req.url);
  } catch {
    return;
  }
  if (url.origin !== self.location.origin) return;

  // Always pass through — these are either dynamic, hashed, or auth flows
  // where SW interference causes more bugs than it solves.
  if (url.pathname.startsWith("/api/")) return;
  if (url.pathname.startsWith("/_next/")) return;
  if (url.pathname === "/sw.js") return;

  // Navigations: network-first, fall back to the offline shell only when the
  // network actually rejects.
  if (req.mode === "navigate") {
    event.respondWith(handleNavigate(req));
    return;
  }

  // Manifest + icons benefit from being available offline.
  if (
    url.pathname === "/manifest.webmanifest" ||
    url.pathname.startsWith("/icons/")
  ) {
    event.respondWith(handleStaticIcon(req));
    return;
  }

  // Everything else (favicons, robots.txt, fonts proxied through us, etc.):
  // do nothing — the browser handles it natively.
});

self.addEventListener("push", (event) => {
  if (!event.data) return;
  let data = {};
  try {
    data = event.data.json();
  } catch {
    data = { title: "Inspector", body: event.data.text() };
  }
  event.waitUntil(
    self.registration.showNotification(data.title || "Inspector", {
      body: data.body,
      icon: "/icons/icon-192.svg",
      badge: "/icons/icon-192.svg",
      tag: data.tag,
      data: { url: data.url || "/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(self.clients.openWindow(url));
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});
