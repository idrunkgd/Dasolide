"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/auth";
import {
  diaryEntrySchema,
  foodSchema,
  savedMealSchema,
  recipeSchema,
  nutritionGoalSchema,
  zodError,
  type ActionResult,
} from "@/lib/validation";
import { startOfDay } from "@/lib/utils";
import { foodMacros } from "@/lib/calc";
import { MEAL_TYPES } from "@/lib/constants";

/**
 * Actions du module Nutrition.
 *
 * Règle centrale : les macros d'une ligne de journal sont **figées** au moment
 * de l'ajout. Corriger une fiche aliment six mois plus tard ne doit jamais
 * réécrire l'historique déjà encodé (§23).
 *
 * Règle de sécurité : toute lecture/écriture d'une donnée utilisateur est
 * filtrée par `userId` — jamais `where: { id }` seul (§54).
 */

// ---------------------------------------------------------------------------
// Utilitaires internes
// ---------------------------------------------------------------------------

type Macros = { kcal: number; protein: number; carbs: number; fat: number; fiber: number };

const EMPTY: Macros = { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };

const round1 = (n: number) => Math.round(n * 10) / 10;

function roundMacros(m: Macros): Macros {
  return {
    kcal: round1(m.kcal),
    protein: round1(m.protein),
    carbs: round1(m.carbs),
    fat: round1(m.fat),
    fiber: round1(m.fiber),
  };
}

function addMacros(a: Macros, b: Macros): Macros {
  return {
    kcal: a.kcal + b.kcal,
    protein: a.protein + b.protein,
    carbs: a.carbs + b.carbs,
    fat: a.fat + b.fat,
    fiber: a.fiber + b.fiber,
  };
}

function scaleMacros(m: Macros, factor: number): Macros {
  return {
    kcal: m.kcal * factor,
    protein: m.protein * factor,
    carbs: m.carbs * factor,
    fat: m.fat * factor,
    fiber: m.fiber * factor,
  };
}

/** Un aliment est utilisable s'il vient de la bibliothèque ou de l'utilisateur. */
function foodScope(userId: string) {
  return { OR: [{ isCustom: false }, { userId }] };
}

async function findFoodForUser(userId: string, foodId: string) {
  return prisma.food.findFirst({ where: { AND: [{ id: foodId }, foodScope(userId)] } });
}

type IngredientRow = {
  quantityGrams: number;
  food: { kcal100: number; protein100: number; carbs100: number; fat100: number; fiber100: number | null };
};

/** Totaux d'une recette + valeurs par portion. */
function recipeTotals(recipe: { servings: number; ingredients: IngredientRow[] }) {
  let total: Macros = { ...EMPTY };
  let grams = 0;
  for (const ing of recipe.ingredients) {
    total = addMacros(total, foodMacros(ing.food, ing.quantityGrams));
    grams += ing.quantityGrams;
  }
  const servings = Math.max(1, recipe.servings);
  return { total, grams, servings, perServing: scaleMacros(total, 1 / servings), gramsPerServing: grams / servings };
}

async function findRecipeForUser(userId: string, recipeId: string) {
  return prisma.recipe.findFirst({
    where: { id: recipeId, userId },
    include: { ingredients: { include: { food: true }, orderBy: { sortOrder: "asc" } } },
  });
}

/** Vérifie que tous les aliments référencés sont accessibles à l'utilisateur. */
async function assertFoodsAccessible(userId: string, foodIds: string[]): Promise<boolean> {
  const unique = [...new Set(foodIds)];
  if (unique.length === 0) return true;
  const count = await prisma.food.count({ where: { AND: [{ id: { in: unique } }, foodScope(userId)] } });
  return count === unique.length;
}

function revalidateDiary() {
  revalidatePath("/nutrition");
  revalidatePath("/");
}

/** Position de la prochaine ligne dans un repas donné. */
async function nextSortOrder(userId: string, date: Date, mealType: string): Promise<number> {
  const last = await prisma.diaryEntry.findFirst({
    where: { userId, date, mealType },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });
  return (last?.sortOrder ?? -1) + 1;
}

