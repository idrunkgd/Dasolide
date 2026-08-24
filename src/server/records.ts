import { prisma as defaultPrisma } from "@/lib/db";
import type { PrismaClient } from "@/generated/prisma/client";
import { estimate1RM } from "@/lib/calc";
import type { PrType } from "@/lib/constants";

export type DetectedRecord = {
  exerciseId: string;
  exerciseName: string;
  type: PrType;
  value: number;
  previousValue: number | null;
  weightKg: number | null;
  reps: number | null;
  setId: string | null;
};

/**
 * Détection des records personnels à la clôture d'une séance (§12).
 *
 * Les séries d'échauffement sont ignorées : un record ne peut pas venir
 * d'une série de mise en route (§50).
 */
export async function detectAndSaveRecords(
  userId: string,
  sessionId: string,
  /** Injectable pour le script de seed, qui utilise sa propre connexion. */
  client: Pick<PrismaClient, "workoutSession" | "personalRecord" | "workoutSet"> = defaultPrisma
): Promise<DetectedRecord[]> {
  const prisma = client;
  const session = await prisma.workoutSession.findFirst({
    where: { id: sessionId, userId },
    include: {
      exercises: {
        include: {
          exercise: { select: { id: true, name: true, trackingType: true } },
          sets: true,
        },
      },
    },
  });
  if (!session) return [];

  const exerciseIds = session.exercises.map((e) => e.exerciseId);
  const existing = await prisma.personalRecord.findMany({
    where: { userId, exerciseId: { in: exerciseIds } },
  });

  const bestBefore = new Map<string, number>();
  for (const r of existing) {
    // On ne compare qu'aux records ANTÉRIEURS à cette séance.
    if (r.sessionId === sessionId) continue;
    const key = `${r.exerciseId}:${r.type}`;
    if ((bestBefore.get(key) ?? 0) < r.value) bestBefore.set(key, r.value);
  }

  const detected: DetectedRecord[] = [];
  const prSetIds = new Set<string>();

  for (const we of session.exercises) {
    const working = we.sets.filter((s) => s.completed && s.type !== "W" && (s.reps ?? 0) > 0);
    if (working.length === 0) continue;

    const isBodyweightOnly = we.exercise.trackingType === "reps_only";

    let maxWeight = 0;
    let maxWeightReps: number | null = null;
    let maxWeightSetId: string | null = null;

    let maxReps = 0;
    let maxRepsSetId: string | null = null;

    let maxVolumeSet = 0;
    let maxVolumeSetId: string | null = null;

    let max1rm = 0;
    let max1rmSetId: string | null = null;
    let max1rmWeight: number | null = null;
    let max1rmReps: number | null = null;

    let sessionVolume = 0;

    for (const s of working) {
      const w = s.weightKg ?? 0;
      const r = s.reps ?? 0;
      const vol = w * r;
      sessionVolume += vol;

      if (w > maxWeight) {
        maxWeight = w;
        maxWeightReps = r;
        maxWeightSetId = s.id;
      }
      if (r > maxReps) {
        maxReps = r;
        maxRepsSetId = s.id;
      }
      if (vol > maxVolumeSet) {
        maxVolumeSet = vol;
        maxVolumeSetId = s.id;
      }
      const orm = estimate1RM(w, r);
      if (orm > max1rm) {
        max1rm = orm;
        max1rmSetId = s.id;
        max1rmWeight = w;
        max1rmReps = r;
      }
    }

    const candidates: {
      type: PrType;
      value: number;
      setId: string | null;
      weightKg: number | null;
      reps: number | null;
    }[] = [];

    if (!isBodyweightOnly && maxWeight > 0) {
      candidates.push({ type: "max_weight", value: maxWeight, setId: maxWeightSetId, weightKg: maxWeight, reps: maxWeightReps });
      candidates.push({ type: "max_volume_set", value: maxVolumeSet, setId: maxVolumeSetId, weightKg: null, reps: null });
      candidates.push({
        type: "estimated_1rm",
        value: Math.round(max1rm * 10) / 10,
        setId: max1rmSetId,
        weightKg: max1rmWeight,
        reps: max1rmReps,
      });
    }
    candidates.push({ type: "max_reps", value: maxReps, setId: maxRepsSetId, weightKg: null, reps: maxReps });
    candidates.push({ type: "max_volume_session", value: sessionVolume, setId: null, weightKg: null, reps: null });

    for (const c of candidates) {
      if (c.value <= 0) continue;
      const key = `${we.exerciseId}:${c.type}`;
      const previous = bestBefore.get(key) ?? null;
      // Marge de 0,01 pour absorber les arrondis flottants.
      if (previous !== null && c.value <= previous + 0.001) continue;

      detected.push({
        exerciseId: we.exerciseId,
        exerciseName: we.exercise.name,
        type: c.type,
        value: c.value,
        previousValue: previous,
        weightKg: c.weightKg,
        reps: c.reps,
        setId: c.setId,
      });
      if (c.setId) prSetIds.add(c.setId);
      bestBefore.set(key, c.value);
    }
  }

  if (detected.length > 0) {
    await prisma.personalRecord.createMany({
      data: detected.map((d) => ({
        userId,
        exerciseId: d.exerciseId,
        type: d.type,
        value: d.value,
        previousValue: d.previousValue,
        weightKg: d.weightKg,
        reps: d.reps,
        achievedAt: session.endedAt ?? session.startedAt,
        sessionId,
        setId: d.setId,
      })),
    });

    if (prSetIds.size > 0) {
      await prisma.workoutSet.updateMany({
        where: { id: { in: [...prSetIds] } },
        data: { isPr: true },
      });
    }
  }

  return detected;
}

/** Meilleurs records actuels, un par exercice et par type (§12). */
export async function getBestRecords(userId: string) {
  const records = await defaultPrisma.personalRecord.findMany({
    where: { userId },
    include: { exercise: { select: { id: true, name: true, category: true } } },
    orderBy: { achievedAt: "desc" },
  });

  const best = new Map<string, (typeof records)[number]>();
  for (const r of records) {
    const key = `${r.exerciseId}:${r.type}`;
    const cur = best.get(key);
    if (!cur || r.value > cur.value) best.set(key, r);
  }
  return [...best.values()];
}
