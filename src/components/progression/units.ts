import { cmToIn, inToCm, kgToLb, lbToKg } from "@/lib/utils";

/**
 * Conversions d'affichage.
 *
 * Rappel : la base ne contient QUE des kg et des cm. Les unités impériales
 * n'existent qu'au moment de lire et d'écrire dans un champ de formulaire.
 */

export type WeightUnit = "kg" | "lb";
export type LengthUnit = "cm" | "in";

export const round1 = (n: number) => Math.round(n * 10) / 10;
export const round2 = (n: number) => Math.round(n * 100) / 100;

/** kg stocké → valeur affichée dans l'unité de l'utilisateur. */
export const weightOut = (kg: number, unit: WeightUnit) => round1(unit === "lb" ? kgToLb(kg) : kg);
/** valeur saisie par l'utilisateur → kg à stocker. */
export const weightIn = (value: number, unit: WeightUnit) => round2(unit === "lb" ? lbToKg(value) : value);

export const lengthOut = (cm: number, unit: LengthUnit) => round1(unit === "in" ? cmToIn(cm) : cm);
export const lengthIn = (value: number, unit: LengthUnit) => round2(unit === "in" ? inToCm(value) : value);

/** Accepte « 84,2 » aussi bien que « 84.2 ». */
export function parseNumber(input: string): number | null {
  const s = input.trim().replace(",", ".");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}
