import Link from "next/link";
import { BookMarked, Plus } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/misc";
import { PageHeader } from "@/components/layout/page-header";
import { AddSavedMealButton } from "@/components/nutrition/add-saved-meal-button";
import { MacroSummary } from "@/components/nutrition/macro-bars";
import { macrosFor, mealLabel, sumMacros } from "@/components/nutrition/types";

export const dynamic = "force-dynamic";

export default async function RepasPage() {
  const user = await requireUser();

  const meals = await prisma.savedMeal.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    include: { items: { include: { food: true }, orderBy: { sortOrder: "asc" } } },
  });

  return (
    <>
      <PageHeader
        title="Repas enregistrés"
        back="/nutrition"
        action={
          <Link
            href="/nutrition/repas/nouveau"
            aria-label="Créer un repas"
            className="rounded-xl p-2 text-accent transition-colors hover:bg-surface-2"
          >
            <Plus className="h-5 w-5" />
          </Link>
        }
      />

      <div className="px-4 pb-8 pt-4">
        {meals.length === 0 ? (
          <EmptyState
            icon={<BookMarked className="h-6 w-6" />}
            title="Aucun repas enregistré"
            description="Enregistre un repas que tu prends souvent : tu le rajouteras ensuite en un seul geste."
            action={
              <Link href="/nutrition/repas/nouveau">
                <Button>
                  <Plus className="h-4 w-4" />
                  Créer un repas
                </Button>
              </Link>
            }
          />
        ) : (
          <ul className="space-y-3">
            {meals.map((meal) => {
              const totals = sumMacros(meal.items.map((i) => macrosFor(i.food, i.quantityGrams)));
              return (
                <li key={meal.id}>
                  <Card>
                    <Link href={`/nutrition/repas/${meal.id}`} className="block">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h2 className="truncate text-[0.95rem] font-semibold">{meal.name}</h2>
                          <p className="text-xs text-subtle">
                            {mealLabel(meal.defaultMealType)} · {meal.items.length} aliment
                            {meal.items.length > 1 ? "s" : ""}
                          </p>
                        </div>
                        <span className="tabular shrink-0 text-lg font-bold">
                          {Math.round(totals.kcal)}
                          <span className="ml-1 text-xs font-medium text-subtle">kcal</span>
                        </span>
                      </div>

                      {meal.description ? (
                        <p className="mt-2 line-clamp-2 text-sm text-muted">{meal.description}</p>
                      ) : null}

                      <MacroSummary macros={totals} showKcal={false} className="mt-2 block" />
                    </Link>

                    <div className="mt-3 flex gap-2">
                      <AddSavedMealButton
                        savedMealId={meal.id}
                        defaultMealType={meal.defaultMealType}
                        variant="primary"
                      />
                      <Link href={`/nutrition/repas/${meal.id}`}>
                        <Button variant="secondary">Modifier</Button>
                      </Link>
                    </div>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
}