// ---------------------------------------------------------------------------
// Journal alimentaire
// ---------------------------------------------------------------------------

/**
 * Ajoute un aliment (par grammes) ou une recette (par portions) au journal.
 * Les macros sont calculées ici puis stockées telles quelles.
 */
export async function addDiaryEntryAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const userId = await requireUserId();
  const parsed = diaryEntrySchema.safeParse(input);
  if (!parsed.success) return zodError(parsed.error);

  const d = parsed.data;
  const date = startOfDay(d.date);

  if (!d.foodId && !d.recipeId) return { ok: false, error: "Choisis un aliment ou une recette." };
  if (d.foodId && d.recipeId) return { ok: false, error: "Un aliment ou une recette, pas les deux." };

  let label = "";
  let macros: Macros;
  let quantityGrams = 0;
  let servings: number | null = null;

  if (d.foodId) {
    const grams = d.quantityGrams;
    if (!grams || grams <= 0) return { ok: false, error: "Indique une quantité en grammes." };
    const food = await findFoodForUser(userId, d.foodId);
    if (!food) return { ok: false, error: "Aliment introuvable." };
    label = food.brand ? `${food.name} (${food.brand})` : food.name;
    macros = foodMacros(food, grams);
    quantityGrams = grams;
  } else {
    const portions = d.servings ?? 1;
    if (portions <= 0) return { ok: false, error: "Indique un nombre de portions." };
    const recipe = await findRecipeForUser(userId, d.recipeId!);
    if (!recipe) return { ok: false, error: "Recette introuvable." };
    const t = recipeTotals(recipe);
    label = recipe.name;
    macros = scaleMacros(t.perServing, portions);
    quantityGrams = round1(t.gramsPerServing * portions);
    servings = portions;
  }

  const entry = await prisma.diaryEntry.create({
    data: {
      userId,
      date,
      mealType: d.mealType,
      foodId: d.foodId ?? null,
      recipeId: d.recipeId ?? null,
      label,
      quantityGrams,
      servings,
      ...roundMacros(macros),
      sortOrder: await nextSortOrder(userId, date, d.mealType),
    },
    select: { id: true },
  });

  revalidateDiary();
  return { ok: true, data: { id: entry.id } };
}

/**
 * Modifie la quantité d'une ligne existante et recalcule ses macros.
 * `quantity` est en grammes pour un aliment, en portions pour une recette.
 */
export async function updateDiaryEntryAction(id: string, quantity: number): Promise<ActionResult> {
  const userId = await requireUserId();
  const value = Number(quantity);
  if (!Number.isFinite(value) || value <= 0) return { ok: false, error: "Quantité invalide." };
  if (value > 10000) return { ok: false, error: "Quantité trop élevée." };

  const entry = await prisma.diaryEntry.findFirst({ where: { id, userId } });
  if (!entry) return { ok: false, error: "Ligne introuvable." };

  let macros: Macros;
  let quantityGrams = entry.quantityGrams;
  let servings = entry.servings;

  if (entry.recipeId) {
    if (value > 50) return { ok: false, error: "Nombre de portions trop élevé." };
    const recipe = await findRecipeForUser(userId, entry.recipeId);
    if (recipe) {
      const t = recipeTotals(recipe);
      macros = scaleMacros(t.perServing, value);
      quantityGrams = round1(t.gramsPerServing * value);
    } else {
      // Recette supprimée : on met à l'échelle le snapshot conservé.
      const base = entry.servings && entry.servings > 0 ? entry.servings : 1;
      macros = scaleMacros(entry, value / base);
      quantityGrams = round1((entry.quantityGrams / base) * value);
    }
    servings = value;
  } else {
    const food = entry.foodId ? await findFoodForUser(userId, entry.foodId) : null;
    if (food) {
      macros = foodMacros(food, value);
    } else {
      const base = entry.quantityGrams > 0 ? entry.quantityGrams : 100;
      macros = scaleMacros(entry, value / base);
    }
    quantityGrams = value;
  }

  await prisma.diaryEntry.updateMany({
    where: { id, userId },
    data: { quantityGrams, servings, ...roundMacros(macros) },
  });

  revalidateDiary();
  return { ok: true };
}

