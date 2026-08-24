import { z } from "zod";
import {
  ACTIVITY_LEVELS,
  CATEGORIES,
  DIFFICULTIES,
  EQUIPMENT,
  FOOD_CATEGORIES,
  GOAL_TYPES,
  LEVELS,
  MAIN_GOALS,
  MEAL_TYPES,
  MOVEMENT_TYPES,
  PHOTO_POSES,
  PROGRAM_TYPES,
  REMINDER_TYPES,
  SET_TYPES,
  TRACKING_TYPES,
  ACCENT_COLORS,
} from "./constants";

const keys = <T extends Record<string, unknown>>(o: T) => Object.keys(o) as [string, ...string[]];

// ---------------------------------------------------------------------------
// Authentification
// ---------------------------------------------------------------------------

export const emailSchema = z.string().trim().toLowerCase().email("Adresse email invalide");
export const passwordSchema = z
  .string()
  .min(8, "8 caractères minimum")
  .max(200, "Mot de passe trop long");

export const registerSchema = z
  .object({
    name: z.string().trim().min(1, "Prénom requis").max(60),
    email: emailSchema,
    password: passwordSchema,
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirm"],
  });

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Mot de passe requis"),
});

// ---------------------------------------------------------------------------
// Onboarding & profil
// ---------------------------------------------------------------------------

export const onboardingSchema = z.object({
  firstName: z.string().trim().min(1, "Prénom requis").max(60),
  sex: z.enum(["homme", "femme", "autre"]).optional().nullable(),
  birthDate: z.string().optional().nullable(),
  heightCm: z.coerce.number().min(100).max(250),
  currentWeightKg: z.coerce.number().min(25).max(400),
  targetWeightKg: z.coerce.number().min(25).max(400).optional().nullable(),
  level: z.enum(keys(LEVELS)),
  mainGoal: z.enum(keys(MAIN_GOALS)),
  activityLevel: z.enum(keys(ACTIVITY_LEVELS)),
  sessionsPerWeek: z.coerce.number().int().min(1).max(14),
  sessionMinutes: z.coerce.number().int().min(15).max(240),
  equipment: z.array(z.string()).min(1, "Sélectionne au moins un équipement"),
  availableDays: z.array(z.coerce.number().int().min(1).max(7)).min(1, "Sélectionne au moins un jour"),
  createDemoProgram: z.boolean().default(true),
});
export type OnboardingInput = z.infer<typeof onboardingSchema>;

export const profileSchema = onboardingSchema.partial().extend({
  firstName: z.string().trim().min(1).max(60),
});

export const settingsSchema = z.object({
  weightUnit: z.enum(["kg", "lb"]).optional(),
  lengthUnit: z.enum(["cm", "in"]).optional(),
  theme: z.enum(["dark", "light", "system"]).optional(),
  accentColor: z.enum(keys(ACCENT_COLORS)).optional(),
  defaultRestSeconds: z.coerce.number().int().min(0).max(900).optional(),
  autoStartRestTimer: z.boolean().optional(),
  restTimerVibrate: z.boolean().optional(),
  restTimerSound: z.boolean().optional(),
  keepScreenAwake: z.boolean().optional(),
  showRpe: z.boolean().optional(),
  showRir: z.boolean().optional(),
  prefillLastSession: z.boolean().optional(),
  autoProgressionEnabled: z.boolean().optional(),
  upperIncrementKg: z.coerce.number().min(0.5).max(20).optional(),
  lowerIncrementKg: z.coerce.number().min(0.5).max(20).optional(),
  notificationsEnabled: z.boolean().optional(),
  consistencyEnabled: z.boolean().optional(),
});

// ---------------------------------------------------------------------------
// Exercices
// ---------------------------------------------------------------------------

export const exerciseSchema = z.object({
  name: z.string().trim().min(2, "Nom requis").max(80),
  description: z.string().max(2000).optional().nullable(),
  instructions: z.string().max(4000).optional().nullable(),
  category: z.enum(keys(CATEGORIES)),
  primaryMuscleSlug: z.string().min(1),
  secondaryMuscleSlugs: z.array(z.string()).default([]),
  equipment: z.enum(keys(EQUIPMENT)),
  movementType: z.enum(keys(MOVEMENT_TYPES)).default("polyarticulaire"),
  difficulty: z.enum(keys(DIFFICULTIES)).default("intermediaire"),
  trackingType: z.enum(keys(TRACKING_TYPES)).default("weight_reps"),
  isUnilateral: z.boolean().default(false),
  videoUrl: z.string().url("URL invalide").optional().or(z.literal("")).nullable(),
});
export type ExerciseInput = z.infer<typeof exerciseSchema>;

export const exerciseNoteSchema = z.object({
  exerciseId: z.string().min(1),
  content: z.string().max(1000),
});

