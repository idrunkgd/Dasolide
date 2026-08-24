import "server-only";
import { prisma } from "@/lib/db";
import { addDays, startOfDay, startOfWeek } from "@/lib/utils";
import { estimate1RM, setVolume } from "@/lib/calc";

/** Séance en cours, s'il y en a une (reprise après fermeture du navigateur — §40). */
export async function getActiveSession(userId: string) {
  return prisma.workoutSession.findFirst({
    where: { userId, status: "in_progress" },
    orderBy: { startedAt: "desc" },
    select: { id: true, name: true, startedAt: true },
  });
}

export type ExerciseHistoryEntry = {
  sessionId: string;
  date: Date;
  sets: {
    id: string;
    setNumber: number;
    type: string;
    weightKg: number | null;
    reps: number | null;
    rpe: number | null;
    durationSec: number | null;
    distanceM: number | null;
    isPr: boolean;
  }[];
};

/** Historique complet d'un exercice, séance par séance (§11). */
export async function getExerciseHistory(
  userId: string,
  exerciseId: string,
  limit = 200
): Promise<ExerciseHistoryEntry[]> {
  const rows = await prisma.workoutExercise.findMany({
    where: { exerciseId, session: { userId, status: "completed" } },
    include: {
      session: { select: { id: true, startedAt: true } },
      sets: { orderBy: { setNumber: "asc" } },
    },
    orderBy: { session: { startedAt: "desc" } },
    take: limit,
  });

  return rows.map((r) => ({
    sessionId: r.session.id,
    date: r.session.startedAt,
    sets: r.sets
      .filter((s) => s.completed)
      .map((s) => ({
        id: s.id,
        setNumber: s.setNumber,
        type: s.type,
        weightKg: s.weightKg,
        reps: s.reps,
        rpe: s.rpe,
        durationSec: s.durationSec,
        distanceM: s.distanceM,
        isPr: s.isPr,
      })),
  }));
}

/** Dernière performance sur un exercice — affichée en tête pendant la séance (§8). */
export async function getLastPerformance(userId: string, exerciseIds: string[]) {
  if (exerciseIds.length === 0) return new Map<string, ExerciseHistoryEntry>();

  const rows = await prisma.workoutExercise.findMany({
    where: { exerciseId: { in: exerciseIds }, session: { userId, status: "completed" } },
    include: {
      session: { select: { id: true, startedAt: true } },
      sets: { orderBy: { setNumber: "asc" } },
    },
    orderBy: { session: { startedAt: "desc" } },
  });

  const map = new Map<string, ExerciseHistoryEntry>();
  for (const r of rows) {
    if (map.has(r.exerciseId)) continue;
    const sets = r.sets.filter((s) => s.completed);
    if (sets.length === 0) continue;
    map.set(r.exerciseId, {
      sessionId: r.session.id,
      date: r.session.startedAt,
      sets: sets.map((s) => ({
        id: s.id,
        setNumber: s.setNumber,
        type: s.type,
        weightKg: s.weightKg,
        reps: s.reps,
        rpe: s.rpe,
        durationSec: s.durationSec,
        distanceM: s.distanceM,
        isPr: s.isPr,
      })),
    });
  }
  return map;
}

export type ExerciseStats = {
  bestWeight: number;
  bestReps: number;
  bestVolumeSet: number;
  best1rm: number;
  totalSets: number;
  totalVolume: number;
  sessionCount: number;
  series: { date: Date; weight: number; reps: number; volume: number; oneRm: number }[];
};

export function computeExerciseStats(history: ExerciseHistoryEntry[]): ExerciseStats {
  let bestWeight = 0;
  let bestReps = 0;
  let bestVolumeSet = 0;
  let best1rm = 0;
  let totalSets = 0;
  let totalVolume = 0;

  const series: ExerciseStats["series"] = [];

  for (const entry of history) {
    const working = entry.sets.filter((s) => s.type !== "W");
    if (working.length === 0) continue;

    let dayVolume = 0;
    let dayBestWeight = 0;
    let dayBestReps = 0;
    let dayBest1rm = 0;

    for (const s of working) {
      const w = s.weightKg ?? 0;
      const r = s.reps ?? 0;
      const vol = setVolume({ weightKg: w, reps: r, type: s.type });
      const orm = estimate1RM(w, r);

      totalSets += 1;
      totalVolume += vol;
      dayVolume += vol;
      if (w > dayBestWeight) dayBestWeight = w;
      if (r > dayBestReps) dayBestReps = r;
      if (orm > dayBest1rm) dayBest1rm = orm;
      if (vol > bestVolumeSet) bestVolumeSet = vol;
    }

    if (dayBestWeight > bestWeight) bestWeight = dayBestWeight;
    if (dayBestReps > bestReps) bestReps = dayBestReps;
    if (dayBest1rm > best1rm) best1rm = dayBest1rm;

    series.push({
      date: entry.date,
      weight: dayBestWeight,
      reps: dayBestReps,
      volume: dayVolume,
      oneRm: Math.round(dayBest1rm * 10) / 10,
    });
  }

  series.sort((a, b) => a.date.getTime() - b.date.getTime());

  return {
    bestWeight,
    bestReps,
    bestVolumeSet,
    best1rm: Math.round(best1rm * 10) / 10,
    totalSets,
    totalVolume,
    sessionCount: series.length,
    series,
  };
}

