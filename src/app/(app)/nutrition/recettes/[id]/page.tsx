import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/layout/page-header";
import { RecipeForm } from "@/components/nutrition/recipe-form";
import { AddRecipePortionButton } from "@/components/nutrition/add-recipe-portion-button";
import { macrosFor, scaleMacros, sumMacros } from "@/components/nutrition/types";
import type { EditableItem } from "@/components/nutrition/ingredient-editor";

export const dynamic = "force-dynamic";

export default async function RecetteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;

  const recipe = await prisma.recipe.findFirst({
    where: { id, userId: user.id },
    include: { ingredients: { include: { food: true }, orderBy: { sortOrder: "asc" } } },
  });
  if (!recipe) notFound();

  const servings = Math.max(1, recipe.servings);
  const totals = sumMacros(recipe.ingredients.map((i) => macrosFor(i.food, i.quantityGrams)));
  const perServing = scaleMacros(totals, 1 / servings);

  const ingredients: EditableItem[] = recipe.ingredients.map((ing) => ({
    key: ing.id,
    quantityGrams: ing.quantityGrams,
    food: {
      id: ing.food.id,
      name: ing.food.name,
      brand: ing.food.brand,
      servingName: ing.food.servingName,
      servingGrams: ing.food.servingGrams,
      kcal100: ing.food.kcal100,
      protein100: ing.food.protein100,
      carbs100: ing.food.carbs100,
      fat100: ing.food.fat100,
      fiber100: ing.food.fiber100,
    },
  }));

  return (
    <>
      <PageHeader
        title={recipe.name}
        subtitle={`${Math.round(perServing.kcal)} kcal par portion`}
        back="/nutrition/recettes"
        action={
          <AddRecipePortionButton
            recipeId={recipe.id}
            perServing={perServing}
            label="Journal"
            size="sm"
          />
        }
      />
      <RecipeForm
        initial={{
          id: recipe.id,
          name: recipe.name,
          description: recipe.description ?? "",
          instructions: recipe.instructions ?? "",
          servings,
          ingredients,
        }}
      />
    </>
  );
}
