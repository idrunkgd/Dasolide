import { roundToIncrement } from "./utils";

/**
 * Progression automatique (§13).
 *
 * Principe volontairement simple et **explicable** : on regarde la dernière
 * séance sur l'exercice ; si toutes les séries de travail ont atteint le haut
 * de la fourchette de répétitions, on propose la charge supérieure. Si les
 * performances sont nettement en dessous, on propose de maintenir — ou de
 * réduire après deux échecs consécutifs.
 *
 * La suggestion n'est jamais appliquée automatiquement : elle est affichée
 * avec sa justification et l'utilisateur reste libre.
 */

export type SetPerf = { weightKg: number | null; reps: number | null; type: string; completed: boolean };

export type Suggestion = {
  weightKg: number;
  reps: number;
  action: "augmenter" | "maintenir" | "reduire" | "premiere_fois";
  reason: string;
};

export type ProgressionOptions = {
  targetRepsMin: number;
  targetRepsMax: number;
  /** Incrément de charge : 2,5 kg haut du corps, 5 kg bas du corps par défaut. */
  incrementKg: number;
  /** Historique le plus récent en premier. Chaque entrée = les séries d'une séance. */
  history: SetPerf[][];
};

export function suggestNextLoad(opts: ProgressionOptions): Suggestion | null {
  const { targetRepsMin, targetRepsMax, incrementKg, history } = opts;

  const sessions = history
    .map((sets) => sets.filter((s) => s.type !== "W" && s.completed && (s.reps ?? 0) > 0))
    .filter((sets) => sets.length > 0);

  if (sessions.length === 0) return null;

  const last = sessions[0];
  const workingWeight = mode(last.map((s) => s.weightKg ?? 0));
  const atWeight = last.filter((s) => (s.weightKg ?? 0) >= workingWeight - 0.01);
  const minReps = Math.min(...atWeight.map((s) => s.reps ?? 0));

  if (sessions.length === 1 && workingWeight === 0) {
    return {
      weightKg: 0,
      reps: targetRepsMax,
      action: "premiere_fois",
      reason: "Première séance sur cet exercice : choisis une charge que tu maîtrises.",
    };
  }

  // Toutes les séries au sommet de la fourchette → on monte.
  if (minReps >= targetRepsMax) {
    const next = roundToIncrement(workingWeight + incrementKg, incrementKg);
    return {
      weightKg: next,
      reps: targetRepsMin,
      action: "augmenter",
      reason: `Toutes les séries à ${minReps} reps ou plus la dernière fois : +${incrementKg} kg.`,
    };
  }

  // Deux séances consécutives sous le bas de la fourchette → on redescend.
  if (sessions.length >= 2) {
    const prev = sessions[1];
    const prevWeight = mode(prev.map((s) => s.weightKg ?? 0));
    const prevMin = Math.min(
      ...prev.filter((s) => (s.weightKg ?? 0) >= prevWeight - 0.01).map((s) => s.reps ?? 0)
    );
    if (minReps < targetRepsMin && prevMin < targetRepsMin && Math.abs(prevWeight - workingWeight) < 0.01) {
      const next = roundToIncrement(Math.max(0, workingWeight - incrementKg * 2), incrementKg);
      return {
        weightKg: next,
        reps: targetRepsMax,
        action: "reduire",
        reason: `Deux séances sous ${targetRepsMin} reps : un léger deload aidera à repartir.`,
      };
    }
  }

  return {
    weightKg: workingWeight,
    reps: Math.min(targetRepsMax, minReps + 1),
    action: "maintenir",
    reason: `Objectif : atteindre ${targetRepsMax} reps sur toutes les séries avant d'augmenter.`,
  };
}

/** Incrément conseillé selon le groupe musculaire travaillé. */
export function defaultIncrement(category: string, upper = 2.5, lower = 5): number {
  const lowerBody = ["quadriceps", "ischios", "fessiers", "mollets", "lombaires"];
  return lowerBody.includes(category) ? lower : upper;
}

function mode(values: number[]): number {
  if (values.length === 0) return 0;
  const counts = new Map<number, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  let best = values[0];
  let bestCount = 0;
  for (const [v, c] of counts) {
    if (c > bestCount || (c === bestCount && v > best)) {
      best = v;
      bestCount = c;
    }
  }
  return best;
}

/**
 * Détection de plateau : aucune progression de 1RM estimé sur la période.
 * Utilisé par les statistiques, et prêt pour l'assistant IA à venir (§46).
 */
export function detectPlateau(points: { date: Date; oneRm: number }[], weeks = 6): boolean {
  const cutoff = Date.now() - weeks * 7 * 86400000;
  const recent = points.filter((p) => p.date.getTime() >= cutoff);
  if (recent.length < 4) return false;
  const best = Math.max(...recent.map((p) => p.oneRm));
  const first = recent[0].oneRm;
  return best <= first * 1.01;
}
