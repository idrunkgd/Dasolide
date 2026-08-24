import { normalizeSearch } from "@/lib/utils";

/** Données minimales d'une ligne de la bibliothèque (§6). */
export type LibraryExercise = {
  id: string;
  name: string;
  category: string;
  equipment: string;
  difficulty: string;
  movementType: string;
  isCustom: boolean;
  isFavorite: boolean;
  primaryMuscle: string;
};

export type LibraryTab = "tous" | "favoris" | "mes";

export const LIBRARY_TABS: { value: LibraryTab; label: string }[] = [
  { value: "tous", label: "Tous" },
  { value: "favoris", label: "Favoris" },
  { value: "mes", label: "Mes exercices" },
];

/** Un exercice est trouvé par son nom OU par son muscle principal. */
export function matchesQuery(exercise: LibraryExercise, needle: string): boolean {
  if (!needle) return true;
  return (
    normalizeSearch(exercise.name).includes(needle) ||
    normalizeSearch(exercise.primaryMuscle).includes(needle)
  );
}

export function sortByRelevance(list: LibraryExercise[], needle: string): LibraryExercise[] {
  if (!needle) return list;
  return [...list].sort((a, b) => {
    const aStarts = normalizeSearch(a.name).startsWith(needle) ? 0 : 1;
    const bStarts = normalizeSearch(b.name).startsWith(needle) ? 0 : 1;
    return aStarts - bStarts || a.name.localeCompare(b.name, "fr");
  });
}

// ---------------------------------------------------------------------------
// Fiche exercice (§11) — les dates voyagent en ISO pour rester sérialisables.
// ---------------------------------------------------------------------------

export type HistorySet = {
  id: string;
  setNumber: number;
  type: string;
  weightKg: number | null;
  reps: number | null;
  rpe: number | null;
  durationSec: number | null;
  isPr: boolean;
};

export type HistoryEntry = {
  sessionId: string;
  date: string;
  sets: HistorySet[];
};

export type SeriesPoint = {
  /** Horodatage en ms : l'axe X reste à l'échelle du temps. */
  t: number;
  weight: number;
  reps: number;
  volume: number;
  oneRm: number;
};

export type ExerciseStatsDTO = {
  bestWeight: number;
  bestReps: number;
  bestVolumeSet: number;
  best1rm: number;
  totalSets: number;
  totalVolume: number;
  sessionCount: number;
  series: SeriesPoint[];
};

export type MuscleOption = {
  slug: string;
  name: string;
  color: string;
  bodyPart: string;
};