// ---------------------------------------------------------------------------
// Programmes
// ---------------------------------------------------------------------------

export const templateExerciseSchema = z.object({
  id: z.string().optional(),
  exerciseId: z.string().min(1),
  sortOrder: z.number().int().default(0),
  sets: z.coerce.number().int().min(1).max(20).default(3),
  targetRepsMin: z.coerce.number().int().min(1).max(100).nullable().default(8),
  targetRepsMax: z.coerce.number().int().min(1).max(100).nullable().default(12),
  targetWeight: z.coerce.number().min(0).max(1000).nullable().optional(),
  targetRpe: z.coerce.number().min(1).max(10).nullable().optional(),
  targetRir: z.coerce.number().int().min(0).max(10).nullable().optional(),
  restSeconds: z.coerce.number().int().min(0).max(900).default(120),
  tempo: z.string().max(20).nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
  supersetGroup: z.string().max(4).nullable().optional(),
});

export const templateSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, "Nom requis").max(60),
  notes: z.string().max(1000).nullable().optional(),
  dayOfWeek: z.coerce.number().int().min(1).max(7).nullable().optional(),
  sortOrder: z.number().int().default(0),
  exercises: z.array(templateExerciseSchema).default([]),
});

export const programSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, "Nom requis").max(80),
  description: z.string().max(1000).nullable().optional(),
  type: z.enum(keys(PROGRAM_TYPES)).default("custom"),
  color: z.string().max(20).default("#a3e635"),
  templates: z.array(templateSchema).default([]),
});
export type ProgramInput = z.infer<typeof programSchema>;

// ---------------------------------------------------------------------------
// Séance
// ---------------------------------------------------------------------------

export const setInputSchema = z.object({
  id: z.string().optional(),
  setNumber: z.number().int().min(1),
  type: z.enum(keys(SET_TYPES)).default("N"),
  weightKg: z.number().min(0).max(1000).nullable().optional(),
  reps: z.number().int().min(0).max(1000).nullable().optional(),
  rpe: z.number().min(1).max(10).nullable().optional(),
  rir: z.number().int().min(0).max(10).nullable().optional(),
  durationSec: z.number().int().min(0).max(86400).nullable().optional(),
  distanceM: z.number().min(0).max(1000000).nullable().optional(),
  avgHr: z.number().int().min(20).max(250).nullable().optional(),
  calories: z.number().int().min(0).max(10000).nullable().optional(),
  completed: z.boolean().default(false),
  notes: z.string().max(300).nullable().optional(),
});

export const sessionSyncSchema = z.object({
  sessionId: z.string().min(1),
  durationSeconds: z.number().int().min(0).max(86400 * 2),
  exercises: z.array(
    z.object({
      id: z.string().min(1),
      exerciseId: z.string().min(1),
      sortOrder: z.number().int(),
      notes: z.string().max(500).nullable().optional(),
      restSeconds: z.number().int().min(0).max(900),
      supersetGroup: z.string().max(4).nullable().optional(),
      sets: z.array(setInputSchema),
    })
  ),
});
export type SessionSyncInput = z.infer<typeof sessionSyncSchema>;

export const finishSessionSchema = z.object({
  sessionId: z.string().min(1),
  durationSeconds: z.number().int().min(0).max(86400 * 2),
  notes: z.string().max(2000).nullable().optional(),
  feltEnergy: z.number().int().min(1).max(5).nullable().optional(),
  feltMotivation: z.number().int().min(1).max(5).nullable().optional(),
  sleepHours: z.number().min(0).max(24).nullable().optional(),
  stressLevel: z.number().int().min(1).max(5).nullable().optional(),
  soreness: z.number().int().min(1).max(5).nullable().optional(),
  feedback: z.string().max(2000).nullable().optional(),
});

// ---------------------------------------------------------------------------
// Composition corporelle
// ---------------------------------------------------------------------------

export const bodyWeightSchema = z.object({
  date: z.string().min(1),
  weightKg: z.coerce.number().min(25).max(400),
  bodyFatPct: z.coerce.number().min(1).max(70).nullable().optional(),
  note: z.string().max(300).nullable().optional(),
});

export const measurementSchema = z.object({
  date: z.string().min(1),
  neckCm: z.coerce.number().min(10).max(100).nullable().optional(),
  shouldersCm: z.coerce.number().min(50).max(250).nullable().optional(),
  chestCm: z.coerce.number().min(50).max(250).nullable().optional(),
  waistCm: z.coerce.number().min(40).max(250).nullable().optional(),
  hipsCm: z.coerce.number().min(40).max(250).nullable().optional(),
  armLeftCm: z.coerce.number().min(15).max(80).nullable().optional(),
  armRightCm: z.coerce.number().min(15).max(80).nullable().optional(),
  thighLeftCm: z.coerce.number().min(25).max(120).nullable().optional(),
  thighRightCm: z.coerce.number().min(25).max(120).nullable().optional(),
  calfLeftCm: z.coerce.number().min(15).max(80).nullable().optional(),
  calfRightCm: z.coerce.number().min(15).max(80).nullable().optional(),
  bodyFatPct: z.coerce.number().min(1).max(70).nullable().optional(),
  note: z.string().max(300).nullable().optional(),
});

