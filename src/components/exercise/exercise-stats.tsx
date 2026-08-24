"use client";

import { Dumbbell, Info, Layers, Repeat, TrendingUp, Trophy } from "lucide-react";
import { Card } from "@/components/ui/card";
import { EmptyState, Stat } from "@/components/ui/misc";
import { formatNumber, formatVolume, formatWeight, kgToLb } from "@/lib/utils";
import { ExerciseChart } from "./exercise-chart";
import type { ExerciseStatsDTO } from "./types";

/** Onglet « Statistiques » de la fiche exercice (§11, §32). */
export function ExerciseStats({
  stats,
  unit,
}: {
  stats: ExerciseStatsDTO;
  unit: "kg" | "lb";
}) {
  if (stats.sessionCount === 0) {
    return (
      <EmptyState
        icon={<TrendingUp className="h-6 w-6" />}
        title="Aucune donnée pour l'instant"
        description="Réalise cet exercice pendant une séance : tes records et tes courbes apparaîtront ici."
      />
    );
  }

  const volumeDisplay = (kg: number) =>
    unit === "lb" ? `${formatNumber(Math.round(kgToLb(kg)))} lb` : formatVolume(kg);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Stat
          label="Charge max"
          value={formatWeight(stats.bestWeight, unit)}
          icon={<Trophy className="h-3.5 w-3.5" />}
        />
        <Stat
          label="Reps max"
          value={<span>{formatNumber(stats.bestReps)}</span>}
          sub="sur une série"
          icon={<Repeat className="h-3.5 w-3.5" />}
        />
        <Stat
          label="Volume max"
          value={volumeDisplay(stats.bestVolumeSet)}
          sub="sur une seule série"
          icon={<Layers className="h-3.5 w-3.5" />}
        />
        <Stat
          label="1RM estimé"
          value={formatWeight(stats.best1rm, unit)}
          sub="estimation (Epley)"
          icon={<Dumbbell className="h-3.5 w-3.5" />}
        />
        <Stat
          label="Séances"
          value={<span>{formatNumber(stats.sessionCount)}</span>}
          sub={`${formatNumber(stats.totalSets)} séries au total`}
        />
        <Stat label="Volume total" value={volumeDisplay(stats.totalVolume)} sub="hors échauffement" />
      </div>

      <Card className="flex items-start gap-2.5 bg-surface-2 py-3">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-subtle" />
        <p className="text-xs leading-relaxed text-muted">
          Le <strong className="font-medium text-text">1RM est une estimation</strong>, calculée avec la
          formule d&apos;Epley : <span className="tabular">charge × (1 + reps / 30)</span>. Elle est fiable
          jusqu&apos;à environ 12 répétitions, puis surestime la charge maximale réelle. Les séries
          d&apos;échauffement sont exclues de toutes ces statistiques.
        </p>
      </Card>

      <Card>
        <h3 className="mb-3 text-[0.95rem] font-semibold">Progression</h3>
        <ExerciseChart series={stats.series} unit={unit} />
      </Card>
    </div>
  );
}
