import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/layout/page-header";
import { EMPTY_FOOD, FoodForm } from "@/components/nutrition/food-form";

export const dynamic = "force-dynamic";

export default async function NouvelAlimentPage() {
  await requireUser();

  return (
    <>
      <PageHeader
        title="Nouvel aliment"
        subtitle="Visible par toi seul"
        back="/nutrition"
      />
      <FoodForm initial={EMPTY_FOOD} />
    </>
  );
}
