"use client";

import { useMemo, useState } from "react";
import { SegmentedControl } from "@/components/ui/misc";
import { Card } from "@/components/ui/card";
import { formatVolume, formatNumber1, kgToLb, formatNumber } from "@/lib/utils";
import { BodyMap } from "./body-map";
import { MapLegend } from "./map-legend";
import { MuscleSheet } from "./muscle-sheet";
import { MuscleRanking, type MuscleRow } from "./muscle-ranking";
import {
  MAP_MODES,
  MAP_PERIODS,
  UNDRAWN,
  daysSince,
  formatMetric,
  intensity,
  intensityColor,
  metricValue,
  shapeSlug,
  type MapMode,
  type MapPeriod,
  type MuscleExerciseUsage,
  type MuscleStat,
  type PeriodData,
} from "./scale";

export type MuscleMeta = { slug: string; name: string; color: string };

const VIEW_OPTIONS: { value: "avant" | "arriere"; label: string }[] = [
  { value: "avant", label: "Face" },
  { value: "arriere", label: "Dos" },
];

/** Carte des muscles (§15) : silhouettes colorées + classement. */
export function MuscleMapView({
  muscles,
  data,
  unit,
}: {
  muscles: MuscleMeta[];
  data: Record<MapPeriod, PeriodData>;
  unit: "kg" | "lb";
}) {
  const [period, setPeriod] = useState<MapPeriod>("30");
  const [mode, setMode] = useState<MapMode>("volume");
  const [view, setView] = useState<"avant" | "arriere">("avant");
  const [selected, setSelected] = useState<string | null>(null);

  const periodLabel = MAP_PERIODS.find((p) => p.value === period)?.label ?? "";

  /** Regroupe les 24 muscles sur les formes réellement dessinées. */
  const groups = useMemo(() => {
    const current = data[period];
    const statBySlug = new Map(current.stats.map((s) => [s.slug, s]));

    const map = new Map<
      string,
      { slug: string; name: string; stat: MuscleStat | undefined; exercises: MuscleExerciseUsage[] }
    >();

    for (const muscle of muscles) {
      const shape = shapeSlug(muscle.slug);
      const stat = statBySlug.get(muscle.slug);
      const exercises = current.exercises[muscle.slug] ?? [];

      const entry = map.get(shape);
      if (!entry) {
        map.set(shape, {
          slug: shape,
          name: shape === muscle.slug ? muscle.name : muscle.name,
          stat: stat ? { ...stat } : undefined,
          exercises: [...exercises],
        });
        continue;
      }

      if (shape === muscle.slug) entry.name = muscle.name;

      if (stat) {
        if (!entry.stat) {
          entry.stat = { ...stat };
        } else {
          entry.stat = {
            ...entry.stat,
            sets: Math.round((entry.stat.sets + stat.sets) * 10) / 10,
            volume: entry.stat.volume + stat.volume,
            frequency: Math.max(entry.stat.frequency, stat.frequency),
            lastTrained:
              !entry.stat.lastTrained ||
              (stat.lastTrained && new Date(stat.lastTrained) > new Date(entry.stat.lastTrained))
                ? stat.lastTrained
                : entry.stat.lastTrained,
          };
        }
      }

      // Un même exercice peut nourrir plusieurs sous-muscles : on ne le compte
      // qu'une fois, avec sa contribution la plus élevée.
      for (const ex of exercises) {
        const existing = entry.exercises.find((e) => e.id === ex.id);
        if (!existing) entry.exercises.push({ ...ex });
        else {
          existing.sets = Math.max(existing.sets, ex.sets);
          existing.volume = Math.max(existing.volume, ex.volume);
          if (new Date(ex.lastAt) > new Date(existing.lastAt)) existing.lastAt = ex.lastAt;
        }
      }
    }

    for (const entry of map.values()) {
      entry.exercises.sort((a, b) => b.volume - a.volume || b.sets - a.sets);
    }
    return map;
  }, [muscles, data, period]);

  const max = useMemo(() => {
    let m = 0;
    for (const entry of groups.values()) {
      if (UNDRAWN.has(entry.slug)) continue;
      const v = metricValue(entry.stat, mode);
      if (mode !== "recency" && v > m) m = v;
    }
    return m;
  }, [groups, mode]);

  const fillFor = (shape: string) => {
    const entry = groups.get(shape);
    if (!entry?.stat) return intensityColor(0);
    if (mode === "recency" && !entry.stat.lastTrained) return intensityColor(0);
    return intensityColor(intensity(metricValue(entry.stat, mode), max, mode));
  };

  const rows: MuscleRow[] = useMemo(
    () => [...groups.values()].map((g) => ({ slug: g.slug, name: g.name, stat: g.stat })),
    [groups]
  );

  const selectedGroup = selected ? groups.get(selected) : undefined;

  const maxLabel =
    mode === "volume"
      ? unit === "lb"
        ? `${formatNumber(Math.round(kgToLb(max)))} lb`
        : formatVolume(max)
      : mode === "sets"
        ? `${formatNumber1(max)} séries`
        : `${Math.round(max)} séances`;

  return (
    <div className="px-4 pb-8 pt-4">
      <SegmentedControl
        className="mb-2"
        value={period}
        onChange={(v) => setPeriod(v)}
        options={MAP_PERIODS.map((p) => ({ value: p.value, label: p.label }))}
      />
      <SegmentedControl
        className="mb-4"
        value={mode}
        onChange={(v) => setMode(v)}
        options={MAP_MODES}
        size="sm"
      />

      <Card className="mb-4">
        <SegmentedControl
          className="mb-3"
          value={view}
          onChange={(v) => setView(v)}
          options={VIEW_OPTIONS}
          size="sm"
        />

        <div className="flex justify-center">
          <BodyMap
            view={view}
            fillFor={fillFor}
            onSelect={(slug) => setSelected(slug)}
            selected={selected}
            width={320}
          />
        </div>

        <p className="mb-3 mt-1 text-center text-xs text-subtle">
          Touche un muscle pour voir son détail.
        </p>

        <MapLegend mode={mode} maxLabel={maxLabel} />
      </Card>

      <MuscleRanking rows={rows} periodLabel={periodLabel} onSelect={(slug) => setSelected(slug)} />

      <MuscleSheet
        open={selected != null}
        onClose={() => setSelected(null)}
        name={selectedGroup?.name ?? ""}
        periodLabel={periodLabel}
        stat={selectedGroup?.stat}
        exercises={selectedGroup?.exercises ?? []}
        unit={unit}
      />

      <p className="mt-4 px-1 text-xs leading-relaxed text-subtle">
        {mode === "recency"
          ? "Plus la couleur est chaude, plus le muscle a été sollicité récemment."
          : `Couleur calculée sur ${periodLabel}, relativement au muscle le plus travaillé (${maxLabel}).`}{" "}
        {formatMetricHint(rows, mode, unit)}
      </p>
    </div>
  );
}

function formatMetricHint(rows: MuscleRow[], mode: MapMode, unit: "kg" | "lb"): string {
  const top = [...rows]
    .filter((r) => r.stat)
    .sort((a, b) => metricValue(b.stat, mode) - metricValue(a.stat, mode))[0];
  if (!top) return "";
  if (mode === "recency") {
    const d = daysSince(top.stat?.lastTrained ?? null);
    return d == null ? "" : `Muscle le plus récemment travaillé : ${top.name}.`;
  }
  return `Muscle en tête : ${top.name} (${formatMetric(top.stat, mode, unit)}).`;
}
