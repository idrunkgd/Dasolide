"use client";

import { useState } from "react";
import { SegmentedControl } from "@/components/ui/misc";
import { ExerciseInfo, type ExerciseInfoData } from "./exercise-info";
import { ExerciseStats } from "./exercise-stats";
import { ExerciseHistory } from "./exercise-history";
import type { ExerciseStatsDTO, HistoryEntry } from "./types";

type Tab = "infos" | "stats" | "historique";

const TABS: { value: Tab; label: string }[] = [
  { value: "infos", label: "Infos" },
  { value: "stats", label: "Statistiques" },
  { value: "historique", label: "Historique" },
];

/** Fiche exercice (§11) — trois onglets sur une même page. */
export function ExerciseDetail({
  exercise,
  note,
  stats,
  history,
  unit,
}: {
  exercise: ExerciseInfoData;
  note: string | null;
  stats: ExerciseStatsDTO;
  history: HistoryEntry[];
  unit: "kg" | "lb";
}) {
  const [tab, setTab] = useState<Tab>("infos");

  return (
    <div className="px-4 pb-8 pt-4">
      <SegmentedControl className="mb-4" value={tab} onChange={setTab} options={TABS} />

      {tab === "infos" ? <ExerciseInfo exercise={exercise} note={note} /> : null}
      {tab === "stats" ? <ExerciseStats stats={stats} unit={unit} /> : null}
      {tab === "historique" ? <ExerciseHistory history={history} unit={unit} /> : null}
    </div>
  );
}
