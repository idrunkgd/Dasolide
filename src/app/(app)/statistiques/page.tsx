import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/layout/page-header";
import { StatisticsView } from "@/components/stats/statistics-view";
import { getMuscleVolume } from "@/server/queries/training";
import { getNutritionSeries, getActiveNutritionGoal } from "@/server/queries/nutrition";
import { getWeightData } from "@/server/queries/body";
import { consistencyScore } from "@/lib/calc";
import { addDays, startOfDay, startOfWeek } from "@/lib/utils";
import { PERIOD_FILTERS, type PeriodKey } from "@/lib/constants";

export const metadata: Metadata = { title: "Statistiques" };
export const dynamic = "force-dynamic";

export default async function StatisticsPage({
  searchParams,
}: {
  searchParams: Promise<{ p?: string }>;
}) {
  const { p } = await searchParams;
  const period = (p && p in PERIOD_FILTERS ? p : "3m") as PeriodKey;
  const days = PERIOD_FILTERS[period].days;

  const user = await requireUser();
  const to = addDays(startOfDay(), 1);
  const from = addDays(startOfDay(), -days);

  const [sessions, muscleVolume, nutritionSeries, nutritionGoal, weight, topExercises, records] =
    await Promise.all([
      prisma.workoutSession.findMany({
        where: { userId: user.id, status: "completed", startedAt: { gte: from, lt: to } },
        select: {
          id: true,
          name: true,
          startedAt: true,
          durationSeconds: true,
          totalVolumeKg: true,
          totalSets: true,
          totalReps: true,
          prCount: true,
          feltEnergy: true,
          sleepHours: true,
        },
        orderBy: { startedAt: "asc" },
      }),
      getMuscleVolume(user.id, from, to),
      getNutritionSeries(user.id, from, to),
      getActiveNutritionGoal(user.id),
      getWeightData(user.id, days),
      prisma.workoutExercise.groupBy({
        by: ["exerciseId"],
        where: { session: { userId: user.id, status: "completed", startedAt: { gte: from, lt: to } } },
        _count: { exerciseId: true },
        orderBy: { _count: { exerciseId: "desc" } },
        take: 10,
      }),
      prisma.personalRecord.count({ where: { userId: user.id, achievedAt: { gte: from } } }),
    ]);

  const exerciseNames = await prisma.exercise.findMany({
    where: { id: { in: topExercises.map((t) => t.exerciseId) } },
    select: { id: true, name: true, category: true },
  });
  const nameById = new Map(exerciseNames.map((e) => [e.id, e]));

  const plannedCount = await prisma.plannedWorkout.count({
    where: { userId: user.id, date: { gte: from, lt: to }, templateId: { not: null } },
  });

  const daysWithNutrition = nutritionSeries.filter((d) => d.kcal > 0).length;
  const daysWithWeight = weight.rows.length;
  const windowDays = Math.min(days, 365);

  const consistency = consistencyScore({
    plannedWorkouts: plannedCount,
    completedWorkouts: sessions.length,
    daysWithNutrition,
    daysWithWeight,
    windowDays,
  });

  // Volume hebdomadaire agrégé
  const weekly = new Map<string, { week: Date; volume: number; sessions: number; sets: number }>();
  for (const s of sessions) {
    const wk = startOfWeek(s.startedAt);
    const key = wk.toISOString();
    const cur = weekly.get(key) ?? { week: wk, volume: 0, sessions: 0, sets: 0 };
    cur.volume += s.totalVolumeKg;
    cur.sessions += 1;
    cur.sets += s.totalSets;
    weekly.set(key, cur);
  }

  return (
    <div>
      <PageHeader title="Statistiques" subtitle="Entraînement, progression et nutrition" back="/entrainement" />
      <StatisticsView
        period={period}
        unit={(user.settings?.weightUnit ?? "kg") as "kg" | "lb"}
        consistencyEnabled={user.settings?.consistencyEnabled ?? true}
        data={{
          sessions: sessions.map((s) => ({
            id: s.id,
            name: s.name,
            date: s.startedAt.toISOString(),
            durationSeconds: s.durationSeconds,
            volume: s.totalVolumeKg,
            sets: s.totalSets,
            reps: s.totalReps,
            prCount: s.prCount,
          })),
          weekly: [...weekly.values()]
            .sort((a, b) => a.week.getTime() - b.week.getTime())
            .map((w) => ({ week: w.week.toISOString(), volume: w.volume, sessions: w.sessions, sets: w.sets })),
          muscles: muscleVolume.map((m) => ({
            slug: m.slug,
            name: m.name,
            color: m.color,
            sets: m.sets,
            volume: m.volume,
            frequency: m.frequency,
          })),
          topExercises: topExercises.map((t) => ({
            id: t.exerciseId,
            name: nameById.get(t.exerciseId)?.name ?? "—",
            category: nameById.get(t.exerciseId)?.category ?? "",
            count: t._count.exerciseId,
          })),
          nutrition: nutritionSeries.map((d) => ({
            date: d.date.toISOString(),
            kcal: d.kcal,
            protein: d.protein,
            carbs: d.carbs,
            fat: d.fat,
          })),
          nutritionGoal: nutritionGoal
            ? { kcal: nutritionGoal.kcal, protein: nutritionGoal.protein, carbs: nutritionGoal.carbs, fat: nutritionGoal.fat }
            : null,
          weight: weight.points.map((w) => ({ date: w.date.toISOString(), weightKg: w.weightKg })),
          weightAvg7: weight.avg7.map((w) => ({ date: w.date.toISOString(), value: w.value })),
          trendPerWeek: weight.trendPerWeek,
          recordsCount: records,
          plannedCount,
          daysWithNutrition,
          daysWithWeight,
          windowDays,
          consistency,
        }}
      />
    </div>
  );
}
