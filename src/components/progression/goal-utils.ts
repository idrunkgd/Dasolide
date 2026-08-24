import { clamp, daysBetween, parseDateKey, startOfDay } from "@/lib/utils";

/** Objectif tel qu'il est affiché : la valeur courante vient des données réelles. */
export type GoalView = {
  id: string;
  type: string;
  title: string;
  unit: string;
  startValue: number;
  targetValue: number;
  /** "YYYY-MM-DD" ou null */
  targetDate: string | null;
  status: string;
  measureKey: string | null;
  exerciseId: string | null;
  exerciseName: string | null;
  /** null quand aucune donnée ne permet encore de la calculer. */
  currentValue: number | null;
};

export type GoalProgress = {
  /** 0 → 1 */
  ratio: number;
  percent: number;
  /** Ce qu'il reste à parcourir, toujours positif. */
  remaining: number;
  reached: boolean;
  /** true quand rien ne permet de calculer automatiquement l'avancement. */
  manual: boolean;
};

export function goalProgress(goal: GoalView): GoalProgress {
  const span = goal.targetValue - goal.startValue;
  const manual = goal.currentValue == null;
  const current = goal.currentValue ?? goal.startValue;

  const ratio = span === 0 ? (current === goal.targetValue ? 1 : 0) : clamp((current - goal.startValue) / span, 0, 1);
  const reached = span === 0 ? current === goal.targetValue : span > 0 ? current >= goal.targetValue : current <= goal.targetValue;

  return {
    ratio,
    percent: Math.round(ratio * 100),
    remaining: reached ? 0 : Math.abs(Math.round((goal.targetValue - current) * 10) / 10),
    reached,
    manual,
  };
}

/**
 * Valeur courante d'un objectif, relue depuis les données réelles.
 * `measurements` doit être trié du plus récent au plus ancien.
 */
export function resolveCurrentValue(
  goal: { type: string; measureKey: string | null; exerciseId: string | null },
  context: {
    lastWeightKg: number | null;
    measurements: Record<string, unknown>[];
    bestByExercise: Map<string, number>;
  }
): number | null {
  if (goal.type === "poids") return context.lastWeightKg;

  if (goal.type === "mensuration" && goal.measureKey) {
    for (const m of context.measurements) {
      const value = m[goal.measureKey];
      if (typeof value === "number") return value;
    }
    return null;
  }

  if (goal.type === "force" && goal.exerciseId) {
    return context.bestByExercise.get(goal.exerciseId) ?? null;
  }

  // Nutrition et habitude : rien à relire automatiquement, suivi manuel.
  return null;
}

/** Jours restants avant la date cible (négatif si la date est dépassée). */
export function daysLeft(targetDate: string | null): number | null {
  if (!targetDate) return null;
  return daysBetween(startOfDay(), parseDateKey(targetDate));
}

/** Unité proposée par défaut selon le type d'objectif. */
export function defaultUnitFor(type: string): string {
  switch (type) {
    case "mensuration":
      return "cm";
    case "nutrition":
      return "kcal";
    case "habitude":
      return "séances";
    default:
      return "kg";
  }
}
