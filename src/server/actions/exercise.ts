"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/auth";
import { exerciseSchema, zodError, type ActionResult } from "@/lib/validation";
import { slugify } from "@/lib/utils";

/**
 * Actions de la bibliothèque d'exercices (§6, §11).
 *
 * Règle de sécurité : un utilisateur ne voit que les exercices de la
 * bibliothèque commune (`isCustom: false`) et les siens. Il ne peut modifier
 * ou supprimer QUE ses propres exercices (§54).
 */

/** Génère un slug libre : « dev-couche » → « dev-couche-2 » en cas de collision. */
async function uniqueSlug(name: string, exceptId?: string): Promise<string> {
  const base = slugify(name) || "exercice";
  let candidate = base;
  for (let i = 2; i < 200; i++) {
    const existing = await prisma.exercise.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!existing || existing.id === exceptId) return candidate;
    candidate = `${base}-${i}`;
  }
  return `${base}-${Date.now()}`;
}

type MuscleResolution =
  | { ok: true; primaryMuscleId: string; secondaryIds: string[] }
  | { ok: false; error: string };

async function resolveMuscles(primarySlug: string, secondarySlugs: string[]): Promise<MuscleResolution> {
  const primary = await prisma.muscleGroup.findUnique({
    where: { slug: primarySlug },
    select: { id: true },
  });
  if (!primary) return { ok: false, error: "Muscle principal inconnu." };

  const uniqueSecondary = [...new Set(secondarySlugs)].filter((s) => s && s !== primarySlug);
  const secondary = uniqueSecondary.length
    ? await prisma.muscleGroup.findMany({
        where: { slug: { in: uniqueSecondary } },
        select: { id: true },
      })
    : [];

  return { ok: true, primaryMuscleId: primary.id, secondaryIds: secondary.map((m) => m.id) };
}

function cleanUrl(value: string | null | undefined): string | null {
  const v = (value ?? "").trim();
  return v.length > 0 ? v : null;
}

function revalidateExercises(id?: string) {
  revalidatePath("/exercices");
  if (id) revalidatePath(`/exercices/${id}`);
}

// ---------------------------------------------------------------------------
// Création
// ---------------------------------------------------------------------------

export async function createExerciseAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const userId = await requireUserId();
  const parsed = exerciseSchema.safeParse(input);
  if (!parsed.success) return zodError(parsed.error);
  const d = parsed.data;

  const muscles = await resolveMuscles(d.primaryMuscleSlug, d.secondaryMuscleSlugs);
  if (!muscles.ok) return { ok: false, error: muscles.error };

  const created = await prisma.exercise.create({
    data: {
      slug: await uniqueSlug(d.name),
      name: d.name,
      description: d.description || null,
      instructions: d.instructions || null,
      primaryMuscleId: muscles.primaryMuscleId,
      category: d.category,
      equipment: d.equipment,
      movementType: d.movementType,
      difficulty: d.difficulty,
      trackingType: d.trackingType,
      isCardio: d.category === "cardio" || d.movementType === "cardio",
      isUnilateral: d.isUnilateral,
      videoUrl: cleanUrl(d.videoUrl),
      isCustom: true,
      userId,
      secondaryMuscles: {
        create: muscles.secondaryIds.map((muscleGroupId) => ({ muscleGroupId })),
      },
    },
    select: { id: true },
  });

  revalidateExercises(created.id);
  return { ok: true, data: { id: created.id } };
}

// ---------------------------------------------------------------------------
// Modification
// ---------------------------------------------------------------------------

