import { ACTIVITY_LEVELS, MAIN_GOALS, type ActivityLevel, type MainGoal } from "./constants";

// ---------------------------------------------------------------------------
// FORCE
// ---------------------------------------------------------------------------

/**
 * 1RM estimé — formule d'Epley (§32).
 * Il s'agit d'une **estimation** : elle perd en fiabilité au-delà de 12 reps.
 * L'interface doit toujours le signaler.
 */
export function estimate1RM(weightKg: number, reps: number): number {
  if (!weightKg || !reps || reps < 1) return 0;
  if (reps === 1) return weightKg;
  return weightKg * (1 + reps / 30);
}

/** Charge théorique permettant d'atteindre `reps` répétitions à partir d'un 1RM. */
export function weightForReps(oneRm: number, reps: number): number {
  if (reps <= 1) return oneRm;
  return oneRm / (1 + reps / 30);
}

/** Volume d'une série. Une série d'échauffement compte 0 (§50). */
export function setVolume(set: { weightKg?: number | null; reps?: number | null; type?: string | null }): number {
  if (set.type === "W") return 0;
  return (set.weightKg ?? 0) * (set.reps ?? 0);
}

export function totalVolume(sets: { weightKg?: number | null; reps?: number | null; type?: string | null }[]): number {
  return sets.reduce((acc, s) => acc + setVolume(s), 0);
}

/** Séries « effectives » : l'échauffement est exclu des statistiques (§50). */
export function isWorkingSet(set: { type?: string | null; completed?: boolean }): boolean {
  return set.type !== "W" && set.completed !== false;
}

// ---------------------------------------------------------------------------
// POIDS CORPOREL
// ---------------------------------------------------------------------------

export type WeightPoint = { date: Date; weightKg: number };

/**
 * Moyenne glissante — c'est cette courbe qu'il faut regarder, pas les
 * variations journalières qui sont dominées par l'eau et le contenu digestif (§18).
 */
export function movingAverage(points: WeightPoint[], windowDays: number): { date: Date; value: number }[] {
  const sorted = [...points].sort((a, b) => a.date.getTime() - b.date.getTime());
  return sorted.map((p, i) => {
    const from = p.date.getTime() - windowDays * 86400000;
    let total = 0;
    let n = 0;
    for (let j = i; j >= 0; j--) {
      const q = sorted[j];
      if (q.date.getTime() < from) break;
      total += q.weightKg;
      n++;
    }
    return { date: p.date, value: n ? total / n : p.weightKg };
  });
}

/** Pente en kg/semaine calculée par régression linéaire sur la fenêtre donnée. */
export function weightTrend(points: WeightPoint[], windowDays = 30): number {
  const cutoff = Date.now() - windowDays * 86400000;
  const recent = points.filter((p) => p.date.getTime() >= cutoff);
  if (recent.length < 3) return 0;
  const x = recent.map((p) => p.date.getTime() / 86400000);
  const y = recent.map((p) => p.weightKg);
  const n = x.length;
  const mx = x.reduce((a, b) => a + b, 0) / n;
  const my = y.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (x[i] - mx) * (y[i] - my);
    den += (x[i] - mx) ** 2;
  }
  if (den === 0) return 0;
  return (num / den) * 7; // kg par semaine
}

// ---------------------------------------------------------------------------
// NUTRITION
// ---------------------------------------------------------------------------

/** Métabolisme de base — Mifflin-St Jeor. */
export function bmr(params: {
  weightKg: number;
  heightCm: number;
  age: number;
  sex?: string | null;
}): number {
  const { weightKg, heightCm, age, sex } = params;
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  if (sex === "femme") return base - 161;
  return base + 5; // homme / non précisé
}

/** Dépense énergétique totale estimée. */
export function tdee(params: {
  weightKg: number;
  heightCm: number;
  age: number;
  sex?: string | null;
  activityLevel: ActivityLevel;
  sessionsPerWeek?: number;
}): number {
  const factor = ACTIVITY_LEVELS[params.activityLevel]?.factor ?? 1.55;
  // Les séances de musculation ajoutent une dépense modeste mais réelle.
  const trainingBonus = (params.sessionsPerWeek ?? 0) * 45;
  return bmr(params) * factor + trainingBonus;
}

export type MacroTargets = { kcal: number; protein: number; carbs: number; fat: number; fiber: number };

/**
 * Objectifs caloriques et macros suggérés (§53).
 * Toujours modifiables manuellement par l'utilisateur.
 */
export function suggestMacros(params: {
  weightKg: number;
  heightCm: number;
  age: number;
  sex?: string | null;
  activityLevel: ActivityLevel;
  mainGoal: MainGoal;
  sessionsPerWeek?: number;
}): MacroTargets {
  const goal = MAIN_GOALS[params.mainGoal] ?? MAIN_GOALS.hypertrophie;
  const kcal = Math.round((tdee(params) + goal.surplus) / 10) * 10;

  const protein = Math.round(params.weightKg * goal.proteinPerKg);
  // Lipides : 25 % des calories, plancher à 0,8 g/kg pour la santé hormonale.
  const fat = Math.max(Math.round((kcal * 0.25) / 9), Math.round(params.weightKg * 0.8));
  const carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4));
  const fiber = Math.round((kcal / 1000) * 14);

  return { kcal, protein, carbs, fat, fiber };
}

export function age(birthDate: Date | string | null | undefined): number {
  if (!birthDate) return 30;
  const b = new Date(birthDate);
  const now = new Date();
  let a = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) a--;
  return a;
}

export function macroKcal(protein: number, carbs: number, fat: number): number {
  return protein * 4 + carbs * 4 + fat * 9;
}

/** Macros d'une portion d'aliment. */
export function foodMacros(
  food: { kcal100: number; protein100: number; carbs100: number; fat100: number; fiber100?: number | null },
  grams: number
) {
  const r = grams / 100;
  return {
    kcal: food.kcal100 * r,
    protein: food.protein100 * r,
    carbs: food.carbs100 * r,
    fat: food.fat100 * r,
    fiber: (food.fiber100 ?? 0) * r,
  };
}

// ---------------------------------------------------------------------------
// SCORE DE RÉGULARITÉ (§28) — bienveillant, jamais culpabilisant.
// ---------------------------------------------------------------------------

export type ConsistencyInput = {
  plannedWorkouts: number;
  completedWorkouts: number;
  daysWithNutrition: number;
  daysWithWeight: number;
  windowDays: number;
};

export function consistencyScore(input: ConsistencyInput): {
  score: number;
  parts: { label: string; value: number; weight: number }[];
} {
  const workout = input.plannedWorkouts > 0 ? Math.min(1, input.completedWorkouts / input.plannedWorkouts) : input.completedWorkouts > 0 ? 1 : 0;
  const nutrition = Math.min(1, input.daysWithNutrition / input.windowDays);
  const weight = Math.min(1, input.daysWithWeight / input.windowDays);

  const parts = [
    { label: "Séances réalisées", value: workout, weight: 0.5 },
    { label: "Alimentation encodée", value: nutrition, weight: 0.3 },
    { label: "Poids encodé", value: weight, weight: 0.2 },
  ];
  const score = Math.round(parts.reduce((acc, p) => acc + p.value * p.weight, 0) * 100);
  return { score, parts };
}
