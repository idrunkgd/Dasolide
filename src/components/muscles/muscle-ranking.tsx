"use client";

import { AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { formatNumber1 } from "@/lib/utils";
import { daysSince, intensityColor, type MuscleStat } from "./scale";

export type MuscleRow = { slug: string; name: string; stat: MuscleStat | undefined };

/** Classement par nombre de séries + muscles négligés (§15). */
export function MuscleRanking({
  rows,
  periodLabel,
  onSelect,
}: {
  rows: MuscleRow[];
  periodLabel: string;
  onSelect: (slug: string) => void;
}) {
  const ranked = [...rows]
    .filter((r) => (r.stat?.sets ?? 0) > 0)
    .sort((a, b) => (b.stat?.sets ?? 0) - (a.stat?.sets ?? 0));

  const max = ranked[0]?.stat?.sets ?? 0;

  const neglected = rows
    .filter((r) => {
      const since = daysSince(r.stat?.lastTrained ?? null);
      return since == null || since > 10;
    })
    .sort((a, b) => {
      const da = daysSince(a.stat?.lastTrained ?? null) ?? 9999;
      const db = daysSince(b.stat?.lastTrained ?? null) ?? 9999;
      return db - da;
    });

  return (
    <div className="space-y-4">
      <Card>
        <h2 className="mb-1 text-[0.95rem] font-semibold">Classement par séries</h2>
        <p className="mb-3 text-xs text-subtle">Sur {periodLabel}, échauffement exclu.</p>

        {ranked.length === 0 ? (
          <p className="py-4 text-center text-sm text-subtle">
            Aucune série enregistrée sur cette période.
          </p>
        ) : (
          <ul className="space-y-2.5">
            {ranked.map((row) => {
              const sets = row.stat?.sets ?? 0;
              const ratio = max > 0 ? sets / max : 0;
              return (
                <li key={row.slug}>
                  <button
                    type="button"
                    onClick={() => onSelect(row.slug)}
                    className="flex min-h-[2.75rem] w-full items-center gap-3 text-left"
                  >
                    <span className="w-[7.5rem] shrink-0 truncate text-sm">{row.name}</span>
                    <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-surface-3">
                      <span
                        className="block h-full rounded-full transition-[width] duration-500"
                        style={{
                          width: `${Math.max(4, ratio * 100)}%`,
                          backgroundColor: intensityColor(ratio),
                        }}
                      />
                    </span>
                    <span className="tabular w-10 shrink-0 text-right text-xs text-muted">
                      {formatNumber1(sets)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {neglected.length > 0 ? (
        <Card className="border-warning/30 bg-warning/5">
          <div className="mb-2 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <h2 className="text-[0.95rem] font-semibold">Muscles négligés</h2>
          </div>
          <p className="mb-3 text-xs text-muted">
            Aucune sollicitation depuis plus de 10 jours. Ce n&apos;est pas un reproche : à toi de
            voir si c&apos;est volontaire.
          </p>
          <div className="flex flex-wrap gap-2">
            {neglected.map((row) => {
              const since = daysSince(row.stat?.lastTrained ?? null);
              return (
                <button
                  key={row.slug}
                  type="button"
                  onClick={() => onSelect(row.slug)}
                  className="flex min-h-[2.5rem] items-center gap-2 rounded-2xl bg-surface-2 px-3 text-sm text-muted"
                >
                  {row.name}
                  <span className="tabular text-xs text-subtle">
                    {since == null ? "jamais" : `${since} j`}
                  </span>
                </button>
              );
            })}
          </div>
        </Card>
      ) : null}
    </div>
  );
}
