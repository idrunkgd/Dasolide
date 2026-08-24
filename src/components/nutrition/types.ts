import { foodMacros } from "@/lib/calc";
import { MEAL_TYPES, type MealType } from "@/lib/constants";

/** Aliment tel que renvoyé par /api/aliments — suffisant pour calculer en direct. */
export type PickableFood = {
  id: string;
  name: string;
  brand: string | null;
  category: string;
  servingName: string | null;
  servingGrams: number | null;
  kcal100: number;
  protein100: number;
  carbs100: number;
  fat100: number;
  fiber100: number | null;
  isCustom: boolean;
  isFavorite: boolean;
  isRecent: boolean;
};

export type Macros = { kcal: number; protein: number; carbs: number; fat: number; fiber: number };

export const ZERO_MACROS: Macros = { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };

/** Onglets du sélecteur d'aliment. */
export type FoodTab = "tous" | "favoris" | "recents" | "mes";

export const FOOD_TABS: { value: FoodTab; label: string }[] = [
  { value: "tous", label: "Tous" },
  { value: "favoris", label: "Favoris" },
  { value: "recents", label: "Récents" },
  { value: "mes", label: "Mes aliments" },
];

/** Ordre d'affichage des repas dans le journal. */
export const MEAL_ORDER = (Object.keys(MEAL_TYPES) as MealType[]).sort(
  (a, b) => MEAL_TYPES[a].order - MEAL_TYPES[b].order
);

export function mealLabel(key: string): string {
  return MEAL_TYPES[key as MealType]?.label ?? "Autre";
}

export function foodTitle(food: { name: string; brand?: string | null }): string {
  return food.brand ? `${food.name} (${food.brand})` : food.name;
}

export function macrosFor(
  food: { kcal100: number; protein100: number; carbs100: number; fat100: number; fiber100?: number | null },
  grams: number
): Macros {
  return foodMacros(food, Number.isFinite(grams) ? grams : 0);
}

export function addMacros(a: Macros, b: Macros): Macros {
  return {
    kcal: a.kcal + b.kcal,
    protein: a.protein + b.protein,
    carbs: a.carbs + b.carbs,
    fat: a.fat + b.fat,
    fiber: a.fiber + b.fiber,
  };
}

export function scaleMacros(m: Macros, factor: number): Macros {
  return {
    kcal: m.kcal * factor,
    protein: m.protein * factor,
    carbs: m.carbs * factor,
    fat: m.fat * factor,
    fiber: m.fiber * factor,
  };
}

export function sumMacros(list: Macros[]): Macros {
  return list.reduce(addMacros, { ...ZERO_MACROS });
}

/** Portions rapides proposées dans la feuille de quantité. */
export function quickPortions(food: { servingName: string | null; servingGrams: number | null }) {
  const options: { label: string; grams: number }[] = [];
  if (food.servingGrams && food.servingGrams > 0) {
    options.push({ label: food.servingName || "1 portion", grams: food.servingGrams });
  }
  for (const g of [50, 100, 150, 200]) {
    if (!options.some((o) => o.grams === g)) options.push({ label: `${g} g`, grams: g });
  }
  return options;
}
