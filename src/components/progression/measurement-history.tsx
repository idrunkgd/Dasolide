"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Ruler, Trash2 } from "lucide-react";
import { deleteMeasurementAction } from "@/server/actions/body";
import { EmptyState, Sheet } from "@/components/ui/misc";
import { MEASUREMENT_FIELDS, type MeasurementKey } from "@/lib/constants";
import { formatDate, formatNumber1, formatSigned, parseDateKey } from "@/lib/utils";
import type { MeasurementEntry } from "./measurement-form";
import { lengthOut, type LengthUnit } from "./units";

/**
 * Historique des mensurations, du plus récent au plus ancien, avec l'écart
 * par rapport à la mesure précédente pour chaque champ renseigné.
 */
export function MeasurementHistory({
  entries,
  unit,
  onEdit,
}: {
  entries: MeasurementEntry[];
  unit: LengthUnit;
  onEdit: (entry: MeasurementEntry) => void;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (entries.length === 0) {
    return (
      <EmptyState
        icon={<Ruler className="h-6 w-6" />}
        title="Aucune mensuration"
        description="Un relevé toutes les deux à quatre semaines suffit largement pour voir une évolution."
      />
    );
  }

  function remove(id: string) {
    start(async () => {
      await deleteMeasurementAction(id);
      setConfirming(null);
      router.refresh();
    });
  }

  return (
    <>
      <ul className="space-y-3">
        {entries.map((entry, i) => {
          const previous = entries[i + 1];
          return (
            <li key={entry.id} className="rounded-2xl border border-border bg-surface-2 p-3.5">
              <div className="flex items-center gap-2">
                <p className="flex-1 text-[0.95rem] font-medium capitalize">
                  {formatDate(parseDateKey(entry.date))}
                </p>
                <button
                  onClick={() => onEdit(entry)}
                  aria-label="Modifier ces mensurations"
                  className="flex h-11 w-11 items-center justify-center rounded-2xl text-muted transition-colors hover:bg-surface-3 hover:text-text"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setConfirming(entry.id)}
                  aria-label="Supprimer ces mensurations"
                  className="flex h-11 w-11 items-center justify-center rounded-2xl text-muted transition-colors hover:bg-surface-3 hover:text-danger"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-3">
                {MEASUREMENT_FIELDS.map((f) => {
                  const value = entry.values[f.key as MeasurementKey];
                  if (value == null) return null;
                  const before = previous?.values[f.key as MeasurementKey];
                  const delta = before != null ? value - before : null;
                  return (
                    <div key={f.key} className="flex items-baseline justify-between gap-2">
                      <dt className="truncate text-xs text-subtle">{f.label}</dt>
                      <dd className="tabular shrink-0 text-sm">
                        {formatNumber1(lengthOut(value, unit))}
                        {delta != null && Math.abs(delta) >= 0.05 ? (
                          <span className={delta > 0 ? "ml-1 text-xs text-accent" : "ml-1 text-xs text-info"}>
                            {formatSigned(unit === "in" ? delta / 2.54 : delta)}
                          </span>
                        ) : null}
                      </dd>
                    </div>
                  );
                })}
                {entry.bodyFatPct != null ? (
                  <div className="flex items-baseline justify-between gap-2">
                    <dt className="truncate text-xs text-subtle">Masse grasse</dt>
                    <dd className="tabular shrink-0 text-sm">
                      {entry.bodyFatPct} %
                      {previous?.bodyFatPct != null ? (
                        <span className="ml-1 text-xs text-muted">
                          {formatSigned(entry.bodyFatPct - previous.bodyFatPct)}
                        </span>
                      ) : null}
                    </dd>
                  </div>
                ) : null}
              </dl>

              {entry.note ? <p className="mt-2 text-xs text-subtle">{entry.note}</p> : null}
            </li>
          );
        })}
      </ul>

      <Sheet open={confirming != null} onClose={() => setConfirming(null)} title="Supprimer ce relevé ?">
        <p className="text-sm text-muted">
          Toutes les mesures de cette date seront supprimées. Cette action est irréversible.
        </p>
        <div className="mt-5 flex gap-2">
          <button
            onClick={() => setConfirming(null)}
            className="h-12 flex-1 rounded-2xl border border-border bg-surface-2 font-medium"
          >
            Annuler
          </button>
          <button
            onClick={() => confirming && remove(confirming)}
            disabled={pending}
            className="h-12 flex-1 rounded-2xl bg-danger font-medium text-white disabled:opacity-50"
          >
            Supprimer
          </button>
        </div>
      </Sheet>
    </>
  );
}
