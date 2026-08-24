import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { computeExerciseStats, getExerciseHistory } from "@/server/queries/training";
import { PageHeader } from "@/components/layout/page-header";
import { FavoriteButton } from "@/components/exercise/favorite-button";
import { ExerciseActions } from "@/components/exercise/exercise-actions";
import { ExerciseDetail } from "@/components/exercise/exercise-detail";
import type { ExerciseInfoData } from "@/components/exercise/exercise-info";
import type { ExerciseStatsDTO, HistoryEntry } from "@/components/exercise/types";
import { CATEGORIES } from "@/lib/constants";

export const dynamic = "force-dynamic";

/** Fiche exercice (§11). */
export default async function ExercicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const unit = (user.settings?.weightUnit ?? "kg") as "kg" | "lb";

  const exercise = await prisma.exercise.findFirst({
    where: {
      AND: [{ OR: [{ id }, { slug: id }] }, { OR: [{ isCustom: false }, { userId: user.id }] }],
    },
    select: {
      id: true,
      name: true,
      description: true,
      instructions: true,
      category: true,
      equipment: true,
      movementType: true,
      difficulty: true,
      trackingType: true,
      isUnilateral: true,
      videoUrl: true,
      isCustom: true,
      userId: true,
      primaryMuscle: { select: { name: true, color: true } },
      secondaryMuscles: {
        select: { muscleGroup: { select: { name: true, color: true, sortOrder: true } } },
      },
    },
  });
  if (!exercise) notFound();

  const [note, favorite, history] = await Promise.all([
    prisma.exerciseNote.findUnique({
      where: { userId_exerciseId: { userId: user.id, exerciseId: exercise.id } },
      select: { content: true },
    }),
    prisma.exerciseFavorite.findUnique({
      where: { userId_exerciseId: { userId: user.id, exerciseId: exercise.id } },
      select: { exerciseId: true },
    }),
    getExerciseHistory(user.id, exercise.id),
  ]);

  const computed = computeExerciseStats(history);

  const stats: ExerciseStatsDTO = {
    bestWeight: computed.bestWeight,
    bestReps: computed.bestReps,
    bestVolumeSet: computed.bestVolumeSet,
    best1rm: computed.best1rm,
    totalSets: computed.totalSets,
    totalVolume: computed.totalVolume,
    sessionCount: computed.sessionCount,
    series: computed.series.map((p) => ({
      t: p.date.getTime(),
      weight: p.weight,
      reps: p.reps,
      volume: p.volume,
      oneRm: p.oneRm,
    })),
  };

  const historyDto: HistoryEntry[] = history
    .filter((entry) => entry.sets.length > 0)
    .map((entry) => ({
      sessionId: entry.sessionId,
      date: entry.date.toISOString(),
      sets: entry.sets.map((s) => ({
        id: s.id,
        setNumber: s.setNumber,
        type: s.type,
        weightKg: s.weightKg,
        reps: s.reps,
        rpe: s.rpe,
        durationSec: s.durationSec,
        isPr: s.isPr,
      })),
    }));

  const info: ExerciseInfoData = {
    id: exercise.id,
    name: exercise.name,
    description: exercise.description,
    instructions: exercise.instructions,
    category: exercise.category,
    equipment: exercise.equipment,
    movementType: exercise.movementType,
    difficulty: exercise.difficulty,
    trackingType: exercise.trackingType,
    isUnilateral: exercise.isUnilateral,
    videoUrl: exercise.videoUrl,
    isCustom: exercise.isCustom,
    primaryMuscle: exercise.primaryMuscle,
    secondaryMuscles: exercise.secondaryMuscles
      .map((s) => s.muscleGroup)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((m) => ({ name: m.name, color: m.color })),
  };

  const isOwner = exercise.isCustom && exercise.userId === user.id;

  return (
    <>
      <PageHeader
        title={exercise.name}
        subtitle={`${CATEGORIES[exercise.category as keyof typeof CATEGORIES] ?? exercise.category} · ${exercise.primaryMuscle.name}`}
        back="/exercices"
        action={<FavoriteButton exerciseId={exercise.id} initial={Boolean(favorite)} />}
      />

      {isOwner ? (
        <div className="px-4 pt-4">
          <ExerciseActions exerciseId={exercise.id} name={exercise.name} />
        </div>
      ) : null}

      <ExerciseDetail
        exercise={info}
        note={note?.content ?? null}
        stats={stats}
        history={historyDto}
        unit={unit}
      />
    </>
  );
}
