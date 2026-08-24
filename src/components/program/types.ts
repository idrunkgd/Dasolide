/**
 * Modèle de travail de l'éditeur de programme.
 *
 * L'éditeur manipule un état local complet (journées + exercices) et l'envoie
 * d'un bloc à `saveProgramAction`. Chaque élément porte une `key` stable côté
 * client : elle survit aux réordonnancements, contrairement à l'index, et
 * existe avant même que la ligne ait un identifiant en base.
 */

export type EditorExercise = {
  key: string;
  exerciseId: string;
  name: string;
  primaryMuscle: string;
  equipment: string;
  sets: number;
  targetRepsMin: number | null;
  targetRepsMax: number | null;
  targetWeight: number | null;
  targetRpe: number | null;
  targetRir: number | null;
  restSeconds: number;
  tempo: string;
  notes: string;
  supersetGroup: string | null;
};

export type EditorTemplate = {
  key: string;
  id?: string;
  name: string;
  notes: string;
  dayOfWeek: number | null;
  exercises: EditorExercise[];
};

export type EditorProgram = {
  id?: string;
  name: string;
  description: string;
  type: string;
  color: string;
  templates: EditorTemplate[];
};

/** Identifiant local unique — `crypto.randomUUID` n'existe pas partout. */
let counter = 0;
export function makeKey(prefix = "k"): string {
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}-${counter}`;
}

export const SUPERSET_LETTERS = ["A", "B", "C", "D"] as const;

export const REST_PRESETS = [45, 60, 90, 120, 150, 180, 210, 240];

export function emptyExercise(
  exercise: { id: string; name: string; primaryMuscle: string; equipment: string },
  defaults?: Partial<EditorExercise>
): EditorExercise {
  return {
    key: makeKey("ex"),
    exerciseId: exercise.id,
    name: exercise.name,
    primaryMuscle: exercise.primaryMuscle,
    equipment: exercise.equipment,
    sets: 3,
    targetRepsMin: 8,
    targetRepsMax: 12,
    targetWeight: null,
    targetRpe: null,
    targetRir: null,
    restSeconds: 120,
    tempo: "",
    notes: "",
    supersetGroup: null,
    ...defaults,
  };
}

export function emptyTemplate(index: number): EditorTemplate {
  return {
    key: makeKey("day"),
    name: `Journée ${index + 1}`,
    notes: "",
    dayOfWeek: null,
    exercises: [],
  };
}

export function emptyProgram(): EditorProgram {
  return {
    name: "",
    description: "",
    type: "custom",
    color: "#a3e635",
    templates: [emptyTemplate(0)],
  };
}

// ---------------------------------------------------------------------------
// Calculs affichés en direct
// ---------------------------------------------------------------------------

/**
 * Durée estimée d'une journée : chaque série coûte son temps de repos plus
 * ~45 s d'exécution. Un exercice en superset enchaîne sans repos complet, on
 * ne compte donc que la moitié de son repos.
 */
export function estimateSeconds(exercises: EditorExercise[]): number {
  return exercises.reduce((total, e) => {
    const rest = e.supersetGroup ? e.restSeconds / 2 : e.restSeconds;
    return total + e.sets * (rest + 45);
  }, 0);
}

export function totalSets(exercises: EditorExercise[]): number {
  return exercises.reduce((total, e) => total + e.sets, 0);
}

export function repRangeLabel(e: Pick<EditorExercise, "targetRepsMin" | "targetRepsMax">): string {
  if (e.targetRepsMin == null && e.targetRepsMax == null) return "—";
  if (e.targetRepsMin == null) return `${e.targetRepsMax}`;
  if (e.targetRepsMax == null || e.targetRepsMax === e.targetRepsMin) return `${e.targetRepsMin}`;
  return `${e.targetRepsMin}-${e.targetRepsMax}`;
}

/** Payload envoyé à `saveProgramAction` (voir programSchema). */
export function toProgramPayload(program: EditorProgram) {
  return {
    id: program.id,
    name: program.name.trim(),
    description: program.description.trim() || null,
    type: program.type,
    color: program.color,
    templates: program.templates.map((t, ti) => ({
      id: t.id,
      name: t.name.trim(),
      notes: t.notes.trim() || null,
      dayOfWeek: t.dayOfWeek,
      sortOrder: ti,
      exercises: t.exercises.map((e, ei) => ({
        exerciseId: e.exerciseId,
        sortOrder: ei,
        sets: e.sets,
        targetRepsMin: e.targetRepsMin,
        targetRepsMax: e.targetRepsMax,
        targetWeight: e.targetWeight,
        targetRpe: e.targetRpe,
        targetRir: e.targetRir,
        restSeconds: e.restSeconds,
        tempo: e.tempo.trim() || null,
        notes: e.notes.trim() || null,
        supersetGroup: e.supersetGroup,
      })),
    })),
  };
}

/** Empreinte servant à détecter les modifications non enregistrées. */
export function fingerprint(program: EditorProgram): string {
  return JSON.stringify(toProgramPayload(program));
}
