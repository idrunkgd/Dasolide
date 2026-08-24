"use client";

import { useState } from "react";
import { History, Trophy } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/misc";
import { SET_TYPES } from "@/lib/constants";
import { formatDate, formatDuration, formatWeightValue, formatVolume, kgToLb, formatNumber } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { HistoryEntry, HistorySet } from "./types";

const BATCH = 12;

/** Onglet « Historique » : chaque séance, série par série (§11). */
export function ExerciseHistory({
  history,
  unit,
}: {
  history: HistoryEntry[];
  unit: "kg" | "lb";
}) {
  const [limit, setLimit] = useState(BATCH);

  if (history.length === 0) {
    return (
      <EmptyState
        icon={<History className="h-6 w-6" />}
        title="Aucune séance enregistrée"
        description="L'historique se remplira automatiquement dès que tu auras réalisé cet exercice."
      />
    );
  }

  return (
    <div className="space-y-3">
      {history.slice(0, limit).map((entry) => {
        const working = entry.sets.filter((s) => s.type !== "W");
        const volume = working.reduce((a, s) => a + (s.weightKg ?? 0) * (s.reps ?? 0), 0);
        const prCount = entry.sets.filter((s) => s.isPr).length;

        return (
          <Card key={entry.sessionId + entry.date}>
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <p className="text-[0.95rem] font-semibold capitalize">{formatDate(entry.date)}</p>
              <p className="tabular text-xs text-subtle">
                {working.length} série{working.length > 1 ? "s" : ""}
                {volume > 0
                  ? ` · ${unit === "lb" ? `${formatNumber(Math.round(kgToLb(volume)))} lb` : formatVolume(volume)}`
                  : ""}
              </p>
            </div>

            {prCount > 0 ? (
              <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-accent">
                <Trophy className="h-3.5 w-3.5" />
                {prCount} record{prCount > 1 ? "s" : ""} lors de cette séance
              </p>
            ) : null}

            <ul className="space-y-1.5">
              {entry.sets.map((set) => (
                <SetLine key={set.id} set={set} unit={unit} />
              ))}
            </ul>
          </Card>
        );
      })}

      {limit < history.length ? (
        <Button variant="secondary" fullWidth size="lg" onClick={() => setLimit((l) => l + BATCH)}>
          Voir plus ({history.length - limit} séances)
        </Button>
      ) : null}
    </div>
  );
}

function SetLine({ set, unit }: { set: HistorySet; unit: "kg" | "lb" }) {
  const type = SET_TYPES[set.type as keyof typeof SET_TYPES];
  const isWarmup = set.type === "W";

  let performance: string;
  if (set.durationSec != null && set.weightKg == null) {
    performance = formatDuration(set.durationSec);
  } else if (set.weightKg != null && set.reps != null) {
    performance = `${formatWeightValue(set.weightKg, unit)} ${unit} × ${set.reps}`;
  } else if (set.reps != null) {
    performance = `${set.reps} reps`;
  } else {
    performance = "—";
  }

  return (
    <li
      className={cn(
        "flex min-h-[2.25rem] items-center gap-3 rounded-xl px-2.5 py-1.5",
        set.isPr ? "bg-accent-soft" : "bg-surface-2"
      )}
    >
      <span className="tabular w-5 shrink-0 text-xs text-subtle">{set.setNumber}</span>
      {isWarmup || set.type !== "N" ? (
        <span className="shrink-0 rounded-md bg-surface-3 px-1.5 py-0.5 text-[0.65rem] font-semibold text-subtle">
          {type?.short ?? set.type}
        </span>
      ) : null}
      <span className={cn("tabular flex-1 text-sm", isWarmup ? "text-subtle" : "font-medium")}>
        {performance}
      </span>
      {set.rpe != null ? (
        <span className="tabular shrink-0 text-xs text-subtle">RPE {set.rpe}</span>
      ) : null}
      {set.isPr ? (
        <span className="flex shrink-0 items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-[0.65rem] font-bold text-accent-contrast">
          <Trophy className="h-3 w-3" />
          Record
        </span>
      ) : null}
    </li>
  );
}
