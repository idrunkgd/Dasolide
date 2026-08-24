import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { normalizeSearch } from "@/lib/utils";

/**
 * Recherche d'aliments — utilisée par le sélecteur du journal alimentaire.
 *
 * Renvoie la bibliothèque publique **plus** les aliments personnalisés de
 * l'utilisateur courant, jamais ceux d'un autre compte (§54).
 *
 * Paramètres :
 *   q          — texte libre, insensible aux accents et à la casse
 *   category   — clé de FOOD_CATEGORIES
 *   favorites=1 — uniquement les favoris
 *   recent=1   — uniquement les aliments récemment encodés
 *   custom=1   — uniquement « mes aliments »
 *   take       — nombre maximum de résultats (60 par défaut, 200 max)
 */

export type FoodResult = {
  id: string;
  name: string;
  brand: string | null;
  category: string;
  servingName: string | null;
  servingGrams: number | null;
  kcal100: number;
  protein100: number;
  carbs100: number;
  fat100: number;
  fiber100: number | null;
  isCustom: boolean;
  isFavorite: boolean;
  isRecent: boolean;
};

const SELECT = {
  id: true,
  name: true,
  brand: true,
  category: true,
  servingName: true,
  servingGrams: true,
  kcal100: true,
  protein100: true,
  carbs100: true,
  fat100: true,
  fiber100: true,
  isCustom: true,
} as const;

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const userId = session.userId;

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const category = searchParams.get("category") || undefined;
  const favoritesOnly = searchParams.get("favorites") === "1";
  const recentOnly = searchParams.get("recent") === "1";
  const customOnly = searchParams.get("custom") === "1";
  const take = Math.min(Math.max(Number(searchParams.get("take") ?? 60) || 60, 1), 200);

  // Favoris et derniers aliments encodés : ils remontent toujours en tête.
  const [favorites, lastEntries] = await Promise.all([
    prisma.foodFavorite.findMany({ where: { userId }, select: { foodId: true } }),
    prisma.diaryEntry.findMany({
      where: { userId, foodId: { not: null } },
      orderBy: { createdAt: "desc" },
      select: { foodId: true },
      take: 300,
    }),
  ]);

  const favoriteIds = new Set(favorites.map((f) => f.foodId));

  const recentIds: string[] = [];
  const seen = new Set<string>();
  for (const e of lastEntries) {
    if (!e.foodId || seen.has(e.foodId)) continue;
    seen.add(e.foodId);
    recentIds.push(e.foodId);
    if (recentIds.length >= 40) break;
  }
  const recentRank = new Map(recentIds.map((id, i) => [id, i]));

  if (favoritesOnly && favoriteIds.size === 0) return NextResponse.json({ foods: [] });
  if (recentOnly && recentIds.length === 0) return NextResponse.json({ foods: [] });

  const foods = await prisma.food.findMany({
    where: {
      AND: [
        { OR: [{ isCustom: false }, { userId }] },
        category ? { category } : {},
        favoritesOnly ? { id: { in: [...favoriteIds] } } : {},
        recentOnly ? { id: { in: recentIds } } : {},
        customOnly ? { isCustom: true, userId } : {},
      ],
    },
    select: SELECT,
    orderBy: { name: "asc" },
    // Le filtrage accentué se fait en mémoire : on élargit la fenêtre si besoin.
    take: q ? 1000 : 600,
  });

  const needle = normalizeSearch(q);
  const matched = needle
    ? foods.filter((f) => {
        const haystack = normalizeSearch(`${f.name} ${f.brand ?? ""}`);
        return haystack.includes(needle);
      })
    : foods;

  const decorated: FoodResult[] = matched.map((f) => ({
    ...f,
    isFavorite: favoriteIds.has(f.id),
    isRecent: recentRank.has(f.id),
  }));

  decorated.sort((a, b) => {
    if (needle) {
      const aStarts = normalizeSearch(a.name).startsWith(needle) ? 0 : 1;
      const bStarts = normalizeSearch(b.name).startsWith(needle) ? 0 : 1;
      if (aStarts !== bStarts) return aStarts - bStarts;
    }
    if (recentOnly) {
      return (recentRank.get(a.id) ?? 999) - (recentRank.get(b.id) ?? 999);
    }
    // Favoris puis récents puis ordre alphabétique.
    const aFav = a.isFavorite ? 0 : 1;
    const bFav = b.isFavorite ? 0 : 1;
    if (aFav !== bFav) return aFav - bFav;
    const aRec = recentRank.get(a.id) ?? 999;
    const bRec = recentRank.get(b.id) ?? 999;
    if (aRec !== bRec) return aRec - bRec;
    return a.name.localeCompare(b.name, "fr");
  });

  return NextResponse.json({ foods: decorated.slice(0, take) });
}
