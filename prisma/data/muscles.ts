/**
 * Groupes musculaires de référence.
 * `region` sert à la carte du corps (§15) : sur quelle face le muscle est dessiné.
 */
export type SeedMuscle = {
  slug: string;
  name: string;
  bodyPart: "haut" | "bas" | "tronc" | "cardio";
  region: "avant" | "arriere" | "les_deux";
  color: string;
  sortOrder: number;
};

export const MUSCLES: SeedMuscle[] = [
  { slug: "pectoraux", name: "Pectoraux", bodyPart: "haut", region: "avant", color: "#f87171", sortOrder: 1 },
  { slug: "pectoraux-superieurs", name: "Pectoraux supérieurs", bodyPart: "haut", region: "avant", color: "#fb7185", sortOrder: 2 },
  { slug: "pectoraux-inferieurs", name: "Pectoraux inférieurs", bodyPart: "haut", region: "avant", color: "#f43f5e", sortOrder: 3 },

  { slug: "grand-dorsal", name: "Grand dorsal", bodyPart: "haut", region: "arriere", color: "#60a5fa", sortOrder: 10 },
  { slug: "trapezes", name: "Trapèzes", bodyPart: "haut", region: "arriere", color: "#38bdf8", sortOrder: 11 },
  { slug: "rhomboides", name: "Rhomboïdes", bodyPart: "haut", region: "arriere", color: "#0ea5e9", sortOrder: 12 },
  { slug: "erecteurs-du-rachis", name: "Lombaires", bodyPart: "tronc", region: "arriere", color: "#818cf8", sortOrder: 13 },

  { slug: "deltoide-anterieur", name: "Deltoïde antérieur", bodyPart: "haut", region: "avant", color: "#fbbf24", sortOrder: 20 },
  { slug: "deltoide-lateral", name: "Deltoïde latéral", bodyPart: "haut", region: "les_deux", color: "#f59e0b", sortOrder: 21 },
  { slug: "deltoide-posterieur", name: "Deltoïde postérieur", bodyPart: "haut", region: "arriere", color: "#d97706", sortOrder: 22 },

  { slug: "biceps", name: "Biceps", bodyPart: "haut", region: "avant", color: "#a78bfa", sortOrder: 30 },
  { slug: "brachial", name: "Brachial", bodyPart: "haut", region: "avant", color: "#8b5cf6", sortOrder: 31 },
  { slug: "avant-bras", name: "Avant-bras", bodyPart: "haut", region: "les_deux", color: "#7c3aed", sortOrder: 32 },
  { slug: "triceps", name: "Triceps", bodyPart: "haut", region: "arriere", color: "#c084fc", sortOrder: 33 },

  { slug: "quadriceps", name: "Quadriceps", bodyPart: "bas", region: "avant", color: "#4ade80", sortOrder: 40 },
  { slug: "ischio-jambiers", name: "Ischio-jambiers", bodyPart: "bas", region: "arriere", color: "#22c55e", sortOrder: 41 },
  { slug: "fessiers", name: "Fessiers", bodyPart: "bas", region: "arriere", color: "#16a34a", sortOrder: 42 },
  { slug: "adducteurs", name: "Adducteurs", bodyPart: "bas", region: "avant", color: "#34d399", sortOrder: 43 },
  { slug: "abducteurs", name: "Abducteurs", bodyPart: "bas", region: "les_deux", color: "#2dd4bf", sortOrder: 44 },
  { slug: "mollets", name: "Mollets", bodyPart: "bas", region: "arriere", color: "#14b8a6", sortOrder: 45 },

  { slug: "grand-droit", name: "Abdominaux", bodyPart: "tronc", region: "avant", color: "#fcd34d", sortOrder: 50 },
  { slug: "obliques", name: "Obliques", bodyPart: "tronc", region: "avant", color: "#facc15", sortOrder: 51 },
  { slug: "transverse", name: "Transverse", bodyPart: "tronc", region: "avant", color: "#eab308", sortOrder: 52 },

  { slug: "cardio", name: "Système cardio-vasculaire", bodyPart: "cardio", region: "les_deux", color: "#f97316", sortOrder: 60 },
];
