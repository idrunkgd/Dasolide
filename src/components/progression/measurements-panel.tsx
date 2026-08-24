"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { Card, SectionTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/field";
import { Sheet } from "@/components/ui/misc";
import { MEASUREMENT_FIELDS, type MeasurementKey } from "@/lib/constants";
import { formatNumber1, formatSigned, parseDateKey } from "@/lib/utils";
import { MeasurementChart, type MeasurePoint } from "./measurement-chart";
import { MeasurementForm, type MeasurementEntry } from "./measurement-form";
import { MeasurementHistory } from "./measurement-history";
import { lengthOut, type LengthUnit } from "./units";

type SelectKey = MeasurementKey | "bodyFatPct";

/** §19 — Mensurations : saisie, courbe par mesure, historique commenté. */
export function MeasurementsPanel({
  entries,
  unit,
}: {
  /** Du plus récent au plus ancien. */
  entries: MeasurementEntry[];
  unit: LengthUnit;
}) {
  const [selected, setSelected] = useState<SelectKey>("waistCm");
  const [editing, setEditing] = useState<MeasurementEntry | null>(null);
  const [creating, setCreating] = useState(false);

  const isFat = selected === "bodyFatPct";
  const unitLabel = isFat ? "%" : unit;
  const label =
    MEASUREMENT_FIELDS.find((f) => f.key === selected)?.label ?? "Taux de graisse";

  const series = useMemo<MeasurePoint[]>(() => {
    const asc = [...entries].sort((a, b) => a.date.localeCompare(b.date));
    return asc
      .map((e) => {
        const raw = isFat ? e.bodyFatPct : (e.values[selected as MeasurementKey] ?? null);
        if (raw == null) return null;
        return { t: parseDateKey(e.date).getTime(), value: isFat ? raw : lengthOut(raw, unit) };
      })
      .filter((p): p is MeasurePoint => p != null);
  }, [entries, selected, isFat, unit]);

  const first = series[0]?.value ?? null;
  const last = series.at(-1)?.value ?? null;
  const total = first != null && last != null ? last - first : null;

  return (
    <div className="px-4 pt-4">
      <div className="mb-5">
        <Button fullWidth size="lg" onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" />
          Nouveau relevé
        </Button>
      </div>

      <SectionTitle>Évolution</SectionTitle>
      <Card className="mb-5">
        <Select
          value={selected}
          onChange={(e) => setSelected(e.target.value as SelectKey)}
          aria-label="Mesure affichée"
          className="mb-4"
        >
          {MEASUREMENT_FIELDS.map((f) => (
            <option key={f.key} value={f.key}>
              {f.label}
            </option>
          ))}
          <option value="bodyFatPct">Taux de graisse</option>
        </Select>

        {series.length >= 2 ? (
          <>
            <MeasurementChart data={series} unitLabel={unitLabel} />
            <div className="mt-3 flex items-baseline justify-between text-sm">
              <span className="text-muted">{label}</span>
              <span className="tabular">
                {last != null ? formatNumber1(last) : "—"} {unitLabel}
                {total != null && Math.abs(total) >= 0.05 ? (
                  <span className="ml-2 text-xs text-accent">
                    {formatSigned(total)} {unitLabel} depuis le début
                  </span>
                ) : null}
              </span>
            </div>
          </>
        ) : (
          <p className="py-10 text-center text-sm text-muted">
            {series.length === 1
              ? "Un seul relevé pour cette mesure : encode-en un second pour voir la courbe."
              : "Aucune donnée pour cette mesure."}
          </p>
        )}
      </Card>

      <SectionTitle>Historique</SectionTitle>
      <div className="mb-6">
        <MeasurementHistory entries={entries} unit={unit} onEdit={setEditing} />
      </div>

      <Sheet open={creating} onClose={() => setCreating(false)} title="Nouveau relevé" fullHeight>
        <MeasurementForm unit={unit} onSaved={() => setCreating(false)} />
      </Sheet>

      <Sheet open={editing != null} onClose={() => setEditing(null)} title="Modifier le relevé" fullHeight>
        {editing ? (
          <MeasurementForm unit={unit} initial={editing} onSaved={() => setEditing(null)} />
        ) : null}
      </Sheet>
    </div>
  );
}
