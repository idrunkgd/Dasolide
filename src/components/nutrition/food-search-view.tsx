"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/misc";
import { addDiaryEntryAction } from "@/server/actions/nutrition";
import { FoodBrowser } from "./food-browser";
import { QuantitySheet } from "./quantity-sheet";
import { foodTitle, macrosFor, mealLabel, quickPortions, type PickableFood } from "./types";

/**
 * Recherche plein écran depuis le journal : on choisit un aliment, on ajuste la
 * quantité, on valide — puis retour immédiat au journal du bon jour.
 */
export function FoodSearchView({ day, mealType }: { day: string; mealType: string }) {
  const [picked, setPicked] = useState<PickableFood | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function add(grams: number) {
    if (!picked) return;
    const foodId = picked.id;
    startTransition(async () => {
      const res = await addDiaryEntryAction({ date: day, mealType, foodId, quantityGrams: grams });
      if (res.ok) {
        router.push(`/nutrition?date=${day}`);
        router.refresh();
      } else {
        toast.show(res.error, "error");
      }
    });
  }

  return (
    <div className="px-4 pt-4">
      <FoodBrowser onPick={setPicked} autoFocus createHref="/nutrition/aliments/nouveau" />

      {picked ? (
        <QuantitySheet
          key={picked.id}
          open
          title={foodTitle(picked)}
          subtitle={`${Math.round(picked.kcal100)} kcal pour 100 g · ${mealLabel(mealType)}`}
          unit="g"
          initialValue={picked.servingGrams && picked.servingGrams > 0 ? Math.round(picked.servingGrams) : 100}
          quickValues={quickPortions(picked).map((p) => ({ label: p.label, value: Math.round(p.grams) }))}
          computeMacros={(grams) => macrosFor(picked, grams)}
          submitLabel="Ajouter au journal"
          pending={pending}
          onConfirm={add}
          onClose={() => setPicked(null)}
        />
      ) : null}

      {toast.node}
    </div>
  );
}
