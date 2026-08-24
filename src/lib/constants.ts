/**
 * Constantes partagées client/serveur.
 *
 * Le schéma Prisma reste compatible SQLite ET PostgreSQL : aucune valeur
 * énumérée n'est déclarée au niveau de la base. Toutes les « enums » vivent
 * ici et sont validées par Zod (src/lib/validation.ts).
 */

export const MAIN_GOALS = {
  prise_de_masse: { label: "Prise de masse", surplus: 350, proteinPerKg: 2.0 },
  perte_de_poids: { label: "Perte de poids", surplus: -450, proteinPerKg: 2.2 },
  recomposition: { label: "Recomposition corporelle", surplus: -150, proteinPerKg: 2.2 },
  maintien: { label: "Maintien", surplus: 0, proteinPerKg: 1.8 },
  force: { label: "Force", surplus: 200, proteinPerKg: 2.0 },
  hypertrophie: { label: "Hypertrophie", surplus: 250, proteinPerKg: 2.0 },
  remise_en_forme: { label: "Remise en forme", surplus: -200, proteinPerKg: 1.8 },
} as const;
export type MainGoal = keyof typeof MAIN_GOALS;

export const LEVELS = {
  debutant: { label: "Débutant", hint: "Moins d'un an de pratique" },
  intermediaire: { label: "Intermédiaire", hint: "1 à 3 ans de pratique" },
  avance: { label: "Avancé", hint: "3 à 6 ans de pratique" },
  expert: { label: "Expert", hint: "Plus de 6 ans de pratique" },
} as const;
export type Level = keyof typeof LEVELS;

export const ACTIVITY_LEVELS = {
  sedentaire: { label: "Sédentaire", factor: 1.2, hint: "Travail assis, peu de marche" },
  leger: { label: "Légèrement actif", factor: 1.375, hint: "Marche quotidienne" },
  modere: { label: "Modérément actif", factor: 1.55, hint: "Debout ou actif en journée" },
  actif: { label: "Actif", factor: 1.725, hint: "Métier physique" },
  tres_actif: { label: "Très actif", factor: 1.9, hint: "Métier physique intense" },
} as const;
export type ActivityLevel = keyof typeof ACTIVITY_LEVELS;

export const EQUIPMENT_OPTIONS = {
  salle_complete: "Salle complète",
  halteres: "Haltères",
  barre: "Barre",
  banc: "Banc",
  poulies: "Poulies",
  machines: "Machines",
  poids_du_corps: "Poids du corps",
  home_gym: "Home gym",
} as const;

/** Équipement d'un exercice (filtre de la bibliothèque). */
export const EQUIPMENT = {
  barre: "Barre",
  halteres: "Haltères",
  machine: "Machine",
  poulie: "Poulie",
  smith: "Smith machine",
  kettlebell: "Kettlebell",
  elastique: "Élastique",
  poids_du_corps: "Poids du corps",
  cardio: "Cardio",
  autre: "Autre",
} as const;
export type Equipment = keyof typeof EQUIPMENT;

export const CATEGORIES = {
  poitrine: "Poitrine",
  dos: "Dos",
  epaules: "Épaules",
  biceps: "Biceps",
  triceps: "Triceps",
  quadriceps: "Quadriceps",
  ischios: "Ischio-jambiers",
  fessiers: "Fessiers",
  mollets: "Mollets",
  abdominaux: "Abdominaux",
  lombaires: "Lombaires",
  avant_bras: "Avant-bras",
  cardio: "Cardio",
  mobilite: "Mobilité",
} as const;
export type Category = keyof typeof CATEGORIES;

export const MOVEMENT_TYPES = {
  polyarticulaire: "Polyarticulaire",
  isolation: "Isolation",
  cardio: "Cardio",
  mobilite: "Mobilité",
} as const;

export const DIFFICULTIES = {
  debutant: "Débutant",
  intermediaire: "Intermédiaire",
  avance: "Avancé",
} as const;

/** Ce que l'on encode pour un exercice donné. */
export const TRACKING_TYPES = {
  weight_reps: "Poids × répétitions",
  reps_only: "Répétitions seules",
  duration: "Durée",
  distance_duration: "Distance et durée",
} as const;
export type TrackingType = keyof typeof TRACKING_TYPES;

/** Types de séries (§51). */
export const SET_TYPES = {
  W: { label: "Échauffement", short: "W", color: "amber", countsInStats: false },
  N: { label: "Normale", short: "N", color: "accent", countsInStats: true },
  D: { label: "Dropset", short: "D", color: "violet", countsInStats: true },
  F: { label: "Jusqu'à l'échec", short: "F", color: "rose", countsInStats: true },
  A: { label: "Assistée", short: "A", color: "cyan", countsInStats: true },
} as const;
export type SetType = keyof typeof SET_TYPES;

