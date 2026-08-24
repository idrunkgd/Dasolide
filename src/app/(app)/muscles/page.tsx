import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getMuscleVolume } from "@/server/queries/training";
import { setVolume } from "@/lib/calc";
import { addDays, startOfDay } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { MuscleMapView, type MuscleMeta } from "@/components/muscles/muscle-map-view";
import type {
  MapPeriod,
  MuscleExerciseUsage,
  MuscleStat,
  PeriodData,
} from "@/components/muscles/scale";

export const dynamic = "force-dynamic";

const PERIOD_DAYS: Record<MapPeriod, number> = { "7": 7, "30": 30, "90": 90 };

/**
 * Exercices réalisés par muscle, sur les trois fenêtres de la carte.
 *
 * `getMuscleVolume` fournit déjà les agrégats ; il manque le détail par
 * exercice, nécessaire à la feuille de détail. Une seule requête couvre les
 * 90 jours, les fenêtres plus courtes sont dérivées en mémoire.
 */
async function getMuscleExercises(
  userId: string,
  from: Date,
  to: Date
): Promise<Record<MapPeriod, Record<string, MuscleExerciseUsage[]>>> {
  const rows = await prisma.workoutExercise.findMany({
    where: { session: { userId, status: "completed", startedAt: { gte: from, lte: to } } },
    select: {
      exercise: {
        select: {
          id: true,
          name: true,
          primaryMuscle: { select: { slug: true } },
          secondaryMuscles: { select: { muscleGroup: { select: { slug: true } } } },
        },
      },
      sets: { select: { completed: true, type: true, weightKg: true, reps: true } },
      session: { select: { startedAt: true } },
    },
  });

  const result = {
    "7": {} as Record<string, MuscleExerciseUsage[]>,
    "30": {} as Record<string, MuscleExerciseUsage[]>,
    "90": {} as Record<string, MuscleExerciseUsage[]>,
  } satisfies Record<MapPeriod, Record<string, MuscleExerciseUsage[]>>;

  const bump = (
    bucket: Record<string, MuscleExerciseUsage[]>,
    slug: string,
    exercise: { id: string; name: string },
    sets: number,
    volume: number,
    date: Date
  ) => {
    const list = (bucket[slug] ??= []);
    const existing = list.find((e) => e.id === exercise.id);
    if (existing) {
      existing.sets = Math.round((existing.sets + sets) * 10) / 10;
      existing.volume = Math.round(existing.volume + volume);
      if (date.toISOString() > existing.lastAt) existing.lastAt = date.toISOString();
      return;
    }
    list.push({
      id: exercise.id,
      name: exercise.name,
      sets: Math.round(sets * 10) / 10,
      volume: Math.round(volume),
      lastAt: date.toISOString(),
    });
  };

  const now = Date.now();
  for (const row of rows) {
    const working = row.sets.filter((s) => s.completed && s.type !== "W");
    if (working.length === 0) continue;
    const volume = working.reduce((acc, s) => acc + setVolume(s), 0);
    const date = row.session.startedAt;
    const ageDays = (now - date.getTime()) / 86400000;

    for (const key of ["7", "30", "90"] as MapPeriod[]) {
      if (ageDays > PERIOD_DAYS[key]) continue;
      const bucket = result[key];
      bump(bucket, row.exercise.primaryMuscle.slug, row.exercise, working.length, volume, date);
      // Convention identique à getMuscleVolume : les muscles secondaires
      // comptent pour moitié.
      for (const sec of row.exercise.secondaryMuscles) {
        bump(bucket, sec.muscleGroup.slug, row.exercise, working.length * 0.5, volume * 0.5, date);
      }
    }
  }

  return result;
}

/** Carte des muscles (§15). */
export default async function MusclesPage() {
  const user = await requireUser();
  const unit = (user.settings?.weightUnit ?? "kg") as "kg" | "lb";

  const now = new Date();
  const from = (days: number) => addDays(startOfDay(now), -(days - 1));
  // Borne haute = fin de la journée en cours : une séance encodée ce matin ou
  // ce soir compte de la même manière.
  const to = addDays(startOfDay(now), 1);

  const [muscles, v7, v30, v90, exercises] = await Promise.all([
    prisma.muscleGroup.findMany({
      orderBy: { sortOrder: "asc" },
      select: { slug: true, name: true, color: true },
    }),
    getMuscleVolume(user.id, from(7), to),
    getMuscleVolume(user.id, from(30), to),
    getMuscleVolume(user.id, from(90), to),
    getMuscleExercises(user.id, from(90), to),
  ]);

  const toStats = (rows: Awaited<ReturnType<typeof getMuscleVolume>>): MuscleStat[] =>
    rows.map((r) => ({
      slug: r.slug,
      name: r.name,
      color: r.color,
      sets: r.sets,
      volume: r.volume,
      frequency: r.frequency,
      lastTrained: r.lastTrained ? r.lastTrained.toISOString() : null,
    }));

  const data: Record<MapPeriod, PeriodData> = {
    "7": { stats: toStats(v7), exercises: exercises["7"] },
    "30": { stats: toStats(v30), exercises: exercises["30"] },
    "90": { stats: toStats(v90), exercises: exercises["90"] },
  };

  return (
    <>
      <PageHeader
        title="Carte des muscles"
        subtitle="Ce que tu as réellement travaillé"
        back="/"
      />
      <MuscleMapView muscles={muscles as MuscleMeta[]} data={data} unit={unit} />
    </>
  );
}
