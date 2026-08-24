"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/misc";
import { FoodSearchSheet } from "./food-search-sheet";
import { QuantitySheet } from "./quantity-sheet";
import { MacroSummary } from "./macro-bars";
import { foodTitle, macrosFor, quickPortions, sumMacros, type Macros, type PickableFood } from "./types";

export type EditorFood = Pick<
  PickableFood,
  | "id"
  | "name"
  | "brand"
  | "servingName"
  | "servingGrams"
  | "kcal100"
  | "protein100"
  | "carbs100"
  | "fat100"
  | "fiber100"
>;

export type EditableItem = { key: string; food: EditorFood; quantityGrams: number };

export function itemMacros(item: EditableItem): Macros {
  return macrosFor(item.food, item.quantityGrams);
}

export function totalsOf(items: EditableItem[]): Macros {
  return sumMacros(items.map(itemMacros));
}

let counter = 0;
const nextKey = () => `item-${++counter}-${Date.now()}`;

export function toEditableItem(food: EditorFood, quantityGrams: number): EditableItem {
  return { key: nextKey(), food, quantityGrams };
}

/**
 * Liste modifiable d'aliments + quantités, partagée par les repas enregistrés
 * et les recettes. Le total est recalculé à chaque changement.
 */
export function IngredientEditor({
  items,
  onChange,
  emptyTitle,
  emptyDescription,
  addLabel = "Ajouter un aliment",
}: {
  items: EditableItem[];
  onChange: (items: EditableItem[]) => void;
  emptyTitle: string;
  emptyDescription: string;
  addLabel?: string;
}) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [editing, setEditing] = useState<EditableItem | null>(null);

  function add(food: PickableFood, grams: number) {
    onChange([...items, toEditableItem(food, grams)]);
    setSearchOpen(false);
  }

  function updateQuantity(key: string, grams: number) {
    onChange(items.map((i) => (i.key === key ? { ...i, quantityGrams: grams } : i)));
    setEditing(null);
  }

  function remove(key: string) {
    onChange(items.filter((i) => i.key !== key));
  }

  return (
    <>
      <Card className="mb-4 p-0">
        {items.length === 0 ? (
          <EmptyState title={emptyTitle} description={emptyDescription} />
        ) : (
          <ul className="divide-y divide-border">
            {items.map((item) => (
              <li key={item.key} className="flex items-center gap-2 px-2 py-1">
                <button
                  type="button"
                  onClick={() => setEditing(item)}
                  className="flex min-h-[3.25rem] min-w-0 flex-1 items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-surface-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{foodTitle(item.food)}</p>
                    <p className="tabular truncate text-xs text-subtle">
                      {Math.round(item.quantityGrams)} g ·{" "}
                      <MacroSummary macros={itemMacros(item)} className="inline" />
                    </p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => remove(item.key)}
                  aria-label={`Retirer ${item.food.name}`}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-subtle transition-colors hover:bg-surface-2 hover:text-danger"
                >
                  <X className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="border-t border-border p-3">
          <Button type="button" variant="secondary" fullWidth size="md" onClick={() => setSearchOpen(true)}>
            <Plus className="h-4 w-4" />
            {addLabel}
          </Button>
        </div>
      </Card>

      <FoodSearchSheet open={searchOpen} onSelect={add} onClose={() => setSearchOpen(false)} />

      {editing ? (
        <QuantitySheet
          key={editing.key}
          open
          title={foodTitle(editing.food)}
          subtitle="Modifie la quantité pour cette ligne."
          unit="g"
          initialValue={Math.round(editing.quantityGrams)}
          quickValues={quickPortions(editing.food).map((p) => ({ label: p.label, value: Math.round(p.grams) }))}
          computeMacros={(grams) => macrosFor(editing.food, grams)}
          submitLabel="Mettre à jour"
          onConfirm={(grams) => updateQuantity(editing.key, grams)}
          onDelete={() => {
            remove(editing.key);
            setEditing(null);
          }}
          onClose={() => setEditing(null)}
        />
      ) : null}
    </>
  );
}
