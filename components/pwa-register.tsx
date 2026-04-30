"use client";

import { useEffect } from "react";

export function PWARegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;

    const onLoad = async () => {
      try {
        const reg = await navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" });
        // Whenever a new SW takes control, reload once so the page picks up
        // anything the previous (potentially broken) SW had in flight.
        let reloading = false;
        navigator.serviceWorker.addEventListener("controllerchange", () => {
          if (reloading) return;
          reloading = true;
          window.location.reload();
        });
        // Force the freshly-installed worker to activate immediately rather
        // than waiting for the next page load.
        reg.addEventListener("updatefound", () => {
          const installing = reg.installing;
          if (!installing) return;
          installing.addEventListener("statechange", () => {
            if (installing.state === "installed" && navigator.serviceWorker.controller) {
              installing.postMessage("SKIP_WAITING");
            }
          });
        });
        // Periodically poll for updates so long-lived tabs pick up new builds.
        setInterval(() => {
          reg.update().catch(() => {});
        }, 60 * 60 * 1000);
      } catch {
        // ignore — SW is best-effort
      }
    };

    window.addEventListener("load", onLoad);
    return () => window.removeEventListener("load", onLoad);
  }, []);
  return null;
}
