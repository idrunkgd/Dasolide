"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play, SkipForward } from "lucide-react";
import { cn, formatDuration } from "@/lib/utils";

/**
 * Timer de repos (§9).
 *
 * Il flotte au-dessus de la barre d'action : on continue de voir la série en
 * cours. Le décompte est calculé à partir d'un horodatage absolu pour rester
 * juste même si l'onglet est mis en veille par le système.
 */
export function RestTimer({
  seconds,
  vibrate,
  sound,
  onDone,
  onSkip,
}: {
  seconds: number;
  vibrate: boolean;
  sound: boolean;
  onDone: () => void;
  onSkip: () => void;
}) {
  const [total, setTotal] = useState(seconds);
  const [remaining, setRemaining] = useState(seconds);
  const [paused, setPaused] = useState(false);
  const endAtRef = useRef(Date.now() + seconds * 1000);
  const pausedAtRef = useRef<number | null>(null);
  const firedRef = useRef(false);

  useEffect(() => {
    const tick = () => {
      if (pausedAtRef.current !== null) return;
      const left = Math.max(0, Math.round((endAtRef.current - Date.now()) / 1000));
      setRemaining(left);
      if (left === 0 && !firedRef.current) {
        firedRef.current = true;
        notifyEnd();
        window.setTimeout(onDone, 1200);
      }
    };
    tick();
    const timer = window.setInterval(tick, 250);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function notifyEnd() {
    if (vibrate) {
      try {
        navigator.vibrate?.([120, 60, 120]);
      } catch {
        /* non supporté */
      }
    }
    if (sound) {
      try {
        // Bip généré à la volée : aucun fichier audio à charger.
        const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const ctx = new Ctx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.value = 880;
        osc.type = "sine";
        gain.gain.setValueAtTime(0.0001, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5);
        osc.connect(gain).connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.5);
        window.setTimeout(() => void ctx.close(), 800);
      } catch {
        /* audio bloqué : sans effet */
      }
    }
    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      try {
        new Notification("Repos terminé", { body: "Série suivante 💪", tag: "muscu-rest", silent: !sound });
      } catch {
        /* ignoré */
      }
    }
  }

  function adjust(delta: number) {
    endAtRef.current += delta * 1000;
    setTotal((t) => Math.max(5, t + delta));
    firedRef.current = false;
    const left = Math.max(0, Math.round((endAtRef.current - Date.now()) / 1000));
    setRemaining(left);
  }

  function togglePause() {
    if (pausedAtRef.current === null) {
      pausedAtRef.current = Date.now();
      setPaused(true);
    } else {
      endAtRef.current += Date.now() - pausedAtRef.current;
      pausedAtRef.current = null;
      setPaused(false);
    }
  }

  const ratio = total > 0 ? remaining / total : 0;
  const done = remaining === 0;

  return (
    <div
      className="fixed inset-x-0 z-40 mx-auto max-w-2xl px-4"
      style={{ bottom: "calc(env(safe-area-inset-bottom) + 5.25rem)" }}
      role="timer"
      aria-live="polite"
    >
      <div
        className={cn(
          "animate-fade-up overflow-hidden rounded-3xl border shadow-lg",
          done ? "border-accent-border bg-accent-soft" : "border-border bg-bg-elevated"
        )}
      >
        <div className="h-1 bg-surface-2">
          <div
            className="h-full bg-accent transition-[width] duration-300 ease-linear"
            style={{ width: `${ratio * 100}%` }}
          />
        </div>

        <div className="flex items-center gap-3 px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="text-[0.65rem] font-medium uppercase tracking-wider text-subtle">
              {done ? "Repos terminé" : "Repos"}
            </p>
            <p className={cn("tabular text-2xl font-bold leading-none", done && "text-accent")}>
              {formatDuration(remaining)}
            </p>
          </div>

          <button
            onClick={() => adjust(-30)}
            className="tabular h-10 rounded-xl bg-surface-2 px-3 text-sm font-medium text-muted active:scale-95"
          >
            −30s
          </button>
          <button
            onClick={() => adjust(30)}
            className="tabular h-10 rounded-xl bg-surface-2 px-3 text-sm font-medium text-muted active:scale-95"
          >
            +30s
          </button>
          <button
            onClick={togglePause}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-2 text-muted active:scale-95"
            aria-label={paused ? "Reprendre" : "Mettre en pause"}
          >
            {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
          </button>
          <button
            onClick={onSkip}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-accent-contrast active:scale-95"
            aria-label="Passer le repos"
          >
            <SkipForward className="h-4 w-4" fill="currentColor" />
          </button>
        </div>
      </div>
    </div>
  );
}
