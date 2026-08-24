"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Sheet } from "@/components/ui/misc";
import { formatDate, formatNumber, formatNumber1, formatVolume, kgToLb } from "@/lib/utils";
import { daysSince, type MuscleExerciseUsage, type MuscleStat } from "./scale";

/** Détail d'un muscle : chiffres de la période + exercices réalisés (§15). */
export function MuscleSheet({
  open,
  onClose,
  name,
  periodLabel,
  stat,
  exercises,
  unit,
}: {
  open: boolean;
  onClose: () => void;
  name: string;
  periodLabel: string;
  stat: MuscleStat | undefined;
  exercises: MuscleExerciseUsage[];
  unit: "kg" | "lb";
}) {
  const since = daysSince(stat?.lastTrained ?? null);
  const volume = stat?.volume ?? 0;

  return (
    <Sheet open={open} onClose={onClose} title={name}>
      <p className="mb-3 text-xs uppercase tracking-wider text-subtle">Sur {periodLabel}</p>

      <div className="grid grid-cols-2 gap-2.5">
        <Tile
          label="Volume"
          value={
            unit === "lb"
              ? `${formatNumber(Math.round(kgToLb(volume)))} lb`
              : formatVolume(volume)
          }
        />
        <Tile label="Séries" value={formatNumber1(stat?.sets ?? 0)} />
        <Tile
          label="Fréquence"
          value={`${stat?.frequency ?? 0} séance${(stat?.frequency ?? 0) > 1 ? "s" : ""}`}
        />
        <Tile
          label="Dernière fois"
          value={
            since == null
              ? "Jamais"
              : since === 0
                ? "Aujourd'hui"
                : since === 1
                  ? "Hier"
                  : `Il y a ${since} j`
          }
          sub={stat?.lastTrained ? formatDate(stat.lastTrained) : undefined}
        />
      </div>

      <p className="mb-2 mt-5 text-xs font-semibold uppercase tracking-[0.12em] text-subtle">
        Exercices réalisés
      </p>

      {exercises.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border px-4 py-6 text-center text-sm text-subtle">
          Aucun exercice sollicitant ce muscle sur la période.
        </p>
      ) : (
        <ul className="space-y-2 pb-2">
          {exercises.map((e) => (
            <li key={e.id}>
              <Link
                href={`/exercices/${e.id}`}
                className="flex min-h-[3.5rem] items-center gap-3 rounded-2xl border border-border bg-surface-2 px-3.5 py-2.5 transition-colors hover:border-border-strong"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{e.name}</p>
                  <p className="tabular truncate text-xs text-subtle">
                    {formatNumber1(e.sets)} séries ·{" "}
                    {unit === "lb"
                      ? `${formatNumber(Math.round(kgToLb(e.volume)))} lb`
                      : formatVolume(e.volume)}{" "}
                    · {formatDate(e.lastAt)}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-subtle" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-4 text-xs leading-relaxed text-subtle">
        Les muscles secondaires comptent pour la moitié des séries et du volume de l&apos;exercice.
        Les séries d&apos;échauffement ne sont jamais comptabilisées.
      </p>
    </Sheet>
  );
}

function Tile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl bg-surface-2 p-3.5">
      <p className="text-[0.7rem] font-medium uppercase tracking-wider text-subtle">{label}</p>
      <p className="tabular mt-1.5 text-lg font-semibold leading-none">{value}</p>
      {sub ? <p className="mt-1 text-xs text-subtle">{sub}</p> : null}
    </div>
  );
}
