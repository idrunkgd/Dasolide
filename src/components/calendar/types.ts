/** Types partagés entre la page /calendrier (serveur) et ses vues (client). */

export type PlannedItem = {
  id: string;
  status: string;
  templateId: string | null;
  templateName: string | null;
  programName: string | null;
  color: string;
  exerciseCount: number;
  setCount: number;
  sessionId: string | null;
};

export type DoneSession = {
  id: string;
  name: string;
  volumeKg: number;
  sets: number;
  durationSeconds: number;
};

export type CalendarDay = {
  /** "YYYY-MM-DD" */
  key: string;
  dayOfMonth: number;
  /** Appartient au mois affiché (les cases grisées du début/fin de grille sinon). */
  inScope: boolean;
  isToday: boolean;
  isPast: boolean;
  planned: PlannedItem | null;
  session: DoneSession | null;
};

export type TemplateOption = {
  id: string;
  name: string;
  programName: string;
};

export type CalendarSummary = {
  done: number;
  planned: number;
  volumeKg: number;
  sets: number;
  minutes: number;
};

export type DayState = "completed" | "missed" | "skipped" | "rest" | "planned" | "empty";

/** Un seul endroit décide de la couleur d'un jour. */
export function dayState(day: CalendarDay): DayState {
  if (day.planned?.status === "completed" || day.session) return "completed";
  if (day.planned?.status === "skipped") return "skipped";
  if (day.planned?.status === "rest") return "rest";
  if (day.planned?.templateId) return day.isPast ? "missed" : "planned";
  return "empty";
}

export const STATE_LABEL: Record<DayState, string> = {
  completed: "Réalisée",
  missed: "Manquée",
  skipped: "Ignorée",
  rest: "Repos",
  planned: "Prévue",
  empty: "Rien de prévu",
};

/** Classes de la pastille affichée dans une case de calendrier. */
export const STATE_CHIP: Record<DayState, string> = {
  completed: "bg-success/20 text-success",
  missed: "bg-warning/20 text-warning",
  skipped: "bg-warning/15 text-warning/80",
  rest: "bg-surface-3 text-subtle",
  planned: "bg-accent-soft text-accent",
  empty: "bg-transparent text-subtle",
};

export const STATE_DOT: Record<DayState, string> = {
  completed: "bg-success",
  missed: "bg-warning",
  skipped: "bg-warning/60",
  rest: "bg-surface-3",
  planned: "bg-accent",
  empty: "bg-transparent",
};
