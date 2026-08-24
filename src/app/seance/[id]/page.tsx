import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getLastPerformance } from "@/server/queries/training";
import { ActiveSession } from "@/components/session/active-session";
import type { SessionExerciseState } from "@/components/session/types";
import { suggestNextLoad, defaultIncrement } from "@/lib/progression";

export const metadata: Metadata = { title: "Séance" };
export const dynamic = "force-dynamic";

export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();

  const session = await prisma.workoutSession.findFirst({
    where: { id, userId: user.id },
    include: {
      exercises: {
        orderBy: { sortOrder: "asc" },
        include: {
          sets: { orderBy: { setNumber: "asc" } },
          exercise: {
            select: {
              id: true,
              name: true,
              category: true,
              equipment: true,
              trackingType: true,
              isUnilateral: true,
              primaryMuscle: { select: { name: true } },
            },
          },
        },
      },
    },
  });

  if (!session) notFound();
  if (session.status === "completed") redirect(`/seance/${id}/resume`);

  const exerciseIds = session.exercises.map((e) => e.exerciseId);

  const [lastPerf, notes, historyRows] = await Promise.all([
    getLastPerformance(user.id, exerciseIds),
    prisma.exerciseNote.findMany({
      where: { userId: user.id, exerciseId: { in: exerciseIds } },
      select: { exerciseId: true, content: true },
    }),
    // Deux dernières séances par exercice : de quoi calculer la suggestion de charge.
    prisma.workoutExercise.findMany({
      where: {
        exerciseId: { in: exerciseIds },
        session: { userId: user.id, status: "completed" },
      },
      include: { sets: true, session: { select: { startedAt: true } } },
      orderBy: { session: { startedAt: "desc" } },
      take: 120,
    }),
  ]);

  const noteByExercise = new Map(notes.map((n) => [n.exerciseId, n.content]));

  const historyByExercise = new Map<string, { weightKg: number | null; reps: number | null; type: string; completed: boolean }[][]>();
  for (const row of historyRows) {
    const list = historyByExercise.get(row.exerciseId) ?? [];
    if (list.length >= 3) continue;
    list.push(row.sets.map((s) => ({ weightKg: s.weightKg, reps: s.reps, type: s.type, completed: s.completed })));
    historyByExercise.set(row.exerciseId, list);
  }

  const settings = user.settings;

  const exercises: SessionExerciseState[] = session.exercises.map((we) => {
    const last = lastPerf.get(we.exerciseId) ?? null;
    const increment = defaultIncrement(
      we.exercise.category,
      settings?.upperIncrementKg ?? 2.5,
      settings?.lowerIncrementKg ?? 5
    );
    const suggestion =
      settings?.autoProgressionEnabled !== false
        ? suggestNextLoad({
            targetRepsMin: we.targetRepsMin ?? 8,
            targetRepsMax: we.targetRepsMax ?? 12,
            incrementKg: increment,
            history: historyByExercise.get(we.exerciseId) ?? [],
          })
        : null;

    return {
      id: we.id,
      exerciseId: we.exerciseId,
      name: we.exercise.name,
      category: we.exercise.category,
      equipment: we.exercise.equipment,
      trackingType: we.exercise.trackingType,
      primaryMuscle: we.exercise.primaryMuscle.name,
      sortOrder: we.sortOrder,
      restSeconds: we.restSeconds,
      supersetGroup: we.supersetGroup,
      notes: we.notes,
      permanentNote: noteByExercise.get(we.exerciseId) ?? null,
      targetRepsMin: we.targetRepsMin,
      targetRepsMax: we.targetRepsMax,
      targetRpe: we.targetRpe,
      increment,
      suggestion,
      lastPerformance: last
        ? {
            date: last.date.toISOString(),
            sets: last.sets.map((s) => ({
              type: s.type,
              weightKg: s.weightKg,
              reps: s.reps,
              rpe: s.rpe,
              durationSec: s.durationSec,
              distanceM: s.distanceM,
            })),
          }
        : null,
      sets: we.sets.map((s) => ({
        id: s.id,
        setNumber: s.setNumber,
        type: s.type as SessionExerciseState["sets"][number]["type"],
        weightKg: s.weightKg,
        reps: s.reps,
        rpe: s.rpe,
        rir: s.rir,
        durationSec: s.durationSec,
        distanceM: s.distanceM,
        avgHr: s.avgHr,
        calories: s.calories,
        completed: s.completed,
        notes: s.notes,
      })),
    };
  });

  return (
    <ActiveSession
      sessionId={session.id}
      name={session.name}
      startedAt={session.startedAt.toISOString()}
      initialDuration={session.durationSeconds}
      initialExercises={exercises}
      settings={{
        weightUnit: (settings?.weightUnit ?? "kg") as "kg" | "lb",
        defaultRestSeconds: settings?.defaultRestSeconds ?? 120,
        autoStartRestTimer: settings?.autoStartRestTimer ?? true,
        restTimerVibrate: settings?.restTimerVibrate ?? true,
        restTimerSound: settings?.restTimerSound ?? true,
        keepScreenAwake: settings?.keepScreenAwake ?? true,
        showRpe: settings?.showRpe ?? true,
        showRir: settings?.showRir ?? false,
      }}
    />
  );
}
