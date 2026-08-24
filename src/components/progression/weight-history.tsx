"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Scale, Trash2 } from "lucide-react";
import { deleteWeightAction } from "@/server/actions/body";
import { Sheet, EmptyState } from "@/components/ui/misc";
import { formatDate, formatNumber1, formatSigned, parseDateKey } from "@/lib/utils";
import { WeightEntryForm, type WeightEntry } from "./weight-entry-form";
import { weightOut, type WeightUnit } from "./units";

/** Historique éditable des pesées (la plus récente en premier). */
export function WeightHistory({ entries, unit }: { entries: WeightEntry[]; unit: WeightUnit }) {
  const router = useRouter();
  const [editing, setEditing] = useState<WeightEntry | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (entries.length === 0) {
    return (
      <EmptyState
        icon={<Scale className="h-6 w-6" />}
        title="Aucune pesée sur cette période"
        description="Encode ton poids le matin, à jeun, après être passé aux toilettes : c'est le moment le plus stable."
      />
    );
  }

  // Le tableau reçu est trié du plus récent au plus ancien.
  function remove(id: string) {
    start(async () => {
      await deleteWeightAction(id);
      setConfirming(null);
      router.refresh();
    });
  }

  return (
    <>
      <ul className="divide-y divide-border">
        {entries.map((entry, i) => {
          const previous = entries[i + 1];
          const delta = previous ? entry.weightKg - previous.weightKg : null;
          return (
            <li key={entry.id} className="flex items-center gap-3 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="tabular text-[0.95rem] font-medium">
                  {formatNumber1(weightOut(entry.weightKg, unit))} {unit}
                  {delta != null ? (
                    <span className={delta === 0 ? "ml-2 text-xs text-subtle" : "ml-2 text-xs text-muted"}>
                      {formatSigned(unit === "lb" ? delta * 2.20462 : delta)} {unit}
                    </span>
                  ) : null}
                </p>
                <p className="text-xs text-subtle">
                  <span className="capitalize">{formatDate(parseDateKey(entry.date))}</span>
                  {entry.bodyFatPct != null ? ` · ${entry.bodyFatPct} % MG` : ""}
                  {entry.note ? ` · ${entry.note}` : ""}
                </p>
              </div>

              <button
                onClick={() => setEditing(entry)}
                aria-label="Modifier la pesée"
                className="flex h-11 w-11 items-center justify-center rounded-2xl text-muted transition-colors hover:bg-surface-2 hover:text-text"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                onClick={() => setConfirming(entry.id)}
                aria-label="Supprimer la pesée"
                className="flex h-11 w-11 items-center justify-center rounded-2xl text-muted transition-colors hover:bg-surface-2 hover:text-danger"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          );
        })}
      </ul>

      <Sheet open={editing != null} onClose={() => setEditing(null)} title="Modifier la pesée">
        {editing ? (
          <WeightEntryForm
            unit={unit}
            initial={editing}
            submitLabel="Mettre à jour"
            onSaved={() => setEditing(null)}
          />
        ) : null}
      </Sheet>

      <Sheet open={confirming != null} onClose={() => setConfirming(null)} title="Supprimer cette pesée ?">
        <p className="text-sm text-muted">
          La pesée sera définitivement retirée de ta courbe. Cette action est irréversible.
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
