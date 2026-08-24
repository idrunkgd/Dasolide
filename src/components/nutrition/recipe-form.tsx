"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Card, SectionTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { useToast } from "@/components/ui/misc";
import { deleteRecipeAction, saveRecipeAction } from "@/server/actions/nutrition";
import { IngredientEditor, totalsOf, type EditableItem } from "./ingredient-editor";
import { MacroChips } from "./macro-bars";
import { scaleMacros } from "./types";

export type RecipeInitial = {
  id?: string;
  name: string;
  description: string;
  instructions: string;
  servings: number;
  ingredients: EditableItem[];
};

/** Création / édition d'une recette : totaux et par portion calculés en direct. */
export function RecipeForm({ initial }: { initial: RecipeInitial }) {
  const [name, setName] = useState(initial.name);
  const [description, setDescription] = useState(initial.description);
  const [instructions, setInstructions] = useState(initial.instructions);
  const [servingsRaw, setServingsRaw] = useState(String(initial.servings));
  const [ingredients, setIngredients] = useState<EditableItem[]>(initial.ingredients);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  const servings = Math.max(1, Math.round(Number(servingsRaw) || 1));
  const totals = totalsOf(ingredients);
  const perServing = scaleMacros(totals, 1 / servings);
  const totalGrams = ingredients.reduce((acc, i) => acc + i.quantityGrams, 0);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await saveRecipeAction({
        id: initial.id,
        name,
        description: description || null,
        instructions: instructions || null,
        servings,
        ingredients: ingredients.map((i) => ({ foodId: i.food.id, quantityGrams: i.quantityGrams })),
      });
      if (res.ok) {
        toast.show("Recette enregistrée");
        router.push("/nutrition/recettes");
        router.refresh();
      } else {
        toast.show(res.error, "error");
      }
    });
  }

  function remove() {
    if (!initial.id) return;
    const id = initial.id;
    startTransition(async () => {
      const res = await deleteRecipeAction(id);
      if (res.ok) {
        toast.show("Recette supprimée");
        router.push("/nutrition/recettes");
        router.refresh();
      } else {
        toast.show(res.error, "error");
      }
    });
  }

  return (
    <form onSubmit={submit} className="px-4 pb-8 pt-4">
      <Card className="mb-5 space-y-4">
        <Field label="Nom de la recette">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Pita poulet maison"
            required
            maxLength={80}
          />
        </Field>
        <Field label="Description (facultatif)">
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Rapide, rassasiant, et les macros tombent juste."
            maxLength={500}
            rows={2}
          />
        </Field>
        <Field label="Nombre de portions" hint="Les macros par portion en découlent directement.">
          <Input
            type="number"
            inputMode="numeric"
            min="1"
            max="50"
            step="1"
            value={servingsRaw}
            onChange={(e) => setServingsRaw(e.target.value)}
            className="tabular"
            required
          />
        </Field>
      </Card>

      <SectionTitle>Ingrédients</SectionTitle>
      <IngredientEditor
        items={ingredients}
        onChange={setIngredients}
        emptyTitle="Aucun ingrédient"
        emptyDescription="Ajoute les ingrédients et leurs quantités."
        addLabel="Ajouter un ingrédient"
      />

      <SectionTitle>Valeurs nutritionnelles</SectionTitle>
      <div className="mb-5 grid grid-cols-1 gap-3">
        <Card>
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-medium">Total de la recette</span>
            <span className="tabular text-xs text-subtle">{Math.round(totalGrams)} g</span>
          </div>
          <p className="tabular mt-1 text-2xl font-bold leading-none">
            {Math.round(totals.kcal)}
            <span className="ml-1.5 text-sm font-medium text-subtle">kcal</span>
          </p>
          <MacroChips macros={totals} className="mt-3" />
        </Card>

        <Card className="border-accent-border">
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-medium">Par portion</span>
            <span className="tabular text-xs text-subtle">
              {servings} portion{servings > 1 ? "s" : ""} · {Math.round(totalGrams / servings)} g
            </span>
          </div>
          <p className="tabular mt-1 text-2xl font-bold leading-none text-accent">
            {Math.round(perServing.kcal)}
            <span className="ml-1.5 text-sm font-medium text-subtle">kcal</span>
          </p>
          <MacroChips macros={perServing} className="mt-3" />
        </Card>
      </div>

      <SectionTitle>Préparation</SectionTitle>
      <Card className="mb-6">
        <Field label="Instructions (facultatif)">
          <Textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="Faire griller le poulet, chauffer le pain pita, garnir…"
            maxLength={5000}
            rows={5}
          />
        </Field>
      </Card>

      <div className="space-y-2">
        <Button type="submit" size="lg" fullWidth loading={pending} disabled={!name || ingredients.length === 0}>
          {initial.id ? "Enregistrer les modifications" : "Créer la recette"}
        </Button>
        {initial.id ? (
          <Button type="button" variant="secondary" size="lg" fullWidth onClick={remove} disabled={pending}>
            <Trash2 className="h-4 w-4 text-danger" />
            Supprimer cette recette
          </Button>
        ) : null}
      </div>

      {toast.node}
    </form>
  );
}
