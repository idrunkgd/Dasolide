"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveMeasurementAction } from "@/server/actions/body";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { MEASUREMENT_FIELDS, type MeasurementKey } from "@/lib/constants";
import { dateKey } from "@/lib/utils";
import { lengthIn, lengthOut, parseNumber, type LengthUnit } from "./units";

export type MeasurementEntry = {
  id: string;
  date: string;
  bodyFatPct: number | null;
  note: string | null;
  values: Partial<Record<MeasurementKey, number | null>>;
};

/** §19 — Tous les champs sont facultatifs : on encode ce que l'on a mesuré. */
export function MeasurementForm({
  unit,
  initial,
  onSaved,
}: {
  unit: LengthUnit;
  initial?: MeasurementEntry | null;
  onSaved?: () => void;
}) {
  const router = useRouter();
  const [date, setDate] = useState(initial?.date ?? dateKey());
  const [fields, setFields] = useState<Record<string, string>>(() => {
    const out: Record<string, string> = {};
    for (const f of MEASUREMENT_FIELDS) {
      const v = initial?.values[f.key];
      out[f.key] = v != null ? String(lengthOut(v, unit)) : "";
    }
    out.bodyFatPct = initial?.bodyFatPct != null ? String(initial.bodyFatPct) : "";
    return out;
  });
  const [note, setNote] = useState(initial?.note ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const set = (key: string, value: string) => setFields((f) => ({ ...f, [key]: value }));

  function submit() {
    const payload: Record<string, unknown> = { date, note: note.trim() || null };
    let filled = 0;

    for (const f of MEASUREMENT_FIELDS) {
      const n = parseNumber(fields[f.key] ?? "");
      payload[f.key] = n == null ? null : lengthIn(n, unit);
      if (n != null) filled++;
    }
    const fat = parseNumber(fields.bodyFatPct ?? "");
    payload.bodyFatPct = fat;
    if (fat != null) filled++;

    if (filled === 0) {
      setError("Renseigne au moins une mesure.");
      return;
    }
    setError(null);

    start(async () => {
      const res = await saveMeasurementAction(payload);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.refresh();
      onSaved?.();
    });
  }

  return (
    <div className="space-y-4">
      <Field label="Date">
        <Input type="date" value={date} max={dateKey()} onChange={(e) => setDate(e.target.value)} />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        {MEASUREMENT_FIELDS.map((f) => (
          <Field key={f.key} label={`${f.label} (${unit})`}>
            <Input
              type="number"
              inputMode="decimal"
              step="0.1"
              value={fields[f.key] ?? ""}
              onChange={(e) => set(f.key, e.target.value)}
              placeholder="—"
              className="tabular"
            />
          </Field>
        ))}
        <Field label="Taux de graisse (%)">
          <Input
            type="number"
            inputMode="decimal"
            step="0.1"
            value={fields.bodyFatPct ?? ""}
            onChange={(e) => set("bodyFatPct", e.target.value)}
            placeholder="—"
            className="tabular"
          />
        </Field>
      </div>

      <Field label="Note" hint="Facultatif">
        <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Mesuré le matin, à froid" />
      </Field>

      {error ? <p className="text-sm text-danger">{error}</p> : null}

      <Button onClick={submit} loading={pending} fullWidth size="lg">
        {initial ? "Mettre à jour" : "Enregistrer les mensurations"}
      </Button>
      <p className="text-xs text-subtle">
        Mesure toujours dans les mêmes conditions (le matin, muscle relâché, même endroit) pour que les
        écarts veuillent dire quelque chose.
      </p>
    </div>
  );
}
