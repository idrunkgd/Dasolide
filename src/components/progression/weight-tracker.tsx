"use client";

import { useMemo, useState } from "react";
import { Info } from "lucide-react";
import { Card, SectionTitle } from "@/components/ui/card";
import { SegmentedControl, Stat } from "@/components/ui/misc";
import { movingAverage, weightTrend } from "@/lib/calc";
import { PERIOD_FILTERS, type PeriodKey } from "@/lib/constants";
import { addDays, formatNumber1, formatSigned, parseDateKey, startOfDay } from "@/lib/utils";
import { WeightChart, type WeightChartPoint } from "./weight-chart";
import { WeightEntryForm, type WeightEntry } from "./weight-entry-form";
import { WeightHistory } from "./weight-history";
import { weightOut, type WeightUnit } from "./units";

/** Page « suivi du poids » : saisie, courbe, statistiques et historique (§18). */
export function WeightTracker({ entries, unit }: { entries: WeightEntry[]; unit: WeightUnit }) {
  const [period, setPeriod] = useState<PeriodKey>("30d");

  const stats = useMemo(() => {
    // `entries` arrive du plus récent au plus ancien : on repasse en ordre
    // chronologique pour tous les calculs de série.
    const asc = [...entries].sort((a, b) => a.date.localeCompare(b.date));
    const points = asc.map((e) => ({ date: parseDateKey(e.date), weightKg: e.weightKg }));

    const avg7 = movingAverage(points, 7);
    const avg30 = movingAverage(points, 30);
    const avgByTime = new Map(avg7.map((p) => [p.date.getTime(), p.value]));

    const cutoff = addDays(startOfDay(), -PERIOD_FILTERS[period].days).getTime();
    const inPeriod = points.filter((p) => p.date.getTime() >= cutoff);

    const chart: WeightChartPoint[] = inPeriod.map((p) => ({
      t: p.date.getTime(),
      weight: p.weightKg,
      avg: avgByTime.get(p.date.getTime()) ?? null,
    }));

    const last = points.at(-1) ?? null;
    const previous = points.at(-2) ?? null;
    const smoothed7 = avg7.at(-1)?.value ?? null;
    const smoothed30 = avg30.at(-1)?.value ?? null;

    /** Moyenne glissante telle qu'elle était il y a `days` jours. */
    const avgAgo = (days: number) => {
      const target = addDays(startOfDay(), -days).getTime();
      let best: number | null = null;
      for (const p of avg7) {
        if (p.date.getTime() <= target) best = p.value;
        else break;
      }
      return best;
    };

    const values = inPeriod.map((p) => p.weightKg);

    return {
      chart,
      count: inPeriod.length,
      last,
      daily: last && previous ? last.weightKg - previous.weightKg : null,
      smoothed7,
      smoothed30,
      change7: smoothed7 != null && avgAgo(7) != null ? smoothed7 - (avgAgo(7) as number) : null,
      change30: smoothed7 != null && avgAgo(30) != null ? smoothed7 - (avgAgo(30) as number) : null,
      trend: weightTrend(points, 30),
      min: values.length ? Math.min(...values) : null,
      max: values.length ? Math.max(...values) : null,
    };
  }, [entries, period]);

  const periodEntries = useMemo(() => {
    const cutoff = addDays(startOfDay(), -PERIOD_FILTERS[period].days).getTime();
    return entries.filter((e) => parseDateKey(e.date).getTime() >= cutoff);
  }, [entries, period]);

  const d = (kg: number) => formatNumber1(weightOut(kg, unit));
  const signed = (kg: number) => formatSigned(unit === "lb" ? kg * 2.20462 : kg);

  return (
    <div className="px-4 pt-4">
      <SectionTitle>Nouvelle pesée</SectionTitle>
      <Card className="mb-5">
        <WeightEntryForm unit={unit} />
      </Card>

      <SectionTitle>Courbe</SectionTitle>
      <Card className="mb-5">
        <SegmentedControl
          className="mb-4"
          size="sm"
          value={period}
          onChange={setPeriod}
          options={Object.entries(PERIOD_FILTERS).map(([key, p]) => ({
            value: key as PeriodKey,
            label: p.label,
          }))}
        />

        {stats.chart.length >= 2 ? (
          <>
            <WeightChart data={stats.chart} unit={unit} />
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-subtle">
              <span className="flex items-center gap-1.5">
                <span className="h-0.5 w-4 rounded-full bg-accent" />
                Moyenne 7 jours
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-subtle" />
                Pesées quotidiennes
              </span>
            </div>
          </>
        ) : (
          <p className="py-10 text-center text-sm text-muted">
            Il faut au moins deux pesées sur la période pour tracer une courbe.
          </p>
        )}

        <p className="mt-4 flex gap-2 rounded-2xl bg-surface-2 p-3 text-xs leading-relaxed text-muted">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-subtle" />
          <span>
            Ne te fie pas aux variations d&apos;un jour à l&apos;autre : elles viennent surtout de
            l&apos;eau, du sel et du contenu digestif. Seule la moyenne glissante sur 7 jours reflète une
            vraie évolution de ta masse corporelle.
          </span>
        </p>
      </Card>

      <SectionTitle>Statistiques</SectionTitle>
      <div className="mb-5 grid grid-cols-2 gap-3">
        <Stat
          label="Dernière pesée"
          value={stats.last ? `${d(stats.last.weightKg)} ${unit}` : "—"}
          sub={
            stats.daily != null ? (
              <span className="tabular">{signed(stats.daily)} {unit} vs veille</span>
            ) : (
              "Première pesée"
            )
          }
        />
        <Stat
          label="Moyenne 7 j"
          value={stats.smoothed7 != null ? `${d(stats.smoothed7)} ${unit}` : "—"}
          sub={
            stats.change7 != null ? (
              <span className={stats.change7 < 0 ? "text-success" : "text-warning"}>
                {signed(stats.change7)} {unit} sur 7 j
              </span>
            ) : (
              "—"
            )
          }
        />
        <Stat
          label="Moyenne 30 j"
          value={stats.smoothed30 != null ? `${d(stats.smoothed30)} ${unit}` : "—"}
          sub={
            stats.change30 != null ? (
              <span className={stats.change30 < 0 ? "text-success" : "text-warning"}>
                {signed(stats.change30)} {unit} sur 30 j
              </span>
            ) : (
              "—"
            )
          }
        />
        <Stat
          label="Tendance"
          value={stats.trend ? `${signed(stats.trend)} ${unit}` : "—"}
          sub="par semaine (30 j)"
        />
        <Stat
          label="Minimum"
          value={stats.min != null ? `${d(stats.min)} ${unit}` : "—"}
          sub={`sur ${PERIOD_FILTERS[period].label}`}
        />
        <Stat
          label="Maximum"
          value={stats.max != null ? `${d(stats.max)} ${unit}` : "—"}
          sub={`${stats.count} pesée${stats.count > 1 ? "s" : ""}`}
        />
      </div>

      <SectionTitle>Historique</SectionTitle>
      <Card className="mb-6 p-2 px-4">
        <WeightHistory entries={periodEntries} unit={unit} />
      </Card>
    </div>
  );
}