export const photoSchema = z.object({
  date: z.string().min(1),
  pose: z.enum(keys(PHOTO_POSES)),
  dataUrl: z.string().startsWith("data:image/", "Image invalide"),
  weightKg: z.coerce.number().min(25).max(400).nullable().optional(),
  comment: z.string().max(300).nullable().optional(),
});

// ---------------------------------------------------------------------------
// Nutrition
// ---------------------------------------------------------------------------

export const foodSchema = z.object({
  name: z.string().trim().min(2, "Nom requis").max(80),
  brand: z.string().max(60).nullable().optional(),
  category: z.enum(keys(FOOD_CATEGORIES)).default("autre"),
  servingName: z.string().max(40).nullable().optional(),
  servingGrams: z.coerce.number().min(1).max(5000).nullable().optional(),
  kcal100: z.coerce.number().min(0).max(1000),
  protein100: z.coerce.number().min(0).max(100),
  carbs100: z.coerce.number().min(0).max(100),
  fat100: z.coerce.number().min(0).max(100),
  fiber100: z.coerce.number().min(0).max(100).nullable().optional(),
  sugar100: z.coerce.number().min(0).max(100).nullable().optional(),
  salt100: z.coerce.number().min(0).max(100).nullable().optional(),
});
export type FoodInput = z.infer<typeof foodSchema>;

export const diaryEntrySchema = z.object({
  date: z.string().min(1),
  mealType: z.enum(keys(MEAL_TYPES)),
  foodId: z.string().nullable().optional(),
  recipeId: z.string().nullable().optional(),
  quantityGrams: z.coerce.number().min(0.1).max(10000).optional(),
  servings: z.coerce.number().min(0.1).max(50).optional(),
});

export const savedMealSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1).max(80),
  description: z.string().max(300).nullable().optional(),
  defaultMealType: z.enum(keys(MEAL_TYPES)).default("petit_dejeuner"),
  items: z
    .array(z.object({ foodId: z.string().min(1), quantityGrams: z.coerce.number().min(0.1).max(10000) }))
    .min(1, "Ajoute au moins un aliment"),
});

export const recipeSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1).max(80),
  description: z.string().max(500).nullable().optional(),
  instructions: z.string().max(5000).nullable().optional(),
  servings: z.coerce.number().int().min(1).max(50).default(1),
  ingredients: z
    .array(z.object({ foodId: z.string().min(1), quantityGrams: z.coerce.number().min(0.1).max(10000) }))
    .min(1, "Ajoute au moins un ingrédient"),
});

export const nutritionGoalSchema = z.object({
  kcal: z.coerce.number().min(800).max(8000),
  protein: z.coerce.number().min(0).max(600),
  carbs: z.coerce.number().min(0).max(1200),
  fat: z.coerce.number().min(0).max(400),
  fiber: z.coerce.number().min(0).max(150).nullable().optional(),
  waterMl: z.coerce.number().min(0).max(10000).nullable().optional(),
  source: z.enum(["manuel", "mifflin_st_jeor"]).default("manuel"),
});

// ---------------------------------------------------------------------------
// Objectifs & rappels
// ---------------------------------------------------------------------------

export const goalSchema = z.object({
  id: z.string().optional(),
  type: z.enum(keys(GOAL_TYPES)),
  title: z.string().trim().min(1).max(100),
  exerciseId: z.string().nullable().optional(),
  measureKey: z.string().nullable().optional(),
  startValue: z.coerce.number(),
  targetValue: z.coerce.number(),
  unit: z.string().max(10).default("kg"),
  targetDate: z.string().nullable().optional(),
});

export const reminderSchema = z.object({
  id: z.string().optional(),
  type: z.enum(keys(REMINDER_TYPES)),
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Format attendu HH:mm"),
  days: z.array(z.coerce.number().int().min(1).max(7)).min(1, "Sélectionne au moins un jour"),
  message: z.string().max(200).nullable().optional(),
  enabled: z.boolean().default(true),
});

// ---------------------------------------------------------------------------
// Helpers de retour pour les server actions
// ---------------------------------------------------------------------------

export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

export function zodError(error: z.ZodError): ActionResult<never> {
  const flat = z.flattenError(error);
  const fieldErrors = flat.fieldErrors as Record<string, string[]>;
  const first: string | undefined = Object.values(fieldErrors).flat()[0] ?? flat.formErrors[0];
  return {
    ok: false,
    error: first ?? "Données invalides",
    fieldErrors,
  };
}
