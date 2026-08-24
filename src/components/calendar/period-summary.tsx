"use client";

import { CheckCircle2, Percent, TrendingUp } from "lucide-react";
import { ProgressBar } from "@/components/ui/misc";
import { formatVolume } from "@/lib/utils";
import type { CalendarSummary } from "./types";

/** Résumé de la période affichée : réalisé / prévu, volume, régularité. */
export function PeriodSummary({ summary, label }: { summary: CalendarSummary; label: string }) {
  const target = Math.max(summary.planned, summary.done);
  const rate = target > 0 ? Math.round((summary.done / target) * 100) : 0;

  return (
    <div className="card mt-4 p-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-semibold first-letter:uppercase">{label}</h2>
        <span className="tabular text-xs text-subtle">
          {summary.minutes > 0 ? `${summary.minutes} min d'entraînement` : "Aucune séance"}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-3">
        <Metric
          icon={<CheckCircle2 className="h-3.5 w-3.5" />}
          label="Séances"
          value={
            <>
              {summary.done}
              <span className="text-base text-subtle"> / {target || "—"}</span>
            </>
          }
        />
        <Metric
          icon={<TrendingUp className="h-3.5 w-3.5" />}
          label="Volume"
          value={formatVolume(summary.volumeKg)}
        />
        <Metric
          icon={<Percent className="h-3.5 w-3.5" />}
          label="Régularité"
          value={`${rate} %`}
        />
      </div>

      <ProgressBar className="mt-3" value={summary.done} max={target || 1} height={6} />
    </div>
  );
}

function Metric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-1 text-[0.65rem] font-medium uppercase tracking-wider text-subtle">
        {icon}
        <span className="truncate">{label}</span>
      </div>
      <p className="tabular mt-1 text-lg font-semibold leading-none">{value}</p>
    </div>
  );
}
