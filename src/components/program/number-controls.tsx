"use client";

import { useState } from "react";
import { Minus, Plus } from "lucide-react";
import { Input } from "@/components/ui/field";

/** Incrémenteur à grosses cibles tactiles (séries). */
export function Stepper({
  value,
  min,
  max,
  suffix,
  decreaseLabel,
  increaseLabel,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  suffix?: string;
  decreaseLabel: string;
  increaseLabel: string;
  onChange: (v: number) => void;
}) {
  const clamped = (v: number) => Math.min(max, Math.max(min, v));

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => onChange(clamped(value - 1))}
        disabled={value <= min}
        aria-label={decreaseLabel}
        className="flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-2 text-muted disabled:opacity-40"
      >
        <Minus className="h-5 w-5" />
      </button>
      <div className="tabular flex-1 text-center text-2xl font-semibold">
        {value}
        {suffix ? <span className="ml-1.5 text-sm font-medium text-subtle">{suffix}</span> : null}
      </div>
      <button
        type="button"
        onClick={() => onChange(clamped(value + 1))}
        disabled={value >= max}
        aria-label={increaseLabel}
        className="flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-2 text-muted disabled:opacity-40"
      >
        <Plus className="h-5 w-5" />
      </button>
    </div>
  );
}

/**
 * Champ numérique facultatif.
 *
 * La saisie est conservée telle quelle tant que le champ a le focus : on peut
 * donc vider la case pour la ressaisir, sans qu'une valeur se réimpose.
 */
export function NumberInput({
  value,
  onChange,
  placeholder,
  min,
  max,
  step,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
}) {
  const [raw, setRaw] = useState(value == null ? "" : String(value));

  return (
    <Input
      type="number"
      inputMode="decimal"
      className="tabular text-center"
      value={raw}
      min={min}
      max={max}
      step={step ?? 1}
      placeholder={placeholder}
      onChange={(e) => {
        const next = e.target.value;
        setRaw(next);
        if (next.trim() === "") {
          onChange(null);
          return;
        }
        const parsed = Number(next.replace(",", "."));
        if (Number.isFinite(parsed)) onChange(parsed);
      }}
      onBlur={() => {
        if (value == null) {
          setRaw("");
          return;
        }
        let next = value;
        if (min != null) next = Math.max(min, next);
        if (max != null) next = Math.min(max, next);
        if (next !== value) onChange(next);
        setRaw(String(next));
      }}
    />
  );
}
