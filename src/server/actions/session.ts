"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/auth";
import {
  finishSessionSchema,
  sessionSyncSchema,
  zodError,
  type ActionResult,
} from "@/lib/validation";
import { detectAndSaveRecords, type DetectedRecord } from "@/server/records";
import { startOfDay } from "@/lib/utils";

/**
 * Démarre une séance.
 *
 * Une seule séance peut être en cours à la fois : si une autre traîne, on la
 * reprend plutôt que d'en créer une seconde (§40).
 */
export async function startSessionAction(templateId?: string | null): Promise<never> {
  const userId = await requireUserId();

  const existing = await prisma.workoutSession.findFirst({
    where: { userId, status: "in_progress" },
    orderBy: { startedAt: "desc" },
  });
  if (existing) redirect(`/seance/${existing.id}`);

  let name = "Séance libre";
  let programId: string | null = null;
  let exercisesData: {
    exerciseId: string;
    sortOrder: number;
    restSeconds: number;
    supersetGroup: string | null;
    targetRepsMin: number | null;
    targetRepsMax: number | null;
    targetRpe: number | null;
    sets: { setNumber: number; type: string; weightKg: number | null; reps: number | null }[];
  }[] = [];

  if (templateId) {
    const template = await prisma.workoutTemplate.findFirst({
      where: { id: templateId, program: { userId } },
      include: {
        program: true,
        exercises: { orderBy: { sortOrder: "asc" }, include: { exercise: true } },
      },
    });
    if (!template) redirect("/entrainement");

    name = template.name;
    programId = template.programId;

    // Préremplissage avec la dernière performance (§31)
    const exerciseIds = template.exercises.map((e) => e.exerciseId);
    const previous = await prisma.workoutExercise.findMany({
      where: { exerciseId: { in: exerciseIds }, session: { userId, status: "completed" } },
      include: { sets: { orderBy: { setNumber: "asc" } }, session: { select: { startedAt: true } } },
      orderBy: { session: { startedAt: "desc" } },
    });
    const lastByExercise = new Map<string, (typeof previous)[number]>();
    for (const p of previous) {
      if (!lastByExercise.has(p.exerciseId)) lastByExercise.set(p.exerciseId, p);
    }

    exercisesData = template.exercises.map((te, i) => {
      const last = lastByExercise.get(te.exerciseId);
      const lastSets = last?.sets.filter((s) => s.completed) ?? [];

      const sets = Array.from({ length: te.sets }, (_, idx) => {
        const ref = lastSets.filter((s) => s.type !== "W")[idx];
        return {
          setNumber: idx + 1,
          type: "N",
          weightKg: te.targetWeight ?? ref?.weightKg ?? null,
          reps: null as number | null,
        };
      });

      return {
        exerciseId: te.exerciseId,
        sortOrder: i,
        restSeconds: te.restSeconds,
        supersetGroup: te.supersetGroup,
        targetRepsMin: te.targetRepsMin,
        targetRepsMax: te.targetRepsMax,
        targetRpe: te.targetRpe,
        sets,
      };
    });
  }

  const session = await prisma.workoutSession.create({
    data: {
      userId,
      name,
      programId,
      templateId: templateId ?? null,
      status: "in_progress",
      startedAt: new Date(),
      exercises: {
        create: exercisesData.map((e) => ({
          exerciseId: e.exerciseId,
          sortOrder: e.sortOrder,
          restSeconds: e.restSeconds,
          supersetGroup: e.supersetGroup,
          targetRepsMin: e.targetRepsMin,
          targetRepsMax: e.targetRepsMax,
          targetRpe: e.targetRpe,
          sets: { create: e.sets },
        })),
      },
    },
  });

  redirect(`/seance/${session.id}`);
}

/**
 * Sauvegarde l'état complet de la séance.
 *
 * Le client est la source de vérité pendant la séance (il fonctionne hors
 * ligne) : on remplace donc intégralement les exercices et les séries.
 * L'opération est idempotente, ce qui rend les renvois sans risque.
 */
