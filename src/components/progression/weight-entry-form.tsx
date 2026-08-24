"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveWeightAction } from "@/server/actions/body";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { dateKey } from "@/lib/utils";
import { parseNumber, weightIn, weightOut, type WeightUnit } from "./units";

export type WeightEntry = {
  id: string;
  date: string;
  weightKg: number;
  bodyFatPct: number | null;
  note: string | null;
};

/**
 * Saisie d'une pesée. Le même formulaire sert à créer la pesée du jour et à
 * corriger une pesée passée : l'action serveur fait un upsert sur la date.
 */
export function WeightEntryForm({
  unit,
  initial,
  onSaved,
  submitLabel = "Enregistrer",
}: {
  unit: WeightUnit;
  initial?: WeightEntry | null;
  onSaved?: () => void;
  submitLabel?: string;
}) {
  const router = useRouter();
  const [date, setDate] = useState(initial?.date ?? dateKey());
  const [weight, setWeight] = useState(initial ? String(weightOut(initial.weightKg, unit)) : "");
  const [fat, setFat] = useState(initial?.bodyFatPct != null ? String(initial.bodyFatPct) : "");
  const [note, setNote] = useState(initial?.note ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit() {
    const value = parseNumber(weight);
    if (value == null) {
      setError("Indique un poids.");
      return;
    }
    setError(null);
    start(async () => {
      const res = await saveWeightAction({
        date,
        weightKg: weightIn(value, unit),
        bodyFatPct: parseNumber(fat),
        note: note.trim() || null,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      if (!initial) {
        setFat("");
        setNote("");
      }
      router.refresh();
      onSaved?.();
    });
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Date">
          <Input type="date" value={date} max={dateKey()} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label={`Poids (${unit})`}>
          <div className="relative">
            <Input
              type="number"
              inputMode="decimal"
              step="0.1"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder={unit === "kg" ? "84,2" : "185,6"}
              className="tabular pr-11 font-semibold"
            />
            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-subtle">
              {unit}
            </span>
          </div>
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Masse grasse (%)" hint="Facultatif">
          <Input
            type="number"
            inputMode="decimal"
            step="0.1"
            value={fat}
            onChange={(e) => setFat(e.target.value)}
            placeholder="18,5"
            className="tabular"
          />
        </Field>
        <Field label="Note" hint="Facultatif">
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Repas de fête hier…" />
        </Field>
      </div>

      {error ? <p className="text-sm text-danger">{error}</p> : null}

      <Button onClick={submit} loading={pending} fullWidth size="lg">
        {submitLabel}
      </Button>
    </div>
  );
}
