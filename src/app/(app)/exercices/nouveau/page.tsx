import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/layout/page-header";
import { EMPTY_EXERCISE, ExerciseForm } from "@/components/exercise/exercise-form";
import type { MuscleOption } from "@/components/exercise/types";

export const dynamic = "force-dynamic";

/** Création d'un exercice personnalisé (§6). */
export default async function NouvelExercicePage() {
  await requireUser();

  const muscles = await prisma.muscleGroup.findMany({
    orderBy: { sortOrder: "asc" },
    select: { slug: true, name: true, color: true, bodyPart: true },
  });

  return (
    <>
      <PageHeader title="Nouvel exercice" subtitle="Visible par toi seul" back="/exercices" />
      <ExerciseForm initial={EMPTY_EXERCISE} muscles={muscles as MuscleOption[]} />
    </>
  );
}
