"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/misc";
import { deleteDiaryEntryAction, updateDiaryEntryAction } from "@/server/actions/nutrition";
import { MealSection, type DiaryEntryView } from "./meal-section";
import { QuantitySheet } from "./quantity-sheet";
import { MEAL_ORDER, macrosFor, quickPortions, scaleMacros, ZERO_MACROS, type Macros } from "./types";

/**
 * Les cinq sections du journal + la feuille d'édition d'une ligne.
 * Toucher une ligne ouvre la feuille : modifier la quantité ou supprimer.
 */
export function DiaryMeals({ day, entries }: { day: string; entries: DiaryEntryView[] }) {
  const [selected, setSelected] = useState<DiaryEntryView | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function save(value: number) {
    if (!selected) return;
    const id = selected.id;
    startTransition(async () => {
      const res = await updateDiaryEntryAction(id, value);
      if (res.ok) {
        setSelected(null);
        toast.show("Quantité mise à jour");
        router.refresh();
      } else {
        toast.show(res.error, "error");
      }
    });
  }

  function remove() {
    if (!selected) return;
    const id = selected.id;
    startTransition(async () => {
      const res = await deleteDiaryEntryAction(id);
      if (res.ok) {
        setSelected(null);
        toast.show("Ligne supprimée");
        router.refresh();
      } else {
        toast.show(res.error, "error");
      }
    });
  }

  return (
    <>
      {MEAL_ORDER.map((mealType) => (
        <MealSection
          key={mealType}
          mealType={mealType}
          day={day}
          entries={entries.filter((e) => e.mealType === mealType)}
          onSelect={setSelected}
        />
      ))}

      {selected ? (
        <QuantitySheet
          key={selected.id}
          open
          title={selected.label}
          subtitle={
            selected.isRecipe
              ? "Recette — ajuste le nombre de portions."
              : "Ajuste la quantité, les macros suivent."
          }
          unit={selected.isRecipe ? "portion" : "g"}
          initialValue={
            selected.isRecipe
              ? Math.round((selected.servings ?? 1) * 100) / 100
              : Math.round(selected.quantityGrams)
          }
          quickValues={quickValuesFor(selected)}
          computeMacros={(value) => previewMacros(selected, value)}
          submitLabel="Enregistrer"
          pending={pending}
          onConfirm={save}
          onDelete={remove}
          onClose={() => setSelected(null)}
        />
      ) : null}

      {toast.node}
    </>
  );
}

function quickValuesFor(entry: DiaryEntryView): { label: string; value: number }[] {
  if (entry.isRecipe) {
    return [0.5, 1, 1.5, 2].map((v) => ({
      label: `${String(v).replace(".", ",")} portion${v > 1 ? "s" : ""}`,
      value: v,
    }));
  }
  if (entry.food) {
    return quickPortions(entry.food).map((p) => ({ label: p.label, value: Math.round(p.grams) }));
  }
  return [50, 100, 150, 200].map((g) => ({ label: `${g} g`, value: g }));
}

/** Aperçu local — le serveur refait le calcul de référence à l'enregistrement. */
function previewMacros(entry: DiaryEntryView, value: number): Macros {
  const snapshot: Macros = {
    kcal: entry.kcal,
    protein: entry.protein,
    carbs: entry.carbs,
    fat: entry.fat,
    fiber: entry.fiber,
  };

  if (entry.isRecipe) {
    const base = entry.servings && entry.servings > 0 ? entry.servings : 1;
    return scaleMacros(snapshot, value / base);
  }
  if (entry.food) return macrosFor(entry.food, value);
  if (entry.quantityGrams > 0) return scaleMacros(snapshot, value / entry.quantityGrams);
  return { ...ZERO_MACROS };
}