export async function syncSessionAction(input: unknown): Promise<ActionResult<{ ids: Record<string, string> }>> {
  const userId = await requireUserId();
  const parsed = sessionSyncSchema.safeParse(input);
  if (!parsed.success) return zodError(parsed.error);

  const { sessionId, exercises, durationSeconds } = parsed.data;

  const session = await prisma.workoutSession.findFirst({
    where: { id: sessionId, userId },
    include: { exercises: { select: { id: true } } },
  });
  if (!session) return { ok: false, error: "Séance introuvable." };
  if (session.status !== "in_progress") return { ok: false, error: "Cette séance est déjà terminée." };

  const known = new Set(session.exercises.map((e) => e.id));
  const keep = new Set(exercises.map((e) => e.id).filter((id) => known.has(id)));

  // Exercices retirés pendant la séance
  const toDelete = [...known].filter((id) => !keep.has(id));
  if (toDelete.length > 0) {
    await prisma.workoutExercise.deleteMany({ where: { id: { in: toDelete } } });
  }

  const idMap: Record<string, string> = {};

  for (const ex of exercises) {
    const payload = {
      exerciseId: ex.exerciseId,
      sortOrder: ex.sortOrder,
      restSeconds: ex.restSeconds,
      supersetGroup: ex.supersetGroup ?? null,
      notes: ex.notes ?? null,
    };

    let workoutExerciseId = ex.id;

    if (known.has(ex.id)) {
      await prisma.workoutExercise.update({ where: { id: ex.id }, data: payload });
      await prisma.workoutSet.deleteMany({ where: { workoutExerciseId: ex.id } });
    } else {
      const created = await prisma.workoutExercise.create({
        data: { ...payload, sessionId },
      });
      workoutExerciseId = created.id;
      idMap[ex.id] = created.id;
    }

    if (ex.sets.length > 0) {
      await prisma.workoutSet.createMany({
        data: ex.sets.map((s) => ({
          workoutExerciseId,
          setNumber: s.setNumber,
          type: s.type,
          weightKg: s.weightKg ?? null,
          reps: s.reps ?? null,
          rpe: s.rpe ?? null,
          rir: s.rir ?? null,
          durationSec: s.durationSec ?? null,
          distanceM: s.distanceM ?? null,
          avgHr: s.avgHr ?? null,
          calories: s.calories ?? null,
          completed: s.completed,
          completedAt: s.completed ? new Date() : null,
          notes: s.notes ?? null,
        })),
      });
    }
  }

  await prisma.workoutSession.update({
    where: { id: sessionId },
    data: { durationSeconds },
  });

  return { ok: true, data: { ids: idMap } };
}

export type SessionSummary = {
  sessionId: string;
  name: string;
  durationSeconds: number;
  totalVolumeKg: number;
  totalSets: number;
  totalReps: number;
  records: DetectedRecord[];
  muscles: string[];
  previousVolume: number | null;
};

