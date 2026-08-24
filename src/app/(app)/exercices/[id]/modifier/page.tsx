import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/layout/page-header";
import { ExerciseForm, type ExerciseFormValues } from "@/components/exercise/exercise-form";
import type { MuscleOption } from "@/components/exercise/types";

export const dynamic = "force-dynamic";

/** Modification d'un exercice personnalisé — réservée à son auteur (§54). */
export default async function ModifierExercicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();

  const [exercise, muscles] = await Promise.all([
    prisma.exercise.findFirst({
      where: { id, userId: user.id, isCustom: true },
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
        primaryMuscle: { select: { slug: true } },
        secondaryMuscles: { select: { muscleGroup: { select: { slug: true } } } },
      },
    }),
    prisma.muscleGroup.findMany({
      orderBy: { sortOrder: "asc" },
      select: { slug: true, name: true, color: true, bodyPart: true },
    }),
  ]);

  if (!exercise) notFound();

  const initial: ExerciseFormValues = {
    id: exercise.id,
    name: exercise.name,
    description: exercise.description ?? "",
    instructions: exercise.instructions ?? "",
    category: exercise.category,
    primaryMuscleSlug: exercise.primaryMuscle.slug,
    secondaryMuscleSlugs: exercise.secondaryMuscles.map((s) => s.muscleGroup.slug),
    equipment: exercise.equipment,
    movementType: exercise.movementType,
    difficulty: exercise.difficulty,
    trackingType: exercise.trackingType,
    isUnilateral: exercise.isUnilateral,
    videoUrl: exercise.videoUrl ?? "",
  };

  return (
    <>
      <PageHeader
        title="Modifier l'exercice"
        subtitle={exercise.name}
        back={`/exercices/${exercise.id}`}
      />
      <ExerciseForm initial={initial} muscles={muscles as MuscleOption[]} />
    </>
  );
}
