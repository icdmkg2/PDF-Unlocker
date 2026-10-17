"use client";

import { useEffect } from "react";
import { allTools } from "@/lib/tools";

/** Registers /sw.js in production and asks it to cache every tool page for offline use. */
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;

    const urls = ["/", ...allTools.map((t) => t.href)];
    navigator.serviceWorker
      .register("/sw.js")
      .then(() => navigator.serviceWorker.ready)
      .then((reg) => reg.active?.postMessage({ type: "precache", urls }))
      .catch(() => {
        // Offline support is optional; the app works without it.
      });
  }, []);

  return null;
}
