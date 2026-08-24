"use client";

import { useEffect } from "react";

/** Enregistre le service worker (PWA installable + cache hors ligne). */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return; // évite le cache en dev
    const timer = window.setTimeout(() => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* silencieux : l'application fonctionne sans */
      });
    }, 1500);
    return () => window.clearTimeout(timer);
  }, []);

  return null;
}
