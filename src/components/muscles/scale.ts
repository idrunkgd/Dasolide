/**
 * Échelle de couleurs de la carte des muscles (§15).
 *
 * Gris = muscle non sollicité, puis ambre → orange → rouge vif à mesure que
 * l'intensité de travail augmente sur la période choisie. Une légende
 * explicite accompagne toujours la carte : une couleur seule ne veut rien dire.
 */

export type MuscleStat = {
  slug: string;
  name: string;
  color: string;
  sets: number;
  volume: number;
  frequency: number;
  lastTrained: string | null;
};

export type MuscleExerciseUsage = {
  id: string;
  name: string;
  sets: number;
  volume: number;
  lastAt: string;
};

export type PeriodData = {
  stats: MuscleStat[];
  exercises: Record<string, MuscleExerciseUsage[]>;
};

export type MapPeriod = "7" | "30" | "90";

export const MAP_PERIODS: { value: MapPeriod; label: string; days: number }[] = [
  { value: "7", label: "7 jours", days: 7 },
  { value: "30", label: "30 jours", days: 30 },
  { value: "90", label: "90 jours", days: 90 },
];

export type MapMode = "volume" | "sets" | "frequency" | "recency";

export const MAP_MODES: { value: MapMode; label: string }[] = [
  { value: "volume", label: "Volume" },
  { value: "sets", label: "Séries" },
  { value: "frequency", label: "Fréquence" },
  { value: "recency", label: "Dernière fois" },
];

/**
 * Les 24 groupes musculaires ne sont pas tous dessinés séparément : certains
 * partagent la même forme sur la silhouette. Ici, muscle → forme dessinée.
 */
export const SHAPE_ALIASES: Record<string, string> = {
  "pectoraux-superieurs": "pectoraux",
  "pectoraux-inferieurs": "pectoraux",
  brachial: "biceps",
  transverse: "grand-droit",
  rhomboides: "grand-dorsal",
  abducteurs: "fessiers",
};

export const shapeSlug = (slug: string): string => SHAPE_ALIASES[slug] ?? slug;

/** Muscles sans représentation sur la silhouette (affichés dans le classement). */
export const UNDRAWN = new Set(["cardio"]);

export function daysSince(iso: string | null): number | null {
  if (!iso) return null;
  const ms = Date.now() - new Date(iso).getTime();
  return Math.max(0, Math.floor(ms / 86400000));
}

export function metricValue(stat: MuscleStat | undefined, mode: MapMode): number {
  if (!stat) return 0;
  switch (mode) {
    case "volume":
      return stat.volume;
    case "sets":
      return stat.sets;
    case "frequency":
      return stat.frequency;
    case "recency": {
      const d = daysSince(stat.lastTrained);
      return d == null ? 0 : d;
    }
  }
}

/**
 * Intensité 0 → 1.
 * Pour « dernière sollicitation », l'échelle est inversée : plus c'est récent,
 * plus c'est chaud (0 jour = 1, 14 jours et plus = 0).
 */
export function intensity(value: number, max: number, mode: MapMode): number {
  if (mode === "recency") {
    if (value <= 0 && max === 0) return 0;
    return Math.max(0, 1 - value / 14);
  }
  if (max <= 0 || value <= 0) return 0;
  return Math.min(1, value / max);
}

export const INACTIVE_FILL = "hsl(220 8% 26%)";

/** Gris → ambre → orange → rouge vif. */
export function intensityColor(t: number): string {
  if (t <= 0) return INACTIVE_FILL;
  const clamped = Math.min(1, Math.max(0.001, t));
  // Courbe quasi linéaire : le rouge vif reste réservé aux muscles réellement
  // les plus travaillés, sinon toute la silhouette vire au rouge.
  const eased = Math.max(0.06, Math.pow(clamped, 0.85));
  const hue = 48 - 48 * eased;
  const sat = 55 + 35 * eased;
  const light = 31 + 21 * eased;
  return `hsl(${hue.toFixed(0)} ${sat.toFixed(0)}% ${light.toFixed(0)}%)`;
}

export const LEGEND_STOPS: { t: number; label: string }[] = [
  { t: 0, label: "Aucun" },
  { t: 0.12, label: "Faible" },
  { t: 0.38, label: "Modéré" },
  { t: 0.7, label: "Élevé" },
  { t: 1, label: "Très élevé" },
];

export const RECENCY_LEGEND: { t: number; label: string }[] = [
  { t: 1, label: "Aujourd'hui" },
  { t: 0.72, label: "≤ 4 j" },
  { t: 0.43, label: "≤ 8 j" },
  { t: 0.14, label: "≤ 12 j" },
  { t: 0, label: "> 14 j" },
];

export function formatMetric(
  stat: MuscleStat | undefined,
  mode: MapMode,
  unit: "kg" | "lb"
): string {
  if (!stat) return mode === "recency" ? "Jamais" : "0";
  switch (mode) {
    case "volume": {
      const v = unit === "lb" ? stat.volume * 2.20462 : stat.volume;
      return `${Math.round(v).toLocaleString("fr-FR")} ${unit}`;
    }
    case "sets":
      return `${Math.round(stat.sets * 10) / 10} séries`;
    case "frequency":
      return `${stat.frequency} séance${stat.frequency > 1 ? "s" : ""}`;
    case "recency": {
      const d = daysSince(stat.lastTrained);
      if (d == null) return "Jamais";
      if (d === 0) return "Aujourd'hui";
      if (d === 1) return "Hier";
      return `Il y a ${d} j`;
    }
  }
}
