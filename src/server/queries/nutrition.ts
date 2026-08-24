import "server-only";
import { prisma } from "@/lib/db";
import { startOfDay } from "@/lib/utils";

export type MacroTotals = { kcal: number; protein: number; carbs: number; fat: number; fiber: number };

export const EMPTY_TOTALS: MacroTotals = { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };

export function sumEntries(
  entries: { kcal: number; protein: number; carbs: number; fat: number; fiber: number }[]
): MacroTotals {
  return entries.reduce<MacroTotals>(
    (acc, e) => ({
      kcal: acc.kcal + e.kcal,
      protein: acc.protein + e.protein,
      carbs: acc.carbs + e.carbs,
      fat: acc.fat + e.fat,
      fiber: acc.fiber + e.fiber,
    }),
    { ...EMPTY_TOTALS }
  );
}

export async function getActiveNutritionGoal(userId: string) {
  const goal = await prisma.nutritionGoal.findFirst({
    where: { userId, isActive: true },
    orderBy: { activeFrom: "desc" },
  });
  return goal;
}

export async function getDayNutrition(userId: string, date: Date) {
  const day = startOfDay(date);
  const [entries, goal, dayRow] = await Promise.all([
    prisma.diaryEntry.findMany({
      where: { userId, date: day },
      orderBy: [{ mealType: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
      include: { food: { select: { id: true, name: true, brand: true, servingName: true, servingGrams: true } } },
    }),
    getActiveNutritionGoal(userId),
    prisma.nutritionDay.findUnique({ where: { userId_date: { userId, date: day } } }),
  ]);

  return { entries, goal, totals: sumEntries(entries), waterMl: dayRow?.waterMl ?? 0, note: dayRow?.note ?? null };
}

/** Totaux journaliers sur une période — utilisé par les statistiques. */
export async function getNutritionSeries(userId: string, from: Date, to: Date) {
  const entries = await prisma.diaryEntry.findMany({
    where: { userId, date: { gte: startOfDay(from), lte: startOfDay(to) } },
    select: { date: true, kcal: true, protein: true, carbs: true, fat: true, fiber: true },
  });

  const byDay = new Map<string, MacroTotals>();
  for (const e of entries) {
    const key = e.date.toISOString().slice(0, 10);
    const cur = byDay.get(key) ?? { ...EMPTY_TOTALS };
    cur.kcal += e.kcal;
    cur.protein += e.protein;
    cur.carbs += e.carbs;
    cur.fat += e.fat;
    cur.fiber += e.fiber;
    byDay.set(key, cur);
  }

  return [...byDay.entries()]
    .map(([key, totals]) => ({ date: new Date(key), ...totals }))
    .sort((a, b) => a.date.getTime() - b.date.getTime());
}