/** Clôture définitive : totaux, records, planning. */
export async function finishSessionAction(input: unknown): Promise<ActionResult<SessionSummary>> {
  const userId = await requireUserId();
  const parsed = finishSessionSchema.safeParse(input);
  if (!parsed.success) return zodError(parsed.error);

  const d = parsed.data;
  const session = await prisma.workoutSession.findFirst({
    where: { id: d.sessionId, userId },
    include: {
      exercises: {
        include: { exercise: { select: { category: true } }, sets: true },
      },
    },
  });
  if (!session) return { ok: false, error: "Séance introuvable." };

  const allSets = session.exercises.flatMap((e) => e.sets);
  const workingSets = allSets.filter((s) => s.completed && s.type !== "W");

  if (workingSets.length === 0) {
    return { ok: false, error: "Aucune série validée : impossible d'enregistrer la séance." };
  }

  const totalVolumeKg = workingSets.reduce((a, s) => a + (s.weightKg ?? 0) * (s.reps ?? 0), 0);
  const totalSets = workingSets.length;
  const totalReps = workingSets.reduce((a, s) => a + (s.reps ?? 0), 0);

  // Séance précédente du même modèle, pour la comparaison de volume (§30)
  const previous = await prisma.workoutSession.findFirst({
    where: {
      userId,
      status: "completed",
      id: { not: session.id },
      ...(session.templateId ? { templateId: session.templateId } : { name: session.name }),
    },
    orderBy: { startedAt: "desc" },
    select: { totalVolumeKg: true },
  });

  // Les séries non validées ne sont pas conservées : la séance reflète ce qui
  // a réellement été fait.
  await prisma.workoutSet.deleteMany({
    where: { workoutExercise: { sessionId: session.id }, completed: false },
  });
  await prisma.workoutExercise.deleteMany({
    where: { sessionId: session.id, sets: { none: {} } },
  });

  const endedAt = new Date();
  await prisma.workoutSession.update({
    where: { id: session.id },
    data: {
      status: "completed",
      endedAt,
      durationSeconds: d.durationSeconds,
      totalVolumeKg,
      totalSets,
      totalReps,
      notes: d.notes ?? null,
      feltEnergy: d.feltEnergy ?? null,
      feltMotivation: d.feltMotivation ?? null,
      sleepHours: d.sleepHours ?? null,
      stressLevel: d.stressLevel ?? null,
      soreness: d.soreness ?? null,
      feedback: d.feedback ?? null,
    },
  });

  const records = await detectAndSaveRecords(userId, session.id);
  if (records.length > 0) {
    await prisma.workoutSession.update({
      where: { id: session.id },
      data: { prCount: records.length },
    });
  }

  // Marquer la journée comme réalisée dans le planning
  const today = startOfDay();
  const planned = await prisma.plannedWorkout.findFirst({
    where: { userId, date: today },
  });
  if (planned) {
    await prisma.plannedWorkout.update({
      where: { id: planned.id },
      data: { status: "completed", sessionId: session.id },
    });
  } else {
    await prisma.plannedWorkout.create({
      data: {
        userId,
        date: today,
        programId: session.programId,
        templateId: session.templateId,
        sessionId: session.id,
        status: "completed",
      },
    });
  }

  revalidatePath("/", "layout");

  return {
    ok: true,
    data: {
      sessionId: session.id,
      name: session.name,
      durationSeconds: d.durationSeconds,
      totalVolumeKg,
      totalSets,
      totalReps,
      records,
      muscles: [...new Set(session.exercises.map((e) => e.exercise.category))],
      previousVolume: previous?.totalVolumeKg ?? null,
    },
  };
}

export async function cancelSessionAction(sessionId: string): Promise<ActionResult> {
  const userId = await requireUserId();
  const session = await prisma.workoutSession.findFirst({ where: { id: sessionId, userId } });
  if (!session) return { ok: false, error: "Séance introuvable." };

  // Une séance abandonnée est supprimée : elle ne doit pas polluer l'historique.
  await prisma.workoutSession.delete({ where: { id: sessionId } });
  revalidatePath("/", "layout");
  return { ok: true };
}

/** Note permanente attachée à un exercice (§33). */
export async function saveExerciseNoteAction(exerciseId: string, content: string): Promise<ActionResult> {
  const userId = await requireUserId();
  const trimmed = content.trim();

  if (!trimmed) {
    await prisma.exerciseNote.deleteMany({ where: { userId, exerciseId } });
    return { ok: true };
  }

  await prisma.exerciseNote.upsert({
    where: { userId_exerciseId: { userId, exerciseId } },
    create: { userId, exerciseId, content: trimmed.slice(0, 1000) },
    update: { content: trimmed.slice(0, 1000) },
  });
  return { ok: true };
}

/** Alternatives pertinentes lorsqu'une machine est occupée (§49). */
export async function findAlternativesAction(exerciseId: string) {
  await requireUserId();
  const exercise = await prisma.exercise.findUnique({
    where: { id: exerciseId },
    select: { id: true, primaryMuscleId: true, category: true, movementType: true },
  });
  if (!exercise) return [];

  const alternatives = await prisma.exercise.findMany({
    where: {
      id: { not: exerciseId },
      OR: [{ primaryMuscleId: exercise.primaryMuscleId }, { category: exercise.category }],
      isCustom: false,
    },
    select: {
      id: true,
      name: true,
      equipment: true,
      category: true,
      movementType: true,
      trackingType: true,
      primaryMuscleId: true,
      primaryMuscle: { select: { name: true } },
    },
    take: 60,
  });

  // Les exercices ciblant exactement le même muscle et le même type de
  // mouvement remontent en premier.
  return alternatives
    .map((a) => ({
      ...a,
      score:
        (a.primaryMuscleId === exercise.primaryMuscleId ? 2 : 0) +
        (a.movementType === exercise.movementType ? 1 : 0),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 24);
}
