import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/layout/page-header";
import { SavedMealForm } from "@/components/nutrition/saved-meal-form";
import { AddSavedMealButton } from "@/components/nutrition/add-saved-meal-button";
import type { EditableItem } from "@/components/nutrition/ingredient-editor";

export const dynamic = "force-dynamic";

export default async function RepasDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;

  const meal = await prisma.savedMeal.findFirst({
    where: { id, userId: user.id },
    include: { items: { include: { food: true }, orderBy: { sortOrder: "asc" } } },
  });
  if (!meal) notFound();

  const items: EditableItem[] = meal.items.map((item) => ({
    key: item.id,
    quantityGrams: item.quantityGrams,
    food: {
      id: item.food.id,
      name: item.food.name,
      brand: item.food.brand,
      servingName: item.food.servingName,
      servingGrams: item.food.servingGrams,
      kcal100: item.food.kcal100,
      protein100: item.food.protein100,
      carbs100: item.food.carbs100,
      fat100: item.food.fat100,
      fiber100: item.food.fiber100,
    },
  }));

  return (
    <>
      <PageHeader
        title={meal.name}
        subtitle="Repas enregistré"
        back="/nutrition/repas"
        action={
          <AddSavedMealButton
            savedMealId={meal.id}
            defaultMealType={meal.defaultMealType}
            label="Journal"
            size="sm"
          />
        }
      />
      <SavedMealForm
        initial={{
          id: meal.id,
          name: meal.name,
          description: meal.description ?? "",
          defaultMealType: meal.defaultMealType,
          items,
        }}
      />
    </>
  );
}
