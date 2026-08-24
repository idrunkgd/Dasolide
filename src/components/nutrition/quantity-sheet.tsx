"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Sheet } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { cn } from "@/lib/utils";
import { MACRO_COLORS } from "./macro-bars";
import type { Macros } from "./types";

/**
 * Feuille de saisie de quantité.
 *
 * Le calcul est affiché **en direct** : on voit ce que la ligne va coûter avant
 * de valider, ce qui évite l'aller-retour « j'ajoute puis je corrige ».
 */
export function QuantitySheet({
  open,
  title,
  subtitle,
  unit,
  initialValue,
  quickValues,
  computeMacros,
  submitLabel = "Ajouter",
  pending = false,
  onConfirm,
  onClose,
  onDelete,
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  unit: "g" | "portion";
  initialValue: number;
  quickValues: { label: string; value: number }[];
  computeMacros: (value: number) => Macros;
  submitLabel?: string;
  pending?: boolean;
  onConfirm: (value: number) => void;
  onClose: () => void;
  onDelete?: () => void;
}) {
  const [raw, setRaw] = useState(String(initialValue));

  const value = Number(raw.replace(",", "."));
  const valid = Number.isFinite(value) && value > 0;
  const macros = computeMacros(valid ? value : 0);

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <div className="flex gap-2">
          {onDelete ? (
            <Button
              variant="secondary"
              size="lg"
              onClick={onDelete}
              disabled={pending}
              aria-label="Supprimer"
              className="w-14 shrink-0 px-0 text-danger"
            >
              <Trash2 className="h-5 w-5" />
            </Button>
          ) : null}
          <Button
            size="lg"
            fullWidth
            loading={pending}
            disabled={!valid}
            onClick={() => valid && onConfirm(Math.round(value * 100) / 100)}
          >
            {submitLabel}
          </Button>
        </div>
      }
    >
      {subtitle ? <p className="-mt-1 mb-4 text-sm text-muted">{subtitle}</p> : null}

      <div className="relative">
        <Input
          type="number"
          inputMode="decimal"
          step={unit === "g" ? "1" : "0.5"}
          min="0"
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          className="tabular h-14 pr-20 text-xl font-semibold"
          aria-label={unit === "g" ? "Quantité en grammes" : "Nombre de portions"}
          autoFocus
        />
        <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-subtle">
          {unit === "g" ? "grammes" : "portions"}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {quickValues.map((q) => {
          const active = valid && Math.abs(value - q.value) < 0.001;
          return (
            <button
              key={`${q.label}-${q.value}`}
              type="button"
              onClick={() => setRaw(String(q.value))}
              className={cn(
                "min-h-[2.75rem] rounded-2xl border px-3.5 py-2 text-sm font-medium transition-colors",
                active
                  ? "border-accent-border bg-accent-soft text-text"
                  : "border-border bg-surface-2 text-muted hover:border-border-strong"
              )}
            >
              {q.label}
            </button>
          );
        })}
      </div>

      <div className="mt-5 rounded-2xl border border-border bg-surface-2 p-4">
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-muted">Calories</span>
          <span className="tabular text-2xl font-bold">
            {Math.round(macros.kcal)}
            <span className="ml-1 text-sm font-medium text-subtle">kcal</span>
          </span>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <LiveMacro label="Protéines" value={macros.protein} color={MACRO_COLORS.protein} />
          <LiveMacro label="Glucides" value={macros.carbs} color={MACRO_COLORS.carbs} />
          <LiveMacro label="Lipides" value={macros.fat} color={MACRO_COLORS.fat} />
        </div>
        {macros.fiber > 0 ? (
          <p className="tabular mt-3 text-xs text-subtle">
            Fibres : {Math.round(macros.fiber * 10) / 10} g
          </p>
        ) : null}
      </div>
    </Sheet>
  );
}

function LiveMacro({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-xl bg-surface px-2 py-2 text-center">
      <div className="tabular text-base font-semibold" style={{ color }}>
        {Math.round(value * 10) / 10}
      </div>
      <div className="text-[0.65rem] uppercase tracking-wide text-subtle">{label}</div>
    </div>
  );
}