/** Volume et séries par groupe musculaire sur une période (§14, §15). */
export async function getMuscleVolume(userId: string, from: Date, to: Date) {
  const rows = await prisma.workoutExercise.findMany({
    where: {
      session: { userId, status: "completed", startedAt: { gte: from, lte: to } },
    },
    include: {
      exercise: {
        select: {
          id: true,
          name: true,
          category: true,
          primaryMuscle: { select: { id: true, slug: true, name: true, color: true } },
          secondaryMuscles: { select: { muscleGroup: { select: { id: true, slug: true, name: true } } } },
        },
      },
      sets: true,
      session: { select: { startedAt: true } },
    },
  });

  type Agg = {
    slug: string;
    name: string;
    color: string;
    sets: number;
    volume: number;
    lastTrained: Date | null;
    sessions: Set<string>;
  };
  const map = new Map<string, Agg>();

  const bump = (
    muscle: { slug: string; name: string; color?: string },
    sets: number,
    volume: number,
    date: Date,
    weight: number
  ) => {
    const cur =
      map.get(muscle.slug) ??
      ({
        slug: muscle.slug,
        name: muscle.name,
        color: muscle.color ?? "#a3e635",
        sets: 0,
        volume: 0,
        lastTrained: null,
        sessions: new Set<string>(),
      } as Agg);
    cur.sets += sets * weight;
    cur.volume += volume * weight;
    if (!cur.lastTrained || date > cur.lastTrained) cur.lastTrained = date;
    cur.sessions.add(date.toISOString().slice(0, 10));
    map.set(muscle.slug, cur);
  };

  for (const row of rows) {
    const working = row.sets.filter((s) => s.completed && s.type !== "W");
    if (working.length === 0) continue;
    const volume = working.reduce((acc, s) => acc + setVolume(s), 0);
    const date = row.session.startedAt;

    bump(row.exercise.primaryMuscle, working.length, volume, date, 1);
    // Les muscles secondaires comptent pour moitié : convention courante et
    // affichée telle quelle dans l'interface.
    for (const sec of row.exercise.secondaryMuscles) {
      bump(sec.muscleGroup, working.length, volume, date, 0.5);
    }
  }

  return [...map.values()]
    .map((m) => ({
      slug: m.slug,
      name: m.name,
      color: m.color,
      sets: Math.round(m.sets * 10) / 10,
      volume: Math.round(m.volume),
      lastTrained: m.lastTrained,
      frequency: m.sessions.size,
    }))
    .sort((a, b) => b.sets - a.sets);
}

/** Statistiques de la semaine en cours pour le tableau de bord. */
export async function getWeekSummary(userId: string) {
  const from = startOfWeek();
  const to = addDays(from, 7);

  const [sessions, planned] = await Promise.all([
    prisma.workoutSession.findMany({
      where: { userId, status: "completed", startedAt: { gte: from, lt: to } },
      select: { id: true, totalVolumeKg: true, totalSets: true, durationSeconds: true, startedAt: true },
    }),
    prisma.plannedWorkout.count({
      where: { userId, date: { gte: from, lt: to }, templateId: { not: null } },
    }),
  ]);

  return {
    sessionsDone: sessions.length,
    sessionsPlanned: planned,
    volume: sessions.reduce((a, s) => a + s.totalVolumeKg, 0),
    sets: sessions.reduce((a, s) => a + s.totalSets, 0),
    minutes: Math.round(sessions.reduce((a, s) => a + s.durationSeconds, 0) / 60),
  };
}

export async function getDaysSinceLastSession(userId: string) {
  const last = await prisma.workoutSession.findFirst({
    where: { userId, status: "completed" },
    orderBy: { startedAt: "desc" },
    select: { startedAt: true, name: true },
  });
  if (!last) return { days: null as number | null, name: null as string | null };
  const days = Math.round((startOfDay().getTime() - startOfDay(last.startedAt).getTime()) / 86400000);
  return { days, name: last.name };
}