export async function updateExerciseAction(
  id: string,
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  const userId = await requireUserId();
  const parsed = exerciseSchema.safeParse(input);
  if (!parsed.success) return zodError(parsed.error);
  const d = parsed.data;

  const existing = await prisma.exercise.findFirst({
    where: { id, userId, isCustom: true },
    select: { id: true, name: true, slug: true },
  });
  if (!existing) {
    return {
      ok: false,
      error: "Seuls tes exercices personnalisés peuvent être modifiés.",
    };
  }

  const muscles = await resolveMuscles(d.primaryMuscleSlug, d.secondaryMuscleSlugs);
  if (!muscles.ok) return { ok: false, error: muscles.error };

  const slug = existing.name === d.name ? existing.slug : await uniqueSlug(d.name, existing.id);

  await prisma.exerciseSecondaryMuscle.deleteMany({ where: { exerciseId: existing.id } });

  await prisma.exercise.update({
    where: { id: existing.id },
    data: {
      slug,
      name: d.name,
      description: d.description || null,
      instructions: d.instructions || null,
      primaryMuscleId: muscles.primaryMuscleId,
      category: d.category,
      equipment: d.equipment,
      movementType: d.movementType,
      difficulty: d.difficulty,
      trackingType: d.trackingType,
      isCardio: d.category === "cardio" || d.movementType === "cardio",
      isUnilateral: d.isUnilateral,
      videoUrl: cleanUrl(d.videoUrl),
      secondaryMuscles: {
        create: muscles.secondaryIds.map((muscleGroupId) => ({ muscleGroupId })),
      },
    },
  });

  revalidateExercises(existing.id);
  return { ok: true, data: { id: existing.id } };
}

// ---------------------------------------------------------------------------
// Suppression
// ---------------------------------------------------------------------------

/**
 * Suppression d'un exercice personnalisé.
 *
 * Un exercice déjà réalisé ou planifié n'est jamais supprimé : cela effacerait
 * l'historique correspondant. On explique alors comment l'archiver.
 */
export async function deleteExerciseAction(id: string): Promise<ActionResult> {
  const userId = await requireUserId();

  const exercise = await prisma.exercise.findFirst({
    where: { id, userId, isCustom: true },
    select: { id: true, name: true },
  });
  if (!exercise) {
    return { ok: false, error: "Seuls tes exercices personnalisés peuvent être supprimés." };
  }

  const [usedInSessions, usedInPrograms] = await Promise.all([
    prisma.workoutExercise.count({
      where: { exerciseId: exercise.id, session: { userId } },
    }),
    prisma.workoutTemplateExercise.count({
      where: { exerciseId: exercise.id, template: { program: { userId } } },
    }),
  ]);

  if (usedInSessions > 0 || usedInPrograms > 0) {
    const parts: string[] = [];
    if (usedInSessions > 0) parts.push(`${usedInSessions} séance${usedInSessions > 1 ? "s" : ""}`);
    if (usedInPrograms > 0) parts.push(`${usedInPrograms} programme${usedInPrograms > 1 ? "s" : ""}`);
    return {
      ok: false,
      error:
        `« ${exercise.name} » est utilisé dans ${parts.join(" et ")} : le supprimer effacerait ` +
        `l'historique correspondant. Archive-le plutôt — retire-le de tes programmes et de tes ` +
        `favoris, et renomme-le « ${exercise.name} (archivé) » pour ne plus le voir proposé.`,
    };
  }

  await prisma.exercise.delete({ where: { id: exercise.id } });
  revalidateExercises();
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Favoris
// ---------------------------------------------------------------------------

export async function toggleExerciseFavoriteAction(
  id: string
): Promise<ActionResult<{ isFavorite: boolean }>> {
  const userId = await requireUserId();

  const exercise = await prisma.exercise.findFirst({
    where: { AND: [{ id }, { OR: [{ isCustom: false }, { userId }] }] },
    select: { id: true },
  });
  if (!exercise) return { ok: false, error: "Exercice introuvable." };

  const existing = await prisma.exerciseFavorite.findUnique({
    where: { userId_exerciseId: { userId, exerciseId: exercise.id } },
    select: { exerciseId: true },
  });

  if (existing) {
    await prisma.exerciseFavorite.delete({
      where: { userId_exerciseId: { userId, exerciseId: exercise.id } },
    });
    revalidateExercises(exercise.id);
    return { ok: true, data: { isFavorite: false } };
  }

  await prisma.exerciseFavorite.create({ data: { userId, exerciseId: exercise.id } });
  revalidateExercises(exercise.id);
  return { ok: true, data: { isFavorite: true } };
}
