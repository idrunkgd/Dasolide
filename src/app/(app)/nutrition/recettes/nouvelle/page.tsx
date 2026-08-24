import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/layout/page-header";
import { RecipeForm } from "@/components/nutrition/recipe-form";

export const dynamic = "force-dynamic";

export default async function NouvelleRecettePage() {
  await requireUser();

  return (
    <>
      <PageHeader title="Nouvelle recette" back="/nutrition/recettes" />
      <RecipeForm
        initial={{ name: "", description: "", instructions: "", servings: 2, ingredients: [] }}
      />
    </>
  );
}
