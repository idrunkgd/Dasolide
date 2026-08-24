import "server-only";
import { prisma } from "@/lib/db";
import { PROGRAM_TYPES } from "@/lib/constants";

/**
 * Programmes prêts à l'emploi proposés à la fin de l'onboarding.
 * Chaque exercice est référencé par son `slug` (voir prisma/seed.ts) : si un
 * exercice venait à manquer, il est simplement ignoré plutôt que de faire
 * échouer la création du programme.
 */

type TemplateSpec = {
  name: string;
  dayOfWeek?: number;
  exercises: {
    slug: string;
    sets: number;
    repsMin: number;
    repsMax: number;
    rest: number;
    rpe?: number;
    superset?: string;
    notes?: string;
  }[];
};

export type StarterProgramSpec = {
  key: string;
  name: string;
  type: keyof typeof PROGRAM_TYPES;
  description: string;
  sessionsPerWeek: number;
  templates: TemplateSpec[];
};

const PUSH: TemplateSpec = {
  name: "Push",
  dayOfWeek: 1,
  exercises: [
    { slug: "developpe-couche-barre", sets: 4, repsMin: 6, repsMax: 8, rest: 180, rpe: 8 },
    { slug: "developpe-incline-halteres", sets: 3, repsMin: 8, repsMax: 12, rest: 150 },
    { slug: "developpe-militaire-halteres", sets: 3, repsMin: 8, repsMax: 12, rest: 120 },
    { slug: "elevations-laterales", sets: 4, repsMin: 12, repsMax: 15, rest: 60, superset: "A" },
    { slug: "extension-triceps-poulie", sets: 3, repsMin: 10, repsMax: 15, rest: 60, superset: "A" },
    { slug: "dips", sets: 3, repsMin: 8, repsMax: 12, rest: 120 },
  ],
};

const PULL: TemplateSpec = {
  name: "Pull",
  dayOfWeek: 2,
  exercises: [
    { slug: "tractions-pronation", sets: 4, repsMin: 5, repsMax: 10, rest: 180 },
    { slug: "tirage-vertical", sets: 3, repsMin: 8, repsMax: 12, rest: 120 },
    { slug: "rowing-barre", sets: 4, repsMin: 8, repsMax: 10, rest: 150 },
    { slug: "face-pull", sets: 3, repsMin: 15, repsMax: 20, rest: 60 },
    { slug: "curl-barre", sets: 3, repsMin: 8, repsMax: 12, rest: 90, superset: "A" },
    { slug: "curl-marteau", sets: 3, repsMin: 10, repsMax: 12, rest: 90, superset: "A" },
  ],
};

const LEGS: TemplateSpec = {
  name: "Legs",
  dayOfWeek: 4,
  exercises: [
    { slug: "squat-barre", sets: 4, repsMin: 5, repsMax: 8, rest: 210, rpe: 8 },
    { slug: "presse-a-cuisses", sets: 3, repsMin: 10, repsMax: 15, rest: 150 },
    { slug: "leg-curl-allonge", sets: 3, repsMin: 10, repsMax: 15, rest: 90 },
    { slug: "leg-extension", sets: 3, repsMin: 12, repsMax: 15, rest: 90 },
    { slug: "mollets-debout", sets: 4, repsMin: 12, repsMax: 20, rest: 60 },
    { slug: "crunch-poulie", sets: 3, repsMin: 12, repsMax: 20, rest: 60 },
  ],
};

const UPPER: TemplateSpec = {
  name: "Upper",
  dayOfWeek: 5,
  exercises: [
    { slug: "developpe-couche-barre", sets: 4, repsMin: 6, repsMax: 10, rest: 180 },
    { slug: "rowing-barre", sets: 4, repsMin: 8, repsMax: 10, rest: 150 },
    { slug: "developpe-militaire-halteres", sets: 3, repsMin: 8, repsMax: 12, rest: 120 },
    { slug: "tirage-vertical", sets: 3, repsMin: 8, repsMax: 12, rest: 120 },
    { slug: "elevations-laterales", sets: 3, repsMin: 12, repsMax: 15, rest: 60 },
    { slug: "curl-halteres", sets: 3, repsMin: 10, repsMax: 12, rest: 75, superset: "A" },
    { slug: "extension-triceps-poulie", sets: 3, repsMin: 10, repsMax: 15, rest: 75, superset: "A" },
  ],
};

const LOWER: TemplateSpec = {
  name: "Lower",
  dayOfWeek: 6,
  exercises: [
    { slug: "squat-barre", sets: 4, repsMin: 5, repsMax: 8, rest: 210 },
    { slug: "souleve-de-terre-roumain", sets: 3, repsMin: 8, repsMax: 10, rest: 180 },
    { slug: "fentes-halteres", sets: 3, repsMin: 10, repsMax: 12, rest: 120 },
    { slug: "leg-curl-allonge", sets: 3, repsMin: 10, repsMax: 15, rest: 90 },
    { slug: "mollets-debout", sets: 4, repsMin: 12, repsMax: 20, rest: 60 },
    { slug: "gainage-planche", sets: 3, repsMin: 30, repsMax: 60, rest: 60, notes: "Durée en secondes" },
  ],
};

