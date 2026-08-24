"use client";

import { CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatDateShort } from "@/lib/utils";
import {
  ACCENT,
  GRID_COLOR,
  SOFT_LINE,
  axisProps,
  TooltipBox,
  type ChartTooltipProps,
} from "./chart-theme";
import type { WeightUnit } from "./units";

export type WeightChartPoint = {
  /** Horodatage en ms — l'axe X est numérique pour rester à l'échelle du temps. */
  t: number;
  weight: number | null;
  avg: number | null;
};

/**
 * Poids quotidien (points discrets, faible opacité) + moyenne glissante 7 jours
 * (courbe pleine, couleur d'accent). C'est la moyenne qu'il faut lire (§18).
 */
export function WeightChart({
  data,
  unit,
  height = 240,
}: {
  data: WeightChartPoint[];
  unit: WeightUnit;
  height?: number;
}) {
  const values = data.flatMap((d) => [d.weight, d.avg]).filter((v): v is number => v != null);
  const min = values.length ? Math.min(...values) : 0;
  const max = values.length ? Math.max(...values) : 1;
  const pad = Math.max(0.4, (max - min) * 0.15);

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 4, left: -6 }}>
          <CartesianGrid stroke={GRID_COLOR} strokeDasharray="3 5" vertical={false} />
          <XAxis
            {...axisProps}
            dataKey="t"
            type="number"
            scale="time"
            domain={["dataMin", "dataMax"]}
            tickFormatter={(v: number) => formatDateShort(new Date(v))}
            minTickGap={28}
          />
          <YAxis
            {...axisProps}
            width={46}
            domain={[Math.floor((min - pad) * 10) / 10, Math.ceil((max + pad) * 10) / 10]}
            tickFormatter={(v: number) => String(Math.round(v * 10) / 10)}
          />
          <Tooltip
            content={<WeightTooltip unit={unit} />}
            cursor={{ stroke: GRID_COLOR, strokeWidth: 1 }}
          />
          {/* Pesées du jour — volontairement discrètes */}
          <Line
            type="linear"
            dataKey="weight"
            stroke={SOFT_LINE}
            strokeOpacity={0.22}
            strokeWidth={1}
            dot={{ r: 2, fill: SOFT_LINE, fillOpacity: 0.55, strokeWidth: 0 }}
            activeDot={{ r: 3.5, fill: SOFT_LINE, strokeWidth: 0 }}
            connectNulls
            isAnimationActive={false}
          />
          {/* Moyenne glissante 7 jours — la vraie tendance */}
          <Line
            type="monotone"
            dataKey="avg"
            stroke={ACCENT}
            strokeWidth={2.6}
            dot={false}
            activeDot={{ r: 4, fill: ACCENT, strokeWidth: 0 }}
            connectNulls
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

function WeightTooltip({ active, label, payload, unit }: ChartTooltipProps & { unit: WeightUnit }) {
  if (!active || !payload?.length) return null;
  const daily = payload.find((p) => p.dataKey === "weight")?.value;
  const avg = payload.find((p) => p.dataKey === "avg")?.value;
  const lines: React.ReactNode[] = [];
  if (typeof daily === "number") {
    lines.push(
      <span key="d" className="text-muted">
        Pesée : {Math.round(daily * 10) / 10} {unit}
      </span>
    );
  }
  if (typeof avg === "number") {
    lines.push(
      <span key="a" className="font-semibold text-accent">
        Moyenne 7 j : {Math.round(avg * 10) / 10} {unit}
      </span>
    );
  }
  return <TooltipBox title={typeof label === "number" ? formatDateShort(new Date(label)) : ""} lines={lines} />;
}
