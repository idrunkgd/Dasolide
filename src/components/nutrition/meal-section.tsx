"use client";

import Link from "next/link";
import { ChefHat, Plus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { MacroSummary } from "./macro-bars";
import { mealLabel, sumMacros, type Macros } from "./types";

export type DiaryEntryView = {
  id: string;
  mealType: string;
  label: string;
  quantityGrams: number;
  servings: number | null;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  isRecipe: boolean;
  food: {
    servingName: string | null;
    servingGrams: number | null;
    kcal100: number;
    protein100: number;
    carbs100: number;
    fat100: number;
    fiber100: number | null;
  } | null;
};

/** Un repas du journal : son total, ses lignes, et le bouton d'ajout. */
export function MealSection({
  mealType,
  entries,
  day,
  onSelect,
}: {
  mealType: string;
  entries: DiaryEntryView[];
  day: string;
  onSelect: (entry: DiaryEntryView) => void;
}) {
  const totals: Macros = sumMacros(entries);

  return (
    <Card className="mb-3 p-0">
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-[0.95rem] font-semibold">{mealLabel(mealType)}</h2>
          {entries.length > 0 ? (
            <MacroSummary macros={totals} className="mt-0.5 block" />
          ) : (
            <p className="mt-0.5 text-xs text-subtle">Rien d&apos;encodé</p>
          )}
        </div>
        <Link
          href={`/nutrition/recherche?date=${day}&meal=${mealType}`}
          aria-label={`Ajouter un aliment au ${mealLabel(mealType).toLowerCase()}`}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent-soft text-accent transition-colors hover:brightness-125"
        >
          <Plus className="h-5 w-5" />
        </Link>
      </div>

      {entries.length > 0 ? (
        <ul className="border-t border-border">
          {entries.map((entry) => (
            <li key={entry.id}>
              <button
                type="button"
                onClick={() => onSelect(entry)}
                className="flex min-h-[3.25rem] w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-surface-2 active:bg-surface-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 truncate text-sm font-medium">
                    {entry.isRecipe ? <ChefHat className="h-3.5 w-3.5 shrink-0 text-accent" /> : null}
                    <span className="truncate">{entry.label}</span>
                  </p>
                  <p className="tabular truncate text-xs text-subtle">
                    {entry.isRecipe && entry.servings
                      ? `${formatQty(entry.servings)} portion${entry.servings > 1 ? "s" : ""}`
                      : `${formatQty(entry.quantityGrams)} g`}
                    {" · "}
                    P {Math.round(entry.protein)} · G {Math.round(entry.carbs)} · L {Math.round(entry.fat)}
                  </p>
                </div>
                <span className="tabular shrink-0 text-sm font-semibold">{Math.round(entry.kcal)}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </Card>
  );
}

function formatQty(n: number): string {
  const rounded = Math.round(n * 10) / 10;
  return String(rounded).replace(".", ",");
}