export async function deleteDiaryEntryAction(id: string): Promise<ActionResult> {
  const userId = await requireUserId();
  await prisma.diaryEntry.deleteMany({ where: { id, userId } });
  revalidateDiary();
  return { ok: true };
}

/** Ajoute d'un coup toutes les lignes d'un repas enregistré (§24). */
export async function addSavedMealToDayAction(
  savedMealId: string,
  date: string,
  mealType: string
): Promise<ActionResult<{ count: number }>> {
  const userId = await requireUserId();
  if (!(mealType in MEAL_TYPES)) return { ok: false, error: "Type de repas inconnu." };

  const meal = await prisma.savedMeal.findFirst({
    where: { id: savedMealId, userId },
    include: { items: { include: { food: true }, orderBy: { sortOrder: "asc" } } },
  });
  if (!meal) return { ok: false, error: "Repas introuvable." };
  if (meal.items.length === 0) return { ok: false, error: "Ce repas ne contient aucun aliment." };

  const day = startOfDay(date);
  let sortOrder = await nextSortOrder(userId, day, mealType);

  await prisma.diaryEntry.createMany({
    data: meal.items.map((item) => ({
      userId,
      date: day,
      mealType,
      foodId: item.foodId,
      label: item.food.brand ? `${item.food.name} (${item.food.brand})` : item.food.name,
      quantityGrams: item.quantityGrams,
      ...roundMacros(foodMacros(item.food, item.quantityGrams)),
      sortOrder: sortOrder++,
    })),
  });

  revalidateDiary();
  return { ok: true, data: { count: meal.items.length } };
}

/** Duplique toutes les lignes d'une journée vers une autre (fonction très utilisée). */
export async function copyDayAction(fromDate: string, toDate: string): Promise<ActionResult<{ count: number }>> {
  const userId = await requireUserId();
  const from = startOfDay(fromDate);
  const to = startOfDay(toDate);
  if (from.getTime() === to.getTime()) return { ok: false, error: "Choisis deux journées différentes." };

  const entries = await prisma.diaryEntry.findMany({
    where: { userId, date: from },
    orderBy: [{ mealType: "asc" }, { sortOrder: "asc" }],
  });
  if (entries.length === 0) return { ok: false, error: "Cette journée est vide." };

  const offsets = new Map<string, number>();
  for (const mealType of Object.keys(MEAL_TYPES)) {
    offsets.set(mealType, await nextSortOrder(userId, to, mealType));
  }

  await prisma.diaryEntry.createMany({
    data: entries.map((e) => {
      const base = offsets.get(e.mealType) ?? 0;
      offsets.set(e.mealType, base + 1);
      return {
        userId,
        date: to,
        mealType: e.mealType,
        foodId: e.foodId,
        recipeId: e.recipeId,
        label: e.label,
        quantityGrams: e.quantityGrams,
        servings: e.servings,
        kcal: e.kcal,
        protein: e.protein,
        carbs: e.carbs,
        fat: e.fat,
        fiber: e.fiber,
        sortOrder: base,
      };
    }),
  });

  revalidateDiary();
  return { ok: true, data: { count: entries.length } };
}

// ---------------------------------------------------------------------------
// Aliments personnalisés
// ---------------------------------------------------------------------------

function foodData(d: {
  name: string;
  brand?: string | null;
  category: string;
  servingName?: string | null;
  servingGrams?: number | null;
  kcal100: number;
  protein100: number;
  carbs100: number;
  fat100: number;
  fiber100?: number | null;
  sugar100?: number | null;
  salt100?: number | null;
}) {
  return {
    name: d.name,
    brand: d.brand || null,
    category: d.category,
    servingName: d.servingName || null,
    servingGrams: d.servingGrams ?? null,
    kcal100: d.kcal100,
    protein100: d.protein100,
    carbs100: d.carbs100,
    fat100: d.fat100,
    fiber100: d.fiber100 ?? null,
    sugar100: d.sugar100 ?? null,
    salt100: d.salt100 ?? null,
  };
}

