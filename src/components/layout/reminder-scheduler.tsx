"use client";

import { useEffect, useRef } from "react";

type Reminder = {
  id: string;
  type: string;
  time: string;
  days: string;
  message: string | null;
};

/**
 * Rappels locaux (§17).
 *
 * Tant que l'application est ouverte (ou installée en PWA et rouverte),
 * on déclenche une notification système à l'heure prévue. Aucun serveur push
 * n'est nécessaire pour la V1 ; l'ajout ultérieur de Web Push ne changera que
 * la source du déclenchement.
 */
export function ReminderScheduler({ reminders }: { reminders: Reminder[] }) {
  const firedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (reminders.length === 0) return;

    const check = () => {
      if (Notification.permission !== "granted") return;
      const now = new Date();
      const isoDay = ((now.getDay() + 6) % 7) + 1; // 1 = lundi
      const hhmm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

      for (const r of reminders) {
        const days = r.days.split(",").map((d) => Number(d.trim()));
        if (!days.includes(isoDay)) continue;
        if (r.time !== hhmm) continue;

        const key = `${r.id}-${now.toDateString()}-${hhmm}`;
        if (firedRef.current.has(key)) continue;
        // Persisté pour ne pas répéter le rappel si l'onglet est rouvert.
        const stored = localStorage.getItem("muscu.reminders.fired");
        const fired = stored ? new Set<string>(JSON.parse(stored)) : new Set<string>();
        if (fired.has(key)) continue;

        firedRef.current.add(key);
        fired.add(key);
        localStorage.setItem("muscu.reminders.fired", JSON.stringify([...fired].slice(-60)));

        try {
          new Notification("Muscu", {
            body: r.message ?? "Rappel",
            icon: "/icons/icon-192.png",
            badge: "/icons/icon-192.png",
            tag: r.id,
          });
        } catch {
          /* certains navigateurs exigent le service worker : sans effet */
        }
      }
    };

    check();
    const timer = window.setInterval(check, 30_000);
    return () => window.clearInterval(timer);
  }, [reminders]);

  return null;
}
