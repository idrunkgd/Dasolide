import type { SessionExerciseState } from "@/components/session/types";

/**
 * Sauvegarde locale de la séance en cours (§40, §41).
 *
 * Toute modification est écrite immédiatement dans localStorage. Si le
 * navigateur est fermé, le téléphone se met en veille ou le réseau tombe,
 * rien n'est perdu : au retour, l'état local est comparé à l'état serveur et
 * le plus récent gagne.
 */

const KEY_PREFIX = "muscu.session.";

export type StoredSession = {
  sessionId: string;
  exercises: SessionExerciseState[];
  durationSeconds: number;
  currentIndex: number;
  updatedAt: number;
  /** Passe à false dès qu'une synchronisation serveur a réussi. */
  dirty: boolean;
};

export function loadLocalSession(sessionId: string): StoredSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY_PREFIX + sessionId);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredSession;
    if (parsed.sessionId !== sessionId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveLocalSession(state: StoredSession): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY_PREFIX + state.sessionId, JSON.stringify(state));
  } catch {
    /* quota dépassé : la synchronisation serveur reste le filet de sécurité */
  }
}

export function clearLocalSession(sessionId: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(KEY_PREFIX + sessionId);
  } catch {
    /* ignoré */
  }
}

/** Nettoie les séances locales qui traînent depuis plus de deux jours. */
export function pruneLocalSessions(): void {
  if (typeof window === "undefined") return;
  try {
    const cutoff = Date.now() - 2 * 86400000;
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (!key?.startsWith(KEY_PREFIX)) continue;
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw) as StoredSession;
      if (parsed.updatedAt < cutoff) localStorage.removeItem(key);
    }
  } catch {
    /* ignoré */
  }
}
