import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/layout/page-header";
import { SavedMealForm } from "@/components/nutrition/saved-meal-form";

export const dynamic = "force-dynamic";

export default async function NouveauRepasPage() {
  await requireUser();

  return (
    <>
      <PageHeader title="Nouveau repas" back="/nutrition/repas" />
      <SavedMealForm
        initial={{ name: "", description: "", defaultMealType: "petit_dejeuner", items: [] }}
      />
    </>
  );
}
