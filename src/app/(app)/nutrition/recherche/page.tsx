import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/layout/page-header";
import { FoodSearchView } from "@/components/nutrition/food-search-view";
import { mealLabel } from "@/components/nutrition/types";
import { MEAL_TYPES } from "@/lib/constants";
import { dateKey, formatRelativeDay, parseDateKey } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function RechercheAlimentPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; meal?: string }>;
}) {
  await requireUser();
  const { date, meal } = await searchParams;

  const day = /^\d{4}-\d{2}-\d{2}$/.test(date ?? "") ? (date as string) : dateKey(new Date());
  const mealType = meal && meal in MEAL_TYPES ? meal : "autre";

  return (
    <>
      <PageHeader
        title={mealLabel(mealType)}
        subtitle={formatRelativeDay(parseDateKey(day))}
        back={`/nutrition?date=${day}`}
      />
      <FoodSearchView day={day} mealType={mealType} />
    </>
  );
}