export const MEAL_TYPES = {
  petit_dejeuner: { label: "Petit déjeuner", icon: "sunrise", order: 1 },
  dejeuner: { label: "Déjeuner", icon: "sun", order: 2 },
  collation: { label: "Collation", icon: "apple", order: 3 },
  diner: { label: "Dîner", icon: "moon", order: 4 },
  autre: { label: "Autre", icon: "utensils", order: 5 },
} as const;
export type MealType = keyof typeof MEAL_TYPES;

export const FOOD_CATEGORIES = {
  proteines: "Protéines",
  feculents: "Féculents",
  legumes: "Légumes",
  fruits: "Fruits",
  produits_laitiers: "Produits laitiers",
  matieres_grasses: "Matières grasses",
  boissons: "Boissons",
  complements: "Compléments",
  plats: "Plats préparés",
  snacks: "Snacks",
  autre: "Autre",
} as const;

export const PR_TYPES = {
  max_weight: "Charge maximale",
  max_reps: "Répétitions maximales",
  max_volume_set: "Volume sur une série",
  max_volume_session: "Volume sur une séance",
  estimated_1rm: "1RM estimé",
} as const;
export type PrType = keyof typeof PR_TYPES;

export const REMINDER_TYPES = {
  entrainement: { label: "Entraînement", defaultTime: "18:00", defaultMessage: "C'est l'heure de ta séance 💪" },
  poids: { label: "Poids", defaultTime: "08:00", defaultMessage: "Pense à encoder ton poids." },
  repas: { label: "Alimentation", defaultTime: "21:00", defaultMessage: "Tu n'as pas encore complété ton alimentation aujourd'hui." },
  hydratation: { label: "Hydratation", defaultTime: "14:00", defaultMessage: "Pense à boire de l'eau." },
  complements: { label: "Compléments", defaultTime: "09:00", defaultMessage: "Compléments du matin." },
  photos: { label: "Photos de progression", defaultTime: "09:30", defaultMessage: "Photo de progression du mois." },
  mensurations: { label: "Mensurations", defaultTime: "09:30", defaultMessage: "Pense à prendre tes mensurations." },
} as const;
export type ReminderType = keyof typeof REMINDER_TYPES;

export const GOAL_TYPES = {
  poids: "Poids corporel",
  force: "Force sur un exercice",
  mensuration: "Mensuration",
  nutrition: "Nutrition",
  habitude: "Habitude",
} as const;

export const MEASUREMENT_FIELDS = [
  { key: "neckCm", label: "Cou" },
  { key: "shouldersCm", label: "Épaules" },
  { key: "chestCm", label: "Poitrine" },
  { key: "waistCm", label: "Tour de taille" },
  { key: "hipsCm", label: "Hanches" },
  { key: "armLeftCm", label: "Bras gauche" },
  { key: "armRightCm", label: "Bras droit" },
  { key: "thighLeftCm", label: "Cuisse gauche" },
  { key: "thighRightCm", label: "Cuisse droite" },
  { key: "calfLeftCm", label: "Mollet gauche" },
  { key: "calfRightCm", label: "Mollet droit" },
] as const;
export type MeasurementKey = (typeof MEASUREMENT_FIELDS)[number]["key"];

export const PHOTO_POSES = {
  face: "Face",
  profil: "Profil",
  dos: "Dos",
} as const;

export const PROGRAM_TYPES = {
  ppl: "Push / Pull / Legs",
  upper_lower: "Upper / Lower",
  full_body: "Full Body",
  bro_split: "Bro Split",
  custom: "Personnalisé",
} as const;

export const ACCENT_COLORS = {
  lime: { label: "Lime", hue: "82 84% 55%" },
  orange: { label: "Orange", hue: "24 95% 55%" },
  violet: { label: "Violet", hue: "265 85% 65%" },
  cyan: { label: "Cyan", hue: "187 92% 48%" },
  rose: { label: "Rose", hue: "340 82% 60%" },
  blue: { label: "Bleu", hue: "217 91% 60%" },
} as const;
export type AccentColor = keyof typeof ACCENT_COLORS;

export const DAY_LABELS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
export const DAY_SHORT = ["L", "M", "M", "J", "V", "S", "D"];

export const PERIOD_FILTERS = {
  "7d": { label: "7 j", days: 7 },
  "30d": { label: "30 j", days: 30 },
  "3m": { label: "3 mois", days: 90 },
  "6m": { label: "6 mois", days: 180 },
  "1y": { label: "1 an", days: 365 },
  all: { label: "Tout", days: 100000 },
} as const;
export type PeriodKey = keyof typeof PERIOD_FILTERS;
