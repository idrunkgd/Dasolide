"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatDateShort } from "@/lib/utils";
import { ACCENT, GRID_COLOR, axisProps, TooltipBox, type ChartTooltipProps } from "./chart-theme";

export type MeasurePoint = { t: number; value: number };

/** Évolution d'une seule mesure — une courbe, rien d'autre. */
export function MeasurementChart({
  data,
  unitLabel,
  height = 220,
}: {
  data: MeasurePoint[];
  unitLabel: string;
  height?: number;
}) {
  const values = data.map((d) => d.value);
  const min = values.length ? Math.min(...values) : 0;
  const max = values.length ? Math.max(...values) : 1;
  const pad = Math.max(0.5, (max - min) * 0.2);

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 4, left: -6 }}>
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
            cursor={{ stroke: GRID_COLOR, strokeWidth: 1 }}
            content={<MeasureTooltip unitLabel={unitLabel} />}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke={ACCENT}
            strokeWidth={2.4}
            dot={{ r: 3, fill: ACCENT, strokeWidth: 0 }}
            activeDot={{ r: 5, fill: ACCENT, strokeWidth: 0 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function MeasureTooltip({
  active,
  label: axisLabel,
  payload,
  unitLabel,
}: ChartTooltipProps & { unitLabel: string }) {
  if (!active || !payload?.length) return null;
  const value = payload[0]?.value;
  if (typeof value !== "number") return null;
  return (
    <TooltipBox
      title={typeof axisLabel === "number" ? formatDateShort(new Date(axisLabel)) : ""}
      lines={[
        <span key="v" className="font-semibold text-accent">
          {Math.round(value * 10) / 10} {unitLabel}
        </span>,
      ]}
    />
  );
}
