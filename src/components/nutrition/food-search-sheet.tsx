"use client";

import { useState } from "react";
import { Sheet } from "@/components/ui/misc";
import { FoodBrowser } from "./food-browser";
import { QuantitySheet } from "./quantity-sheet";
import { foodTitle, macrosFor, quickPortions, type PickableFood } from "./types";

/**
 * Sélecteur d'aliment en feuille modale, en deux temps : on choisit l'aliment,
 * puis la quantité (avec les macros calculées en direct).
 */
export function FoodSearchSheet({
  open,
  title = "Ajouter un aliment",
  submitLabel = "Ajouter",
  onSelect,
  onClose,
}: {
  open: boolean;
  title?: string;
  submitLabel?: string;
  onSelect: (food: PickableFood, grams: number) => void;
  onClose: () => void;
}) {
  const [picked, setPicked] = useState<PickableFood | null>(null);

  function close() {
    setPicked(null);
    onClose();
  }

  return (
    <>
      <Sheet open={open} onClose={close} title={title} fullHeight>
        <FoodBrowser onPick={setPicked} autoFocus createHref="/nutrition/aliments/nouveau" />
      </Sheet>

      {picked ? (
        <QuantitySheet
          key={picked.id}
          open
          title={foodTitle(picked)}
          subtitle={`${Math.round(picked.kcal100)} kcal pour 100 g`}
          unit="g"
          initialValue={picked.servingGrams && picked.servingGrams > 0 ? Math.round(picked.servingGrams) : 100}
          quickValues={quickPortions(picked).map((p) => ({ label: p.label, value: Math.round(p.grams) }))}
          computeMacros={(grams) => macrosFor(picked, grams)}
          submitLabel={submitLabel}
          onConfirm={(grams) => {
            onSelect(picked, grams);
            setPicked(null);
          }}
          onClose={() => setPicked(null)}
        />
      ) : null}
    </>
  );
}
