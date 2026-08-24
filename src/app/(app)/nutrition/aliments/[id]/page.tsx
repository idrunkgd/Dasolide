import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, SectionTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/misc";
import { PageHeader } from "@/components/layout/page-header";
import { FoodForm } from "@/components/nutrition/food-form";
import { FoodDetailActions } from "@/components/nutrition/food-detail-actions";
import { MacroChips } from "@/components/nutrition/macro-bars";
import { macrosFor } from "@/components/nutrition/types";
import { FOOD_CATEGORIES } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function FichePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ edit?: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const { edit } = await searchParams;

  const food = await prisma.food.findFirst({
    where: { AND: [{ id }, { OR: [{ isCustom: false }, { userId: user.id }] }] },
  });
  if (!food) notFound();

  const isOwned = food.isCustom && food.userId === user.id;
  const isFavorite =
    (await prisma.foodFavorite.findUnique({
      where: { userId_foodId: { userId: user.id, foodId: food.id } },
    })) != null;

  if (edit === "1" && isOwned) {
    return (
      <>
        <PageHeader title="Modifier l'aliment" back={`/nutrition/aliments/${food.id}`} />
        <FoodForm
          initial={{
            id: food.id,
            name: food.name,
            brand: food.brand ?? "",
            category: food.category,
            servingName: food.servingName ?? "",
            servingGrams: food.servingGrams != null ? String(food.servingGrams) : "",
            kcal100: String(food.kcal100),
            protein100: String(food.protein100),
            carbs100: String(food.carbs100),
            fat100: String(food.fat100),
            fiber100: food.fiber100 != null ? String(food.fiber100) : "",
            sugar100: food.sugar100 != null ? String(food.sugar100) : "",
            salt100: food.salt100 != null ? String(food.salt100) : "",
          }}
        />
      </>
    );
  }

  const per100 = macrosFor(food, 100);
  const serving = food.servingGrams && food.servingGrams > 0 ? food.servingGrams : null;
  const perServing = serving ? macrosFor(food, serving) : null;

  return (
    <>
      <PageHeader title={food.name} subtitle={food.brand ?? undefined} back="/nutrition" />

      <div className="px-4 pb-8 pt-4">
        <div className="mb-4 flex flex-wrap gap-2">
          <Badge tone="neutral">
            {FOOD_CATEGORIES[food.category as keyof typeof FOOD_CATEGORIES] ?? "Autre"}
          </Badge>
          {isOwned ? <Badge tone="accent">Mon aliment</Badge> : null}
          {food.verified ? <Badge tone="success">Valeurs vérifiées</Badge> : null}
        </div>

        <SectionTitle>Pour 100 g</SectionTitle>
        <Card className="mb-5">
          <p className="tabular text-3xl font-bold leading-none">
            {Math.round(food.kcal100)}
            <span className="ml-1.5 text-base font-medium text-subtle">kcal</span>
          </p>
          <MacroChips macros={per100} className="mt-4" />
          <dl className="mt-4 space-y-1.5 text-sm">
            <Row label="Fibres" value={food.fiber100} />
            <Row label="Sucres" value={food.sugar100} />
            <Row label="Sel" value={food.salt100} />
          </dl>
        </Card>

        <SectionTitle>Par portion</SectionTitle>
        <Card className="mb-6">
          {perServing && serving ? (
            <>
              <p className="text-sm text-muted">
                {food.servingName || "1 portion"} · {Math.round(serving)} g
              </p>
              <p className="tabular mt-1 text-3xl font-bold leading-none">
                {Math.round(perServing.kcal)}
                <span className="ml-1.5 text-base font-medium text-subtle">kcal</span>
              </p>
              <MacroChips macros={perServing} className="mt-4" />
            </>
          ) : (
            <p className="py-1 text-sm text-muted">
              Aucune portion usuelle définie pour cet aliment.
              {isOwned ? " Tu peux en ajouter une en le modifiant." : ""}
            </p>
          )}
        </Card>

        <FoodDetailActions foodId={food.id} isFavorite={isFavorite} isOwned={isOwned} />
      </div>
    </>
  );
}

function Row({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="flex items-baseline justify-between">
      <dt className="text-muted">{label}</dt>
      <dd className="tabular font-medium">{value != null ? `${Math.round(value * 10) / 10} g` : "—"}</dd>
    </div>
  );
}
