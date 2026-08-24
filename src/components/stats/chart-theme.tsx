"use client";

import type { TooltipProps } from "recharts";

/** Réglages Recharts partagés — lisibles en thème sombre comme en thème clair. */
export const chartGrid = {
  stroke: "var(--border)",
  strokeDasharray: "3 3",
  vertical: false,
} as const;

export const chartAxis = {
  stroke: "var(--text-subtle)",
  tick: { fill: "var(--text-subtle)", fontSize: 11 },
  tickLine: false,
  axisLine: false,
} as const;

export function ChartTooltip({
  active,
  payload,
  label,
  labelFormatter,
  format,
}: TooltipProps<number, string> & {
  labelFormatter?: (label: unknown) => string;
  format?: (value: number | string, name?: string) => string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-xl border border-border bg-surface-2 px-3 py-2 shadow-lg">
      {label != null ? (
        <p className="mb-1 text-xs text-subtle">{labelFormatter ? labelFormatter(label) : String(label)}</p>
      ) : null}
      {payload.map((entry, i) => (
        <p key={i} className="tabular text-sm font-medium" style={{ color: entry.color ?? "var(--text)" }}>
          {entry.name && payload.length > 1 ? `${entry.name} : ` : ""}
          {format ? format(entry.value ?? 0, entry.name) : String(entry.value)}
        </p>
      ))}
    </div>
  );
}
