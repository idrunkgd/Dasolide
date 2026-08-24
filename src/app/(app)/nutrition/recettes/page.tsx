import Link from "next/link";
import { ChefHat, Plus } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/misc";
import { PageHeader } from "@/components/layout/page-header";
import { AddRecipePortionButton } from "@/components/nutrition/add-recipe-portion-button";
import { MacroSummary } from "@/components/nutrition/macro-bars";
import { macrosFor, scaleMacros, sumMacros } from "@/components/nutrition/types";

export const dynamic = "force-dynamic";

export default async function RecettesPage() {
  const user = await requireUser();

  const recipes = await prisma.recipe.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    include: { ingredients: { include: { food: true }, orderBy: { sortOrder: "asc" } } },
  });

  return (
    <>
      <PageHeader
        title="Recettes"
        back="/nutrition"
        action={
          <Link
            href="/nutrition/recettes/nouvelle"
            aria-label="Créer une recette"
            className="rounded-xl p-2 text-accent transition-colors hover:bg-surface-2"
          >
            <Plus className="h-5 w-5" />
          </Link>
        }
      />

      <div className="px-4 pb-8 pt-4">
        {recipes.length === 0 ? (
          <EmptyState
            icon={<ChefHat className="h-6 w-6" />}
            title="Aucune recette"
            description="Crée une recette une fois, puis ajoute simplement une portion à ton journal."
            action={
              <Link href="/nutrition/recettes/nouvelle">
                <Button>
                  <Plus className="h-4 w-4" />
                  Créer une recette
                </Button>
              </Link>
            }
          />
        ) : (
          <ul className="space-y-3">
            {recipes.map((recipe) => {
              const totals = sumMacros(recipe.ingredients.map((i) => macrosFor(i.food, i.quantityGrams)));
              const servings = Math.max(1, recipe.servings);
              const perServing = scaleMacros(totals, 1 / servings);
              return (
                <li key={recipe.id}>
                  <Card>
                    <Link href={`/nutrition/recettes/${recipe.id}`} className="block">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h2 className="truncate text-[0.95rem] font-semibold">{recipe.name}</h2>
                          <p className="text-xs text-subtle">
                            {servings} portion{servings > 1 ? "s" : ""} · {recipe.ingredients.length}{" "}
                            ingrédient{recipe.ingredients.length > 1 ? "s" : ""}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <span className="tabular text-lg font-bold">{Math.round(perServing.kcal)}</span>
                          <p className="text-[0.65rem] uppercase tracking-wide text-subtle">kcal / portion</p>
                        </div>
                      </div>

                      {recipe.description ? (
                        <p className="mt-2 line-clamp-2 text-sm text-muted">{recipe.description}</p>
                      ) : null}

                      <p className="mt-2 text-xs text-subtle">
                        Par portion : <MacroSummary macros={perServing} showKcal={false} className="inline" />
                        {" · "}
                        Total : {Math.round(totals.kcal)} kcal
                      </p>
                    </Link>

                    <div className="mt-3 flex gap-2">
                      <AddRecipePortionButton recipeId={recipe.id} perServing={perServing} />
                      <Link href={`/nutrition/recettes/${recipe.id}`}>
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
