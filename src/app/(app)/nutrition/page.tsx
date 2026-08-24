import { Suspense } from "react";
import Link from "next/link";
import { BookMarked, ChefHat, SlidersHorizontal, Utensils } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getActiveNutritionGoal, sumEntries } from "@/server/queries/nutrition";
import { Card, SectionTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/misc";
import { PageHeader } from "@/components/layout/page-header";
import { MacroRing } from "@/components/nutrition/macro-ring";
import { MacroBars } from "@/components/nutrition/macro-bars";
import { DateNav } from "@/components/nutrition/date-nav";
import { WaterTracker } from "@/components/nutrition/water-tracker";
import { DiaryMeals } from "@/components/nutrition/diary-meals";
import type { DiaryEntryView } from "@/components/nutrition/meal-section";
import { CopyDayButton } from "@/components/nutrition/copy-day-sheet";
import { dateKey, parseDateKey, startOfDay } from "@/lib/utils";

export const dynamic = "force-dynamic";

const FOOD_MACRO_SELECT = {
  servingName: true,
  servingGrams: true,
  kcal100: true,
  protein100: true,
  carbs100: true,
  fat100: true,
  fiber100: true,
} as const;

export default async function NutritionPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date } = await searchParams;
  const day = /^\d{4}-\d{2}-\d{2}$/.test(date ?? "") ? (date as string) : dateKey(new Date());

  return (
    <>
      <PageHeader
        title="Alimentation"
        action={
          <Link
            href="/nutrition/objectifs"
            aria-label="Objectifs nutritionnels"
            className="rounded-xl p-2 text-muted transition-colors hover:bg-surface-2 hover:text-text"
          >
            <SlidersHorizontal className="h-5 w-5" />
          </Link>
        }
      />

      <div className="px-4 pt-4">
        <DateNav day={day} />

        {/* La journée est chargée à part : la navigation par date reste instantanée. */}
        <Suspense key={day} fallback={<DaySkeleton />}>
          <DayContent day={day} />
        </Suspense>

        <SectionTitle className="mt-6">Bibliothèque</SectionTitle>
        <div className="mb-6 grid grid-cols-3 gap-2">
          <QuickLink href="/nutrition/repas" icon={<BookMarked className="h-5 w-5" />} label="Repas" />
          <QuickLink href="/nutrition/recettes" icon={<ChefHat className="h-5 w-5" />} label="Recettes" />
          <QuickLink
            href="/nutrition/aliments/nouveau"
            icon={<Utensils className="h-5 w-5" />}
            label="Nouvel aliment"
          />
        </div>
      </div>
    </>
  );
}

async function DayContent({ day }: { day: string }) {
  const user = await requireUser();
  const dayDate = startOfDay(parseDateKey(day));

  const [rows, goal, dayRow] = await Promise.all([
    prisma.diaryEntry.findMany({
      where: { userId: user.id, date: dayDate },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      include: { food: { select: FOOD_MACRO_SELECT } },
    }),
    getActiveNutritionGoal(user.id),
    prisma.nutritionDay.findUnique({ where: { userId_date: { userId: user.id, date: dayDate } } }),
  ]);

  const entries: DiaryEntryView[] = rows.map((e) => ({
    id: e.id,
    mealType: e.mealType,
    label: e.label,
    quantityGrams: e.quantityGrams,
    servings: e.servings,
    kcal: e.kcal,
    protein: e.protein,
    carbs: e.carbs,
    fat: e.fat,
    fiber: e.fiber,
    isRecipe: e.recipeId != null,
    food: e.food,
  }));

  const totals = sumEntries(rows);
  const remaining = goal ? Math.round(goal.kcal - totals.kcal) : 0;

  return (
    <>
      {/* ------------------------------------------------------------- Résumé */}
      <Card className="mb-5">
        {goal ? (
          <>
            <div className="flex items-center gap-4">
              <MacroRing value={totals.kcal} max={goal.kcal} />
              <div className="min-w-0 flex-1">
                <p className="tabular text-2xl font-bold leading-none">
                  {Math.round(totals.kcal)}
                  <span className="text-base font-medium text-subtle"> / {Math.round(goal.kcal)} kcal</span>
                </p>
                <p className="mt-1.5 text-sm text-muted">
                  {remaining >= 0
                    ? `${remaining} kcal restantes`
                    : `${Math.abs(remaining)} kcal au-dessus de l'objectif`}
                </p>
              </div>
            </div>

            <MacroBars className="mt-4" totals={totals} goal={goal} />
          </>
        ) : (
          <div className="py-2 text-center">
            <p className="tabular text-2xl font-bold">{Math.round(totals.kcal)} kcal</p>
            <p className="mt-1 text-sm text-muted">
              Aucun objectif défini : impossible d&apos;afficher les calories restantes.
            </p>
            <Link href="/nutrition/objectifs" className="mt-3 inline-block">
              <Button size="sm">Définir mes objectifs</Button>
            </Link>
          </div>
        )}
      </Card>

      <WaterTracker day={day} initialMl={dayRow?.waterMl ?? 0} targetMl={goal?.waterMl ?? null} />

      {/* -------------------------------------------------------------- Repas */}
      <SectionTitle>Repas de la journée</SectionTitle>
      <DiaryMeals day={day} entries={entries} />

      <div className="mt-5">
        <CopyDayButton day={day} />
      </div>
    </>
  );
}

function DaySkeleton() {
  return (
    <div aria-busy="true">
      <Skeleton className="mb-5 h-52 w-full" />
      <Skeleton className="mb-5 h-40 w-full" />
      <Skeleton className="mb-2.5 h-4 w-40" />
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-[4.5rem] w-full" />
        ))}
      </div>
    </div>
  );
}

function QuickLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      href={href}
      className="card flex min-h-[5.5rem] flex-col items-center justify-center gap-2 p-3 text-center transition-colors hover:border-border-strong"
    >
      <span className="text-accent">{icon}</span>
      <span className="text-xs font-medium leading-tight">{label}</span>
    </Link>
  );
}
