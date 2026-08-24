/**
 * Données de démonstration (§44, §45).
 *
 *  - Bibliothèques de référence : groupes musculaires, ~175 exercices, ~235 aliments.
 *  - Un compte DEMO complet : demo@muscu.app / demo1234
 *    avec 10 semaines d'historique cohérent (séances, charges progressives,
 *    poids quotidien, alimentation, mensurations, photos, objectifs, records).
 *
 * Relancer à volonté : `npm run db:seed` (idempotent pour les bibliothèques,
 * il recrée intégralement le compte de démonstration).
 */
import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import { MUSCLES } from "./data/muscles";
import { EXERCISES } from "./data/exercises";
import { FOODS } from "./data/foods";

const url = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
const isPostgres = url.startsWith("postgres://") || url.startsWith("postgresql://");
const prisma = new PrismaClient({
  adapter: isPostgres ? new PrismaPg({ connectionString: url }) : new PrismaBetterSqlite3({ url }),
});

const DEMO_EMAIL = "demo@muscu.app";
const DEMO_PASSWORD = "demo1234";

// --------------------------------------------------------------------------
// Générateur pseudo-aléatoire déterministe : le seed produit toujours les
// mêmes données, ce qui rend les captures d'écran et les tests reproductibles.
// --------------------------------------------------------------------------
let seedState = 20260824;
function rnd() {
  seedState = (seedState * 1664525 + 1013904223) % 4294967296;
  return seedState / 4294967296;
}
const rndInt = (min: number, max: number) => Math.floor(rnd() * (max - min + 1)) + min;
const pick = <T,>(arr: T[]): T => arr[Math.floor(rnd() * arr.length)];

function day(offsetDays: number, hour = 18, minute = 30): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + offsetDays);
  d.setHours(hour, minute, 0, 0);
  return d;
}
function dayStart(offsetDays: number): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + offsetDays);
  return d;
}

// ===========================================================================

async function seedMuscles() {
  for (const m of MUSCLES) {
    await prisma.muscleGroup.upsert({
      where: { slug: m.slug },
      create: m,
      update: { name: m.name, bodyPart: m.bodyPart, region: m.region, color: m.color, sortOrder: m.sortOrder },
    });
  }
  console.log(`  ✔ ${MUSCLES.length} groupes musculaires`);
}

async function seedExercises() {
  const muscles = await prisma.muscleGroup.findMany({ select: { id: true, slug: true } });
  const bySlug = new Map(muscles.map((m) => [m.slug, m.id]));
  let created = 0;
  let skipped = 0;

  for (const e of EXERCISES) {
    const primaryId = bySlug.get(e.primaryMuscle);
    if (!primaryId) {
      skipped++;
      continue;
    }

    const exercise = await prisma.exercise.upsert({
      where: { slug: e.slug },
      create: {
        slug: e.slug,
        name: e.name,
        description: e.description,
        instructions: e.instructions,
        category: e.category,
        primaryMuscleId: primaryId,
        equipment: e.equipment,
        movementType: e.movementType,
        difficulty: e.difficulty,
        trackingType: e.trackingType,
        isCardio: e.isCardio ?? false,
        isUnilateral: e.isUnilateral ?? false,
      },
      update: {
        name: e.name,
        description: e.description,
        instructions: e.instructions,
        category: e.category,
        primaryMuscleId: primaryId,
        equipment: e.equipment,
        movementType: e.movementType,
        difficulty: e.difficulty,
        trackingType: e.trackingType,
        isCardio: e.isCardio ?? false,
        isUnilateral: e.isUnilateral ?? false,
      },
    });

    await prisma.exerciseSecondaryMuscle.deleteMany({ where: { exerciseId: exercise.id } });
    const secondaryIds = e.secondaryMuscles
      .map((s) => bySlug.get(s))
      .filter((id): id is string => Boolean(id));
    if (secondaryIds.length > 0) {
      await prisma.exerciseSecondaryMuscle.createMany({
        data: secondaryIds.map((muscleGroupId) => ({ exerciseId: exercise.id, muscleGroupId })),
      });
    }
    created++;
  }
  console.log(`  ✔ ${created} exercices${skipped ? ` (${skipped} ignorés : muscle inconnu)` : ""}`);
}

