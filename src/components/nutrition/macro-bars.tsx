import { ProgressBar } from "@/components/ui/misc";
import { cn } from "@/lib/utils";
import type { Macros } from "./types";

export const MACRO_COLORS = {
  protein: "var(--accent)",
  carbs: "var(--info)",
  fat: "var(--warning)",
  fiber: "var(--success)",
} as const;

/** Une ligne « Protéines 120 / 180 g » avec sa barre de progression. */
export function MacroBar({
  label,
  value,
  max,
  color,
  unit = "g",
}: {
  label: string;
  value: number;
  max: number;
  color: string;
  unit?: string;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between text-sm">
        <span className="text-muted">{label}</span>
        <span className="tabular font-medium">
          {Math.round(value)}
          <span className="text-subtle">
            {" "}
            / {Math.round(max)} {unit}
          </span>
        </span>
      </div>
      <ProgressBar value={value} max={max} color={color} height={6} />
    </div>
  );
}

/** Barres protéines / glucides / lipides (+ fibres si un objectif existe). */
export function MacroBars({
  totals,
  goal,
  className,
}: {
  totals: Macros;
  goal: { protein: number; carbs: number; fat: number; fiber?: number | null };
  className?: string;
}) {
  return (
    <div className={cn("space-y-3", className)}>
      <MacroBar label="Protéines" value={totals.protein} max={goal.protein} color={MACRO_COLORS.protein} />
      <MacroBar label="Glucides" value={totals.carbs} max={goal.carbs} color={MACRO_COLORS.carbs} />
      <MacroBar label="Lipides" value={totals.fat} max={goal.fat} color={MACRO_COLORS.fat} />
      {goal.fiber ? (
        <MacroBar label="Fibres" value={totals.fiber} max={goal.fiber} color={MACRO_COLORS.fiber} />
      ) : null}
    </div>
  );
}

/** Résumé compact « 320 kcal · P 28 · G 12 · L 9 ». */
export function MacroSummary({
  macros,
  className,
  showKcal = true,
}: {
  macros: Macros;
  className?: string;
  showKcal?: boolean;
}) {
  return (
    <span className={cn("tabular text-xs text-subtle", className)}>
      {showKcal ? <span className="text-muted">{Math.round(macros.kcal)} kcal</span> : null}
      {showKcal ? " · " : ""}P {Math.round(macros.protein)} · G {Math.round(macros.carbs)} · L{" "}
      {Math.round(macros.fat)}
    </span>
  );
}

/** Trois pastilles macro utilisées dans les fiches (repas, recettes, aliments). */
export function MacroChips({ macros, className }: { macros: Macros; className?: string }) {
  const items = [
    { label: "Protéines", value: macros.protein, color: MACRO_COLORS.protein },
    { label: "Glucides", value: macros.carbs, color: MACRO_COLORS.carbs },
    { label: "Lipides", value: macros.fat, color: MACRO_COLORS.fat },
  ];
  return (
    <div className={cn("grid grid-cols-3 gap-2", className)}>
      {items.map((item) => (
        <div key={item.label} className="rounded-2xl bg-surface-2 px-3 py-2.5 text-center">
          <div className="tabular text-base font-semibold" style={{ color: item.color }}>
            {Math.round(item.value * 10) / 10} g
          </div>
          <div className="mt-0.5 text-[0.68rem] uppercase tracking-wider text-subtle">{item.label}</div>
        </div>
      ))}
    </div>
  );
}