export async function createFoodAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const userId = await requireUserId();
  const parsed = foodSchema.safeParse(input);
  if (!parsed.success) return zodError(parsed.error);

  const food = await prisma.food.create({
    data: { ...foodData(parsed.data), isCustom: true, userId },
    select: { id: true },
  });

  revalidatePath("/nutrition");
  revalidatePath("/nutrition/recherche");
  return { ok: true, data: { id: food.id } };
}

export async function updateFoodAction(id: string, input: unknown): Promise<ActionResult> {
  const userId = await requireUserId();
  const parsed = foodSchema.safeParse(input);
  if (!parsed.success) return zodError(parsed.error);

  const res = await prisma.food.updateMany({
    where: { id, userId, isCustom: true },
    data: foodData(parsed.data),
  });
  if (res.count === 0) return { ok: false, error: "Aliment introuvable ou non modifiable." };

  revalidatePath("/nutrition");
  revalidatePath(`/nutrition/aliments/${id}`);
  return { ok: true };
}

export async function deleteFoodAction(id: string): Promise<ActionResult> {
  const userId = await requireUserId();
  const res = await prisma.food.deleteMany({ where: { id, userId, isCustom: true } });
  if (res.count === 0) return { ok: false, error: "Aliment introuvable ou non supprimable." };

  revalidatePath("/nutrition");
  revalidatePath("/nutrition/recherche");
  return { ok: true };
}

export async function toggleFoodFavoriteAction(foodId: string): Promise<ActionResult<{ isFavorite: boolean }>> {
  const userId = await requireUserId();
  const food = await findFoodForUser(userId, foodId);
  if (!food) return { ok: false, error: "Aliment introuvable." };

  const existing = await prisma.foodFavorite.findUnique({ where: { userId_foodId: { userId, foodId } } });
  if (existing) {
    await prisma.foodFavorite.delete({ where: { userId_foodId: { userId, foodId } } });
  } else {
    await prisma.foodFavorite.create({ data: { userId, foodId } });
  }

  revalidatePath(`/nutrition/aliments/${foodId}`);
  return { ok: true, data: { isFavorite: !existing } };
}

// ---------------------------------------------------------------------------
// Repas enregistrés
// ---------------------------------------------------------------------------

export async function saveSavedMealAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const userId = await requireUserId();
  const parsed = savedMealSchema.safeParse(input);
  if (!parsed.success) return zodError(parsed.error);

  const d = parsed.data;
  if (!(await assertFoodsAccessible(userId, d.items.map((i) => i.foodId)))) {
    return { ok: false, error: "Un des aliments est introuvable." };
  }

  const items = d.items.map((item, index) => ({
    foodId: item.foodId,
    quantityGrams: item.quantityGrams,
    sortOrder: index,
  }));

  let id = d.id;
  if (id) {
    const existing = await prisma.savedMeal.findFirst({ where: { id, userId }, select: { id: true } });
    if (!existing) return { ok: false, error: "Repas introuvable." };
    await prisma.savedMeal.update({
      where: { id },
      data: {
        name: d.name,
        description: d.description || null,
        defaultMealType: d.defaultMealType,
        items: { deleteMany: {}, create: items },
      },
    });
  } else {
    const created = await prisma.savedMeal.create({
      data: {
        userId,
        name: d.name,
        description: d.description || null,
        defaultMealType: d.defaultMealType,
        items: { create: items },
      },
      select: { id: true },
    });
    id = created.id;
  }

  revalidatePath("/nutrition/repas");
  revalidatePath(`/nutrition/repas/${id}`);
  return { ok: true, data: { id } };
}