async function seedFoods() {
  const existing = await prisma.food.findMany({
    where: { isCustom: false },
    select: { id: true, name: true, brand: true },
  });
  const key = (n: string, b?: string | null) => `${n.toLowerCase()}|${(b ?? "").toLowerCase()}`;
  const byKey = new Map(existing.map((f) => [key(f.name, f.brand), f.id]));

  let created = 0;
  for (const f of FOODS) {
    const k = key(f.name, f.brand);
    const data = {
      name: f.name,
      brand: f.brand ?? null,
      category: f.category,
      servingName: f.servingName ?? null,
      servingGrams: f.servingGrams ?? null,
      kcal100: f.kcal100,
      protein100: f.protein100,
      carbs100: f.carbs100,
      fat100: f.fat100,
      fiber100: f.fiber100 ?? null,
      sugar100: f.sugar100 ?? null,
      salt100: f.salt100 ?? null,
      verified: true,
      isCustom: false,
    };
    const id = byKey.get(k);
    if (id) {
      await prisma.food.update({ where: { id }, data });
    } else {
      await prisma.food.create({ data });
      created++;
    }
  }
  console.log(`  ✔ ${FOODS.length} aliments (${created} nouveaux)`);
}

// ===========================================================================
// Compte de démonstration
// ===========================================================================

/** Le programme PPL/Upper décrit au §45, avec les charges de départ. */
const DEMO_PROGRAM = {
  name: "Push / Pull / Legs / Upper",
  description: "Programme de démonstration : 4 séances, chaque muscle sollicité deux fois par semaine.",
  type: "ppl",
  templates: [
    {
      name: "Push A",
      dayOfWeek: 1,
      exercises: [
        { slug: "developpe-couche-barre", sets: 4, min: 6, max: 8, rest: 180, start: 72.5, step: 1.25 },
        { slug: "developpe-incline-halteres", sets: 3, min: 8, max: 12, rest: 150, start: 26, step: 0.5 },
        { slug: "developpe-militaire-halteres", sets: 3, min: 8, max: 12, rest: 120, start: 20, step: 0.4 },
        { slug: "elevations-laterales", sets: 4, min: 12, max: 15, rest: 60, start: 10, step: 0.2, superset: "A" },
        { slug: "extension-triceps-poulie", sets: 3, min: 10, max: 15, rest: 60, start: 27.5, step: 0.6, superset: "A" },
        { slug: "dips", sets: 3, min: 8, max: 12, rest: 120, start: 0, step: 0.8 },
      ],
    },
    {
      name: "Pull A",
      dayOfWeek: 2,
      exercises: [
        { slug: "tractions-pronation", sets: 4, min: 5, max: 10, rest: 180, start: 0, step: 0.6 },
        { slug: "tirage-vertical", sets: 3, min: 8, max: 12, rest: 120, start: 60, step: 1 },
        { slug: "rowing-barre", sets: 4, min: 8, max: 10, rest: 150, start: 60, step: 1.1 },
        { slug: "face-pull", sets: 3, min: 15, max: 20, rest: 60, start: 22.5, step: 0.5 },
        { slug: "curl-barre", sets: 3, min: 8, max: 12, rest: 90, start: 30, step: 0.5, superset: "A" },
        { slug: "curl-marteau", sets: 3, min: 10, max: 12, rest: 90, start: 14, step: 0.25, superset: "A" },
      ],
    },
    {
      name: "Legs",
      dayOfWeek: 4,
      exercises: [
        { slug: "squat-barre", sets: 4, min: 5, max: 8, rest: 210, start: 95, step: 1.8 },
        { slug: "presse-a-cuisses", sets: 3, min: 10, max: 15, rest: 150, start: 170, step: 3.5 },
        { slug: "leg-curl-allonge", sets: 3, min: 10, max: 15, rest: 90, start: 45, step: 0.8 },
        { slug: "leg-extension", sets: 3, min: 12, max: 15, rest: 90, start: 50, step: 0.9 },
        { slug: "mollets-debout", sets: 4, min: 12, max: 20, rest: 60, start: 80, step: 1.6 },
        { slug: "crunch-poulie", sets: 3, min: 12, max: 20, rest: 60, start: 32.5, step: 0.6 },
      ],
    },
    {
      name: "Upper",
      dayOfWeek: 5,
      exercises: [
        { slug: "developpe-couche-barre", sets: 4, min: 6, max: 10, rest: 180, start: 67.5, step: 1.2 },
        { slug: "rowing-barre", sets: 4, min: 8, max: 10, rest: 150, start: 57.5, step: 1 },
        { slug: "developpe-militaire-halteres", sets: 3, min: 8, max: 12, rest: 120, start: 18, step: 0.35 },
        { slug: "tirage-vertical", sets: 3, min: 8, max: 12, rest: 120, start: 57.5, step: 0.9 },
        { slug: "elevations-laterales", sets: 3, min: 12, max: 15, rest: 60, start: 9, step: 0.18 },
        { slug: "curl-halteres", sets: 3, min: 10, max: 12, rest: 75, start: 13, step: 0.22, superset: "A" },
        { slug: "extension-triceps-poulie", sets: 3, min: 10, max: 15, rest: 75, start: 25, step: 0.55, superset: "A" },
      ],
    },
  ],
} as const;

