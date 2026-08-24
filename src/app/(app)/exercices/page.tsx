import Link from "next/link";
import { Plus } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/layout/page-header";
import { ExerciseLibrary } from "@/components/exercise/exercise-library";
import type { LibraryExercise } from "@/components/exercise/types";

export const dynamic = "force-dynamic";

/** Bibliothèque d'exercices (§6). */
export default async function ExercicesPage() {
  const user = await requireUser();

  const [exercises, favorites] = await Promise.all([
    prisma.exercise.findMany({
      where: { OR: [{ isCustom: false }, { userId: user.id }] },
      select: {
        id: true,
        name: true,
        category: true,
        equipment: true,
        difficulty: true,
        movementType: true,
        isCustom: true,
        primaryMuscle: { select: { name: true } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.exerciseFavorite.findMany({
      where: { userId: user.id },
      select: { exerciseId: true },
    }),
  ]);

  const favoriteIds = new Set(favorites.map((f) => f.exerciseId));

  const rows: LibraryExercise[] = exercises.map((e) => ({
    id: e.id,
    name: e.name,
    category: e.category,
    equipment: e.equipment,
    difficulty: e.difficulty,
    movementType: e.movementType,
    isCustom: e.isCustom,
    isFavorite: favoriteIds.has(e.id),
    primaryMuscle: e.primaryMuscle.name,
  }));

  return (
    <>
      <PageHeader
        title="Exercices"
        subtitle={`${rows.length} exercices disponibles`}
        action={
          <Link
            href="/exercices/nouveau"
            aria-label="Créer un exercice"
            className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent text-accent-contrast transition-transform active:scale-95"
          >
            <Plus className="h-5 w-5" />
          </Link>
        }
      />
      <ExerciseLibrary exercises={rows} />
    </>
  );
}
