import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { normalizeSearch } from "@/lib/utils";

/**
 * Recherche d'exercices — utilisée par le sélecteur du mode séance et par le
 * constructeur de programme.
 *
 * Les exercices personnalisés d'un utilisateur ne sont jamais visibles par un
 * autre (§54).
 */
export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const category = searchParams.get("category") ?? undefined;
  const equipment = searchParams.get("equipment") ?? undefined;
  const muscleId = searchParams.get("muscle") ?? undefined;
  const favoritesOnly = searchParams.get("favorites") === "1";
  const take = Math.min(Number(searchParams.get("take") ?? 60), 200);

  const favorites = await prisma.exerciseFavorite.findMany({
    where: { userId: session.userId },
    select: { exerciseId: true },
  });
  const favoriteIds = new Set(favorites.map((f) => f.exerciseId));

  const exercises = await prisma.exercise.findMany({
    where: {
      AND: [
        { OR: [{ isCustom: false }, { userId: session.userId }] },
        category ? { category } : {},
        equipment ? { equipment } : {},
        muscleId ? { primaryMuscleId: muscleId } : {},
        favoritesOnly ? { id: { in: [...favoriteIds] } } : {},
      ],
    },
    select: {
      id: true,
      name: true,
      category: true,
      equipment: true,
      trackingType: true,
      difficulty: true,
      isCustom: true,
      primaryMuscle: { select: { name: true, slug: true } },
    },
    orderBy: { name: "asc" },
    take: q ? 400 : take,
  });

  const needle = normalizeSearch(q);
  const filtered = needle
    ? exercises
        .filter((e) => normalizeSearch(e.name).includes(needle))
        .sort((a, b) => {
          const aStarts = normalizeSearch(a.name).startsWith(needle) ? 0 : 1;
          const bStarts = normalizeSearch(b.name).startsWith(needle) ? 0 : 1;
          return aStarts - bStarts || a.name.localeCompare(b.name);
        })
        .slice(0, take)
    : exercises;

  return NextResponse.json({
    exercises: filtered.map((e) => ({
      id: e.id,
      name: e.name,
      category: e.category,
      equipment: e.equipment,
      trackingType: e.trackingType,
      difficulty: e.difficulty,
      isCustom: e.isCustom,
      primaryMuscle: e.primaryMuscle.name,
      isFavorite: favoriteIds.has(e.id),
    })),
  });
}