const WEEKS_OF_HISTORY = 10;

async function seedDemoUser() {
  // Repartir d'un compte propre à chaque exécution.
  await prisma.user.deleteMany({ where: { email: DEMO_EMAIL } });

  const user = await prisma.user.create({
    data: {
      email: DEMO_EMAIL,
      name: "Alex",
      role: "ADMIN",
      passwordHash: await bcrypt.hash(DEMO_PASSWORD, 12),
      onboardedAt: day(-WEEKS_OF_HISTORY * 7, 9, 0),
      lastSeenAt: new Date(),
      settings: { create: { accentColor: "lime", theme: "dark", showRpe: true } },
      profile: {
        create: {
          firstName: "Alex",
          sex: "homme",
          birthDate: new Date(1993, 4, 12),
          heightCm: 179,
          startWeightKg: 86.4,
          targetWeightKg: 80,
          level: "intermediaire",
          mainGoal: "recomposition",
          activityLevel: "modere",
          sessionsPerWeek: 4,
          sessionMinutes: 70,
          equipment: "salle_complete,halteres,barre,banc,poulies,machines",
          availableDays: "1,2,4,5",
        },
      },
    },
  });

  const exercises = await prisma.exercise.findMany({
    select: { id: true, slug: true, name: true, trackingType: true, category: true },
  });
  const bySlug = new Map(exercises.map((e) => [e.slug, e]));

  // ---------------------------------------------------------------- Programme
  const program = await prisma.workoutProgram.create({
    data: {
      userId: user.id,
      name: DEMO_PROGRAM.name,
      description: DEMO_PROGRAM.description,
      type: DEMO_PROGRAM.type,
      isActive: true,
      cycleLength: 7,
      templates: {
        create: DEMO_PROGRAM.templates.map((t, ti) => ({
          name: t.name,
          sortOrder: ti,
          dayOfWeek: t.dayOfWeek,
          exercises: {
            create: t.exercises
              .filter((e) => bySlug.has(e.slug))
              .map((e, ei) => ({
                exerciseId: bySlug.get(e.slug)!.id,
                sortOrder: ei,
                sets: e.sets,
                targetRepsMin: e.min,
                targetRepsMax: e.max,
                restSeconds: e.rest,
                supersetGroup: "superset" in e ? (e.superset as string) : null,
              })),
          },
        })),
      },
    },
    include: { templates: { orderBy: { sortOrder: "asc" } } },
  });

  const templateByName = new Map(program.templates.map((t) => [t.name, t]));

  // ------------------------------------------------------------- Historique
  // 4 séances par semaine (lundi, mardi, jeudi, vendredi) sur 10 semaines,
  // avec une progression réaliste et quelques séances manquées.
  const missedSessions = new Set(["3-1", "6-4", "8-2"]); // semaine-jour

  let sessionsCreated = 0;
  const allSessionIds: string[] = [];

  for (let w = WEEKS_OF_HISTORY; w >= 0; w--) {
    for (let ti = 0; ti < DEMO_PROGRAM.templates.length; ti++) {
      const spec = DEMO_PROGRAM.templates[ti];
      const template = templateByName.get(spec.name);
      if (!template) continue;

      // Décalage en jours par rapport à aujourd'hui
      const todayDow = ((new Date().getDay() + 6) % 7) + 1;
      const offset = -(w * 7) + (spec.dayOfWeek - todayDow);
      if (offset > 0) continue; // pas de séance dans le futur

      const weekIndex = WEEKS_OF_HISTORY - w;
      if (missedSessions.has(`${weekIndex}-${spec.dayOfWeek}`)) continue;

      const startedAt = day(offset, rndInt(17, 19), rndInt(0, 55));
      const durationSeconds = rndInt(52, 82) * 60;

      const session = await prisma.workoutSession.create({
        data: {
          userId: user.id,
          programId: program.id,
          templateId: template.id,
          name: spec.name,
          startedAt,
          endedAt: new Date(startedAt.getTime() + durationSeconds * 1000),
          durationSeconds,
          status: "completed",
          feltEnergy: rndInt(3, 5),
          feltMotivation: rndInt(3, 5),
          sleepHours: Math.round((6.5 + rnd() * 2) * 2) / 2,
          stressLevel: rndInt(1, 3),
          soreness: rndInt(1, 4),
          feedback: rnd() > 0.75 ? pick(["Bonne séance, énergie au top.", "Un peu court sur le temps.", "Charges qui montent bien."]) : null,
        },
      });
      allSessionIds.push(session.id);
      sessionsCreated++;

      for (let ei = 0; ei < spec.exercises.length; ei++) {
        const spx = spec.exercises[ei];
        const ex = bySlug.get(spx.slug);
        if (!ex) continue;

        const workoutExercise = await prisma.workoutExercise.create({
          data: {
            sessionId: session.id,
            exerciseId: ex.id,
            sortOrder: ei,
            restSeconds: spx.rest,
            supersetGroup: "superset" in spx ? (spx.superset as string) : null,
            targetRepsMin: spx.min,
            targetRepsMax: spx.max,
          },
        });

        // Progression linéaire + bruit léger, arrondie au pas de 1,25 kg
        const base = spx.start + spx.step * weekIndex;
        const working = Math.max(0, Math.round((base + (rnd() - 0.5) * 1.5) / 1.25) * 1.25);
        const isBodyweight = ex.trackingType === "reps_only";

        const setsData: {
          setNumber: number;
          type: string;
          weightKg: number | null;
          reps: number | null;
          rpe: number | null;
          completed: boolean;
          completedAt: Date;
        }[] = [];

        // Une série d'échauffement sur les gros mouvements
        let n = 1;
        if (!isBodyweight && working >= 40) {
          setsData.push({
            setNumber: n++,
            type: "W",
            weightKg: Math.round((working * 0.5) / 2.5) * 2.5,
            reps: 10,
            rpe: null,
            completed: true,
            completedAt: startedAt,
          });
        }

        for (let s = 0; s < spx.sets; s++) {
          const fatigue = s === 0 ? 0 : rndInt(0, 2);
          const reps = Math.max(spx.min - 1, spx.max - fatigue - (rnd() > 0.6 ? 1 : 0));
          setsData.push({
            setNumber: n++,
            type: s === spx.sets - 1 && rnd() > 0.85 ? "F" : "N",
            weightKg: isBodyweight ? null : working,
            reps,
            rpe: Math.min(10, 7 + s * 0.5 + (rnd() > 0.7 ? 0.5 : 0)),
            completed: true,
            completedAt: new Date(startedAt.getTime() + (ei * 8 + s * 3) * 60000),
          });
        }

        await prisma.workoutSet.createMany({
          data: setsData.map((s) => ({ ...s, workoutExerciseId: workoutExercise.id })),
        });
      }

      // Totaux figés
      const sets = await prisma.workoutSet.findMany({
        where: { workoutExercise: { sessionId: session.id } },
      });
      const workingSets = sets.filter((s) => s.type !== "W");
      await prisma.workoutSession.update({
        where: { id: session.id },
        data: {
          totalVolumeKg: workingSets.reduce((a, s) => a + (s.weightKg ?? 0) * (s.reps ?? 0), 0),
          totalSets: workingSets.length,
          totalReps: workingSets.reduce((a, s) => a + (s.reps ?? 0), 0),
        },
      });

      await prisma.plannedWorkout.create({
        data: {
          userId: user.id,
          date: dayStart(offset),
          programId: program.id,
          templateId: template.id,
          sessionId: session.id,
          status: "completed",
        },
      });
    }
  }
  console.log(`  ✔ ${sessionsCreated} séances d'historique`);

  // Records — calculés dans l'ordre chronologique pour que les
  // « anciens records » affichés soient exacts.
  const { detectAndSaveRecords } = await import("../src/server/records");
  const ordered = await prisma.workoutSession.findMany({
    where: { userId: user.id, status: "completed" },
    orderBy: { startedAt: "asc" },
    select: { id: true },
  });
  let prCount = 0;
  for (const s of ordered) {
    const found = await detectAndSaveRecords(user.id, s.id, prisma);
    prCount += found.length;
    if (found.length > 0) {
      await prisma.workoutSession.update({ where: { id: s.id }, data: { prCount: found.length } });
    }
  }
  console.log(`  ✔ ${prCount} records personnels détectés`);

  // ------------------------------------------------------- Planning à venir
  const todayDow = ((new Date().getDay() + 6) % 7) + 1;
  for (let d = 0; d < 28; d++) {
    const date = dayStart(d);
    const dow = ((date.getDay() + 6) % 7) + 1;
    const spec = DEMO_PROGRAM.templates.find((t) => t.dayOfWeek === dow);
    const existing = await prisma.plannedWorkout.findFirst({ where: { userId: user.id, date } });
    if (existing) continue;
    await prisma.plannedWorkout.create({
      data: {
        userId: user.id,
        date,
        programId: program.id,
        templateId: spec ? (templateByName.get(spec.name)?.id ?? null) : null,
        status: spec ? "planned" : "rest",
      },
    });
  }
  void todayDow;

  // ------------------------------------------------------------------ Poids
  // Trajectoire de recomposition : −0,35 kg/semaine avec le bruit quotidien
  // caractéristique (eau, digestion) — c'est justement ce que la moyenne
  // glissante permet de lire correctement.
  const weightRows: { userId: string; date: Date; weightKg: number; bodyFatPct: number | null }[] = [];
  for (let d = WEEKS_OF_HISTORY * 7; d >= 0; d--) {
    if (d !== 0 && rnd() > 0.88) continue; // quelques jours sans pesée
    const weeks = (WEEKS_OF_HISTORY * 7 - d) / 7;
    const trend = 86.4 - weeks * 0.34;
    const noise = (rnd() - 0.5) * 1.1;
    weightRows.push({
      userId: user.id,
      date: dayStart(-d),
      weightKg: Math.round((trend + noise) * 10) / 10,
      bodyFatPct: d % 14 === 0 ? Math.round((19.5 - weeks * 0.22) * 10) / 10 : null,
    });
  }
  await prisma.bodyWeight.createMany({ data: weightRows });
  console.log(`  ✔ ${weightRows.length} pesées`);

  // ---------------------------------------------------------- Mensurations
  for (let w = WEEKS_OF_HISTORY; w >= 0; w -= 2) {
    const weeks = WEEKS_OF_HISTORY - w;
    await prisma.bodyMeasurement.create({
      data: {
        userId: user.id,
        date: dayStart(-w * 7),
        neckCm: 39.5,
        shouldersCm: 122 + weeks * 0.15,
        chestCm: 104 + weeks * 0.12,
        waistCm: Math.round((89 - weeks * 0.42) * 10) / 10,
        hipsCm: 100 - weeks * 0.15,
        armLeftCm: Math.round((37.4 + weeks * 0.09) * 10) / 10,
        armRightCm: Math.round((37.8 + weeks * 0.09) * 10) / 10,
        thighLeftCm: 59 + weeks * 0.1,
        thighRightCm: 59.3 + weeks * 0.1,
        calfLeftCm: 38.2,
        calfRightCm: 38.4,
        bodyFatPct: Math.round((19.5 - weeks * 0.22) * 10) / 10,
      },
    });
  }
  console.log("  ✔ mensurations");

  // ------------------------------------------------------------- Nutrition
  const goal = await prisma.nutritionGoal.create({
    data: {
      userId: user.id,
      kcal: 2400,
      protein: 180,
      carbs: 250,
      fat: 70,
      fiber: 32,
      waterMl: 3000,
      source: "mifflin_st_jeor",
      isActive: true,
    },
  });

  const foods = await prisma.food.findMany({ where: { isCustom: false } });
  const foodByName = new Map(foods.map((f) => [f.name.toLowerCase(), f]));
  const need = (n: string) => foodByName.get(n.toLowerCase());

  const breakfast = [
    { food: need("Flocons d'avoine"), g: 80 },
    { food: need("Whey protéine"), g: 30 },
    { food: need("Banane"), g: 120 },
  ].filter((x) => x.food);

  const lunch = [
    { food: need("Blanc de poulet"), g: 180 },
    { food: need("Riz blanc cuit"), g: 250 },
    { food: need("Brocoli"), g: 150 },
  ].filter((x) => x.food);

  const snack = [
    { food: need("Yaourt grec nature 0%"), g: 200 },
    { food: need("Amandes"), g: 25 },
  ].filter((x) => x.food);

  const dinner = [
    { food: need("Saumon"), g: 160 },
    { food: need("Pomme de terre"), g: 300 },
  ].filter((x) => x.food);

  const meals: [string, typeof breakfast][] = [
    ["petit_dejeuner", breakfast],
    ["dejeuner", lunch],
    ["collation", snack],
    ["diner", dinner],
  ];

  let entryCount = 0;
  for (let d = 45; d >= 0; d--) {
    if (rnd() > 0.87) continue; // quelques journées non encodées
    const date = dayStart(-d);
    for (const [mealType, items] of meals) {
      if (items.length === 0) continue;
      if (mealType === "collation" && rnd() > 0.65) continue;
      let order = 0;
      for (const item of items) {
        const f = item.food!;
        const grams = Math.round(item.g * (0.85 + rnd() * 0.3));
        const r = grams / 100;
        await prisma.diaryEntry.create({
          data: {
            userId: user.id,
            date,
            mealType,
            foodId: f.id,
            label: f.name,
            quantityGrams: grams,
            kcal: Math.round(f.kcal100 * r * 10) / 10,
            protein: Math.round(f.protein100 * r * 10) / 10,
            carbs: Math.round(f.carbs100 * r * 10) / 10,
            fat: Math.round(f.fat100 * r * 10) / 10,
            fiber: Math.round((f.fiber100 ?? 0) * r * 10) / 10,
            sortOrder: order++,
          },
        });
        entryCount++;
      }
    }
    await prisma.nutritionDay.create({
      data: { userId: user.id, date, waterMl: rndInt(1800, 3400) },
    });
  }
  console.log(`  ✔ ${entryCount} lignes de journal alimentaire`);

  // Repas favori + recette
  if (breakfast.length === 3) {
    await prisma.savedMeal.create({
      data: {
        userId: user.id,
        name: "Petit-déjeuner habituel",
        description: "Avoine, whey et banane — 3 minutes de préparation.",
        defaultMealType: "petit_dejeuner",
        items: {
          create: breakfast.map((b, i) => ({ foodId: b.food!.id, quantityGrams: b.g, sortOrder: i })),
        },
      },
    });
  }
  if (lunch.length === 3) {
    await prisma.savedMeal.create({
      data: {
        userId: user.id,
        name: "Poulet riz brocoli",
        description: "Le classique. Simple, efficace, protéiné.",
        defaultMealType: "dejeuner",
        items: { create: lunch.map((b, i) => ({ foodId: b.food!.id, quantityGrams: b.g, sortOrder: i })) },
      },
    });
  }

  const pitaIngredients = [
    { food: need("Blanc de poulet"), g: 150 },
    { food: need("Pain pita"), g: 120 },
    { food: need("Yaourt grec nature 0%"), g: 60 },
    { food: need("Tomate"), g: 80 },
    { food: need("Salade verte"), g: 40 },
  ].filter((x) => x.food);

  if (pitaIngredients.length >= 3) {
    await prisma.recipe.create({
      data: {
        userId: user.id,
        name: "Pita poulet maison",
        description: "Rapide, rassasiant, et les macros tombent juste.",
        instructions:
          "Faire griller le poulet coupé en lanières. Chauffer le pain pita. Garnir de poulet, crudités et sauce au yaourt grec assaisonné.",
        servings: 2,
        ingredients: {
          create: pitaIngredients.map((x, i) => ({ foodId: x.food!.id, quantityGrams: x.g, sortOrder: i })),
        },
      },
    });
  }

  // Aliments favoris
  const favourites = [need("Blanc de poulet"), need("Riz blanc cuit"), need("Œuf entier"), need("Whey protéine"), need("Flocons d'avoine"), need("Banane")]
    .filter((f): f is NonNullable<typeof f> => Boolean(f));
  await prisma.foodFavorite.createMany({
    data: favourites.map((f) => ({ userId: user.id, foodId: f.id })),
  });

  // ------------------------------------------------------------- Objectifs
  await prisma.goal.createMany({
    data: [
      {
        userId: user.id,
        type: "poids",
        title: "Descendre à 80 kg",
        startValue: 86.4,
        targetValue: 80,
        unit: "kg",
        targetDate: dayStart(83),
      },
      {
        userId: user.id,
        type: "mensuration",
        title: "Tour de taille sous 85 cm",
        measureKey: "waistCm",
        startValue: 89,
        targetValue: 85,
        unit: "cm",
        targetDate: dayStart(60),
      },
    ],
  });

  const bench = bySlug.get("developpe-couche-barre");
  if (bench) {
    await prisma.goal.create({
      data: {
        userId: user.id,
        type: "force",
        title: "100 kg au développé couché",
        exerciseId: bench.id,
        startValue: 72.5,
        targetValue: 100,
        unit: "kg",
        targetDate: dayStart(120),
      },
    });
    await prisma.exerciseNote.create({
      data: {
        userId: user.id,
        exerciseId: bench.id,
        content: "Prise à 81 cm. Omoplates serrées, pieds bien ancrés. Ne pas rebondir sur la poitrine.",
      },
    });
  }

  const legPress = bySlug.get("presse-a-cuisses");
  if (legPress) {
    await prisma.exerciseNote.create({
      data: {
        userId: user.id,
        exerciseId: legPress.id,
        content: "Réglage machine : dossier position 4, pieds hauts sur la plateforme.",
      },
    });
  }

  // --------------------------------------------------------------- Rappels
  await prisma.reminder.createMany({
    data: [
      { userId: user.id, type: "entrainement", time: "18:00", days: "1,2,4,5", message: "Séance dans 30 minutes 💪" },
      { userId: user.id, type: "poids", time: "08:00", days: "1,2,3,4,5,6,7", message: "Pense à encoder ton poids." },
      { userId: user.id, type: "repas", time: "21:00", days: "1,2,3,4,5,6,7", message: "Tu n'as pas encore complété ton alimentation aujourd'hui.", enabled: false },
    ],
  });

  void goal;
  void allSessionIds;

  console.log(`\n  Compte de démonstration : ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
}

// ===========================================================================

async function main() {
  console.log("\nInitialisation des données…\n");
  await seedMuscles();
  await seedExercises();
  await seedFoods();
  console.log("\nCompte de démonstration…\n");
  await seedDemoUser();
  console.log("\nTerminé.\n");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
