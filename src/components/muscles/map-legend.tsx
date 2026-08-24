"use client";

import { intensityColor, LEGEND_STOPS, RECENCY_LEGEND, type MapMode } from "./scale";

/** Légende explicite de l'échelle de couleurs (§15). */
export function MapLegend({ mode, maxLabel }: { mode: MapMode; maxLabel: string }) {
  const stops = mode === "recency" ? RECENCY_LEGEND : LEGEND_STOPS;

  return (
    <div className="rounded-2xl border border-border bg-surface-2 p-3">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <p className="text-[0.7rem] font-semibold uppercase tracking-wider text-subtle">
          {mode === "recency" ? "Dernière sollicitation" : "Intensité de travail"}
        </p>
        {mode !== "recency" ? (
          <p className="tabular text-[0.7rem] text-subtle">max : {maxLabel}</p>
        ) : null}
      </div>
      <ul className="flex flex-wrap gap-x-3 gap-y-1.5">
        {stops.map((stop) => (
          <li key={stop.label} className="flex items-center gap-1.5">
            <span
              className="h-3.5 w-3.5 rounded-md border border-border"
              style={{ backgroundColor: intensityColor(stop.t) }}
              aria-hidden
            />
            <span className="text-xs text-muted">{stop.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
