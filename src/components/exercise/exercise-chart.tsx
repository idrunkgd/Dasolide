"use client";

import { useMemo, useState } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { SegmentedControl } from "@/components/ui/misc";
import { PERIOD_FILTERS, type PeriodKey } from "@/lib/constants";
import { formatDateShort, formatNumber1, kgToLb } from "@/lib/utils";
import {
  ACCENT,
  GRID_COLOR,
  axisProps,
  TooltipBox,
  type ChartTooltipProps,
} from "@/components/progression/chart-theme";
import type { SeriesPoint } from "./types";

type Metric = "weight" | "reps" | "volume" | "oneRm";

const METRICS: { value: Metric; label: string }[] = [
  { value: "weight", label: "Charge" },
  { value: "reps", label: "Reps" },
  { value: "volume", label: "Volume" },
  { value: "oneRm", label: "1RM est." },
];

const PERIOD_OPTIONS = (Object.keys(PERIOD_FILTERS) as PeriodKey[]).map((key) => ({
  value: key,
  label: PERIOD_FILTERS[key].label,
}));

/** Courbe de progression sur un exercice (§11) : métrique + période au choix. */
export function ExerciseChart({
  series,
  unit,
  height = 240,
}: {
  series: SeriesPoint[];
  unit: "kg" | "lb";
  height?: number;
}) {
  const [metric, setMetric] = useState<Metric>("weight");
  const [period, setPeriod] = useState<PeriodKey>("3m");

  const convert = (kg: number) => (unit === "lb" ? kgToLb(kg) : kg);
  const isWeightMetric = metric !== "reps";

  const data = useMemo(() => {
    const cutoff = Date.now() - PERIOD_FILTERS[period].days * 86400000;
    return series
      .filter((p) => p.t >= cutoff)
      .map((p) => ({
        t: p.t,
        value:
          metric === "reps"
            ? p.reps
            : Math.round(convert(metric === "weight" ? p.weight : metric === "volume" ? p.volume : p.oneRm) * 10) /
              10,
      }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [series, period, metric, unit]);

  const suffix = metric === "reps" ? " reps" : ` ${unit}`;
  const label = METRICS.find((m) => m.value === metric)?.label ?? "";

  return (
    <div>
      <SegmentedControl
        className="mb-2"
        value={metric}
        onChange={(v) => setMetric(v)}
        options={METRICS}
        size="sm"
      />
      <SegmentedControl
        className="mb-3"
        value={period}
        onChange={(v) => setPeriod(v)}
        options={PERIOD_OPTIONS}
        size="sm"
      />

      {data.length < 2 ? (
        <div
          className="flex items-center justify-center rounded-2xl border border-dashed border-border px-4 text-center text-sm text-subtle"
          style={{ height }}
        >
          Pas assez de séances sur cette période pour tracer une courbe.
        </div>
      ) : (
        <div style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 4, left: -4 }}>
              <defs>
                <linearGradient id="exercise-area" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.28} />
                  <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
                </linearGradient>
              </defs>
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
                width={48}
                domain={["auto", "auto"]}
                tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 100) / 10} k` : String(Math.round(v)))}
              />
              <Tooltip
                cursor={{ stroke: GRID_COLOR, strokeWidth: 1 }}
                content={<ChartTooltip metricLabel={label} suffix={suffix} />}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="none"
                fill="url(#exercise-area)"
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke={ACCENT}
                strokeWidth={2.6}
                dot={{ r: 2.5, fill: ACCENT, strokeWidth: 0 }}
                activeDot={{ r: 4.5, fill: ACCENT, strokeWidth: 0 }}
                isAnimationActive={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      {metric === "oneRm" ? (
        <p className="mt-2 px-1 text-xs text-subtle">
          Le 1RM est une <strong className="font-medium text-muted">estimation</strong> (formule
          d&apos;Epley) : elle perd en fiabilité au-delà de 12 répétitions.
        </p>
      ) : null}
    </div>
  );
}

function ChartTooltip({
  active,
  label: date,
  payload,
  metricLabel,
  suffix,
}: ChartTooltipProps & { suffix: string; metricLabel?: string }) {
  if (!active || !payload?.length) return null;
  const value = payload[0]?.value;
  if (typeof value !== "number") return null;
  return (
    <TooltipBox
      title={typeof date === "number" ? formatDateShort(new Date(date)) : ""}
      lines={[
        <span key="v" className="font-semibold text-accent">
          {metricLabel ? `${metricLabel} : ` : ""}
          {formatNumber1(value)}
          {suffix}
        </span>,
      ]}
    />
  );
}