const FULL_A: TemplateSpec = {
  name: "Full Body A",
  dayOfWeek: 1,
  exercises: [
    { slug: "squat-barre", sets: 3, repsMin: 6, repsMax: 8, rest: 180 },
    { slug: "developpe-couche-barre", sets: 3, repsMin: 6, repsMax: 10, rest: 150 },
    { slug: "rowing-barre", sets: 3, repsMin: 8, repsMax: 10, rest: 150 },
    { slug: "developpe-militaire-halteres", sets: 3, repsMin: 8, repsMax: 12, rest: 120 },
    { slug: "crunch-poulie", sets: 3, repsMin: 12, repsMax: 20, rest: 60 },
  ],
};

const FULL_B: TemplateSpec = {
  name: "Full Body B",
  dayOfWeek: 4,
  exercises: [
    { slug: "souleve-de-terre", sets: 3, repsMin: 4, repsMax: 6, rest: 210 },
    { slug: "developpe-incline-halteres", sets: 3, repsMin: 8, repsMax: 12, rest: 150 },
    { slug: "tractions-pronation", sets: 3, repsMin: 5, repsMax: 10, rest: 150 },
    { slug: "presse-a-cuisses", sets: 3, repsMin: 10, repsMax: 15, rest: 120 },
    { slug: "elevations-laterales", sets: 3, repsMin: 12, repsMax: 15, rest: 60 },
  ],
};

export const STARTER_PROGRAMS: StarterProgramSpec[] = [
  {
    key: "ppl4",
    name: "Push / Pull / Legs / Upper",
    type: "ppl",
    description:
      "Le programme de démonstration : 4 séances, chaque muscle sollicité deux fois par semaine.",
    sessionsPerWeek: 4,
    templates: [PUSH, PULL, LEGS, UPPER],
  },
  {
    key: "ppl3",
    name: "Push / Pull / Legs",
    type: "ppl",
    description: "Le grand classique en 3 séances hebdomadaires, extensible à 6.",
    sessionsPerWeek: 3,
    templates: [PUSH, PULL, { ...LEGS, dayOfWeek: 5 }],
  },
  {
    key: "upper_lower",
    name: "Upper / Lower",
    type: "upper_lower",
    description: "4 séances alternant haut et bas du corps. Excellent rapport temps / résultats.",
    sessionsPerWeek: 4,
    templates: [
      { ...UPPER, dayOfWeek: 1 },
      { ...LOWER, dayOfWeek: 2 },
      { ...UPPER, name: "Upper B", dayOfWeek: 4 },
      { ...LOWER, name: "Lower B", dayOfWeek: 5 },
    ],
  },
  {
    key: "full_body",
    name: "Full Body",
    type: "full_body",
    description: "2 à 3 séances complètes par semaine. Idéal pour reprendre ou manquer de temps.",
    sessionsPerWeek: 3,
    templates: [FULL_A, FULL_B],
  },
];

/** Crée un programme à partir d'une des recettes ci-dessus. */
export async function createStarterProgram(userId: string, key: string, makeActive = true) {
  const spec = STARTER_PROGRAMS.find((p) => p.key === key) ?? STARTER_PROGRAMS[0];

  const slugs = [...new Set(spec.templates.flatMap((t) => t.exercises.map((e) => e.slug)))];
  const exercises = await prisma.exercise.findMany({
    where: { slug: { in: slugs } },
    select: { id: true, slug: true },
  });
  const bySlug = new Map(exercises.map((e) => [e.slug, e.id]));

  if (makeActive) {
    await prisma.workoutProgram.updateMany({ where: { userId }, data: { isActive: false } });
  }

  const program = await prisma.workoutProgram.create({
    data: {
      userId,
      name: spec.name,
      description: spec.description,
      type: spec.type,
      isActive: makeActive,
      cycleLength: 7,
      templates: {
        create: spec.templates.map((t, ti) => ({
          name: t.name,
          sortOrder: ti,
          dayOfWeek: t.dayOfWeek ?? null,
          exercises: {
            create: t.exercises
              .filter((e) => bySlug.has(e.slug))
              .map((e, ei) => ({
                exerciseId: bySlug.get(e.slug)!,
                sortOrder: ei,
                sets: e.sets,
                targetRepsMin: e.repsMin,
                targetRepsMax: e.repsMax,
                restSeconds: e.rest,
                targetRpe: e.rpe ?? null,
                supersetGroup: e.superset ?? null,
                notes: e.notes ?? null,
              })),
          },
        })),
      },
    },
    include: { templates: true },
  });

  return program;
}