export async function deleteSavedMealAction(id: string): Promise<ActionResult> {
  const userId = await requireUserId();
  const res = await prisma.savedMeal.deleteMany({ where: { id, userId } });
  if (res.count === 0) return { ok: false, error: "Repas introuvable." };
  revalidatePath("/nutrition/repas");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Recettes
// ---------------------------------------------------------------------------

export async function saveRecipeAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const userId = await requireUserId();
  const parsed = recipeSchema.safeParse(input);
  if (!parsed.success) return zodError(parsed.error);

  const d = parsed.data;
  if (!(await assertFoodsAccessible(userId, d.ingredients.map((i) => i.foodId)))) {
    return { ok: false, error: "Un des ingrédients est introuvable." };
  }

  const ingredients = d.ingredients.map((ing, index) => ({
    foodId: ing.foodId,
    quantityGrams: ing.quantityGrams,
    sortOrder: index,
  }));

  let id = d.id;
  if (id) {
    const existing = await prisma.recipe.findFirst({ where: { id, userId }, select: { id: true } });
    if (!existing) return { ok: false, error: "Recette introuvable." };
    await prisma.recipe.update({
      where: { id },
      data: {
        name: d.name,
        description: d.description || null,
        instructions: d.instructions || null,
        servings: d.servings,
        ingredients: { deleteMany: {}, create: ingredients },
      },
    });
  } else {
    const created = await prisma.recipe.create({
      data: {
        userId,
        name: d.name,
        description: d.description || null,
        instructions: d.instructions || null,
        servings: d.servings,
        ingredients: { create: ingredients },
      },
      select: { id: true },
    });
    id = created.id;
  }

  revalidatePath("/nutrition/recettes");
  revalidatePath(`/nutrition/recettes/${id}`);
  return { ok: true, data: { id } };
}

export async function deleteRecipeAction(id: string): Promise<ActionResult> {
  const userId = await requireUserId();
  const res = await prisma.recipe.deleteMany({ where: { id, userId } });
  if (res.count === 0) return { ok: false, error: "Recette introuvable." };
  revalidatePath("/nutrition/recettes");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Objectifs & eau
// ---------------------------------------------------------------------------

/**
 * Enregistre un nouvel objectif nutritionnel.
 * L'ancien est désactivé mais **conservé** : les statistiques passées
 * continuent d'être comparées à l'objectif qui avait cours à l'époque (§53).
 */
export async function saveNutritionGoalAction(input: unknown): Promise<ActionResult> {
  const userId = await requireUserId();
  const parsed = nutritionGoalSchema.safeParse(input);
  if (!parsed.success) return zodError(parsed.error);

  const d = parsed.data;
  await prisma.$transaction([
    prisma.nutritionGoal.updateMany({ where: { userId, isActive: true }, data: { isActive: false } }),
    prisma.nutritionGoal.create({
      data: {
        userId,
        kcal: Math.round(d.kcal),
        protein: Math.round(d.protein),
        carbs: Math.round(d.carbs),
        fat: Math.round(d.fat),
        fiber: d.fiber == null ? null : Math.round(d.fiber),
        waterMl: d.waterMl == null ? null : Math.round(d.waterMl),
        source: d.source,
        isActive: true,
      },
    }),
  ]);

  revalidatePath("/nutrition");
  revalidatePath("/nutrition/objectifs");
  revalidatePath("/");
  return { ok: true };
}

/** Suivi de l'hydratation — une seule ligne par jour. */
export async function setWaterAction(date: string, ml: number): Promise<ActionResult> {
  const userId = await requireUserId();
  const value = Number(ml);
  if (!Number.isFinite(value) || value < 0 || value > 20000) {
    return { ok: false, error: "Volume d'eau invalide." };
  }
  const day = startOfDay(date);
  const waterMl = Math.round(value);

  await prisma.nutritionDay.upsert({
    where: { userId_date: { userId, date: day } },
    create: { userId, date: day, waterMl },
    update: { waterMl },
  });

  revalidatePath("/nutrition");
  return { ok: true };
}
