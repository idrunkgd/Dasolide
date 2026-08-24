"use client";

import * as React from "react";

/**
 * Réglages communs aux graphiques Recharts.
 *
 * Tout passe par les variables CSS du thème : les courbes restent lisibles en
 * sombre comme en clair, et suivent la couleur d'accent choisie par
 * l'utilisateur.
 */

export const AXIS_COLOR = "var(--text-subtle)";
export const GRID_COLOR = "var(--border)";
export const ACCENT = "var(--accent)";
export const SOFT_LINE = "var(--text-subtle)";

export const axisProps = {
  stroke: AXIS_COLOR,
  tick: { fill: AXIS_COLOR, fontSize: 11 },
  tickLine: false,
  axisLine: false,
} as const;

/** Élément unique utilisé par tous les tooltips (fond surface-2, bord border). */
export function TooltipBox({ title, lines }: { title: string; lines: React.ReactNode[] }) {
  return (
    <div className="rounded-xl border border-border bg-surface-2 px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 font-medium capitalize text-muted">{title}</p>
      {lines.map((line, i) => (
        <p key={i} className="tabular leading-5">
          {line}
        </p>
      ))}
    </div>
  );
}

export type TooltipPayloadItem = {
  dataKey?: string | number;
  value?: number | string;
  name?: string | number;
};

export type ChartTooltipProps = {
  active?: boolean;
  label?: string | number;
  payload?: TooltipPayloadItem[];
};
