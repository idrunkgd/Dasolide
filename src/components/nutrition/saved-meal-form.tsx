"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Card, SectionTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { useToast } from "@/components/ui/misc";
import { deleteSavedMealAction, saveSavedMealAction } from "@/server/actions/nutrition";
import { MEAL_TYPES } from "@/lib/constants";
import { IngredientEditor, totalsOf, type EditableItem } from "./ingredient-editor";
import { MacroChips } from "./macro-bars";

export type SavedMealInitial = {
  id?: string;
  name: string;
  description: string;
  defaultMealType: string;
  items: EditableItem[];
};

/** Création / édition d'un repas enregistré : le total suit la saisie. */
export function SavedMealForm({ initial }: { initial: SavedMealInitial }) {
  const [name, setName] = useState(initial.name);
  const [description, setDescription] = useState(initial.description);
  const [mealType, setMealType] = useState(initial.defaultMealType);
  const [items, setItems] = useState<EditableItem[]>(initial.items);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  const totals = totalsOf(items);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await saveSavedMealAction({
        id: initial.id,
        name,
        description: description || null,
        defaultMealType: mealType,
        items: items.map((i) => ({ foodId: i.food.id, quantityGrams: i.quantityGrams })),
      });
      if (res.ok) {
        toast.show("Repas enregistré");
        router.push("/nutrition/repas");
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
      const res = await deleteSavedMealAction(id);
      if (res.ok) {
        toast.show("Repas supprimé");
        router.push("/nutrition/repas");
        router.refresh();
      } else {
        toast.show(res.error, "error");
      }
    });
  }

  return (
    <form onSubmit={submit} className="px-4 pb-8 pt-4">
      <Card className="mb-5 space-y-4">
        <Field label="Nom du repas">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Petit-déjeuner habituel"
            required
            maxLength={80}
          />
        </Field>
        <Field label="Description (facultatif)">
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Avoine, whey et banane — 3 minutes de préparation."
            maxLength={300}
            rows={2}
          />
        </Field>
        <Field label="Repas par défaut">
          <Select value={mealType} onChange={(e) => setMealType(e.target.value)}>
            {Object.entries(MEAL_TYPES).map(([key, meal]) => (
              <option key={key} value={key}>
                {meal.label}
              </option>
            ))}
          </Select>
        </Field>
      </Card>

      <SectionTitle>Composition</SectionTitle>
      <IngredientEditor
        items={items}
        onChange={setItems}
        emptyTitle="Aucun aliment"
        emptyDescription="Ajoute les aliments qui composent ce repas."
      />

      <SectionTitle>Total du repas</SectionTitle>
      <Card className="mb-6">
        <p className="tabular text-3xl font-bold leading-none">
          {Math.round(totals.kcal)}
          <span className="ml-1.5 text-base font-medium text-subtle">kcal</span>
        </p>
        <MacroChips macros={totals} className="mt-4" />
      </Card>

      <div className="space-y-2">
        <Button type="submit" size="lg" fullWidth loading={pending} disabled={!name || items.length === 0}>
          {initial.id ? "Enregistrer les modifications" : "Créer le repas"}
        </Button>
        {initial.id ? (
          <Button type="button" variant="secondary" size="lg" fullWidth onClick={remove} disabled={pending}>
            <Trash2 className="h-4 w-4 text-danger" />
            Supprimer ce repas
          </Button>
        ) : null}
      </div>

      {toast.node}
    </form>
  );
}
