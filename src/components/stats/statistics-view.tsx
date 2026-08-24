"use client";

import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, SectionTitle } from "@/components/ui/card";
import { EmptyState, ProgressBar, SegmentedControl } from "@/components/ui/misc";
import { PERIOD_FILTERS, type PeriodKey } from "@/lib/constants";
import {
  formatDateShort,
  formatDurationHuman,
  formatNumber,
  formatNumber1,
  formatSigned,
  formatVolume,
  formatWeightValue,
} from "@/lib/utils";
import { chartAxis, chartGrid, ChartTooltip } from "@/components/stats/chart-theme";

type StatsData = {
  sessions: {
    id: string;
    name: string;
    date: string;
    durationSeconds: number;
    volume: number;
    sets: number;
    reps: number;
    prCount: number;
  }[];
  weekly: { week: string; volume: number; sessions: number; sets: number }[];
  muscles: { slug: string; name: string; color: string; sets: number; volume: number; frequency: number }[];
  topExercises: { id: string; name: string; category: string; count: number }[];
  nutrition: { date: string; kcal: number; protein: number; carbs: number; fat: number }[];
  nutritionGoal: { kcal: number; protein: number; carbs: number; fat: number } | null;
  weight: { date: string; weightKg: number }[];
  weightAvg7: { date: string; value: number }[];
  trendPerWeek: number;
  recordsCount: number;
  plannedCount: number;
  daysWithNutrition: number;
  daysWithWeight: number;
  windowDays: number;
  consistency: { score: number; parts: { label: string; value: number; weight: number }[] };
};

export function StatisticsView({
  period,
  unit,
  data,
  consistencyEnabled,
}: {
  period: PeriodKey;
  unit: "kg" | "lb";
  data: StatsData;
  consistencyEnabled: boolean;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [tab, setTab] = useState<"entrainement" | "progression" | "nutrition">("entrainement");

  function setPeriod(p: PeriodKey) {
    const next = new URLSearchParams(params.toString());
    next.set("p", p);
    router.push(`/statistiques?${next}`);
  }

  const totals = useMemo(() => {
    const volume = data.sessions.reduce((a, s) => a + s.volume, 0);
    const sets = data.sessions.reduce((a, s) => a + s.sets, 0);
    const reps = data.sessions.reduce((a, s) => a + s.reps, 0);
    const seconds = data.sessions.reduce((a, s) => a + s.durationSeconds, 0);
    const weeks = Math.max(1, data.windowDays / 7);
    return {
      volume,
      sets,
      reps,
      seconds,
      perWeek: data.sessions.length / weeks,
      avgDuration: data.sessions.length ? seconds / data.sessions.length : 0,
    };
  }, [data]);

  const nutritionAverages = useMemo(() => {
    const days = data.nutrition.filter((d) => d.kcal > 0);
    if (days.length === 0) return null;
    const avg = (key: "kcal" | "protein" | "carbs" | "fat") =>
      days.reduce((a, d) => a + d[key], 0) / days.length;
    const goal = data.nutritionGoal;
    const withinKcal = goal
      ? days.filter((d) => Math.abs(d.kcal - goal.kcal) <= goal.kcal * 0.1).length
      : 0;
    const proteinHit = goal ? days.filter((d) => d.protein >= goal.protein * 0.9).length : 0;
    return {
      days: days.length,
      kcal: avg("kcal"),
      protein: avg("protein"),
      carbs: avg("carbs"),
      fat: avg("fat"),
      withinKcal,
      proteinHit,
    };
  }, [data]);

  const maxSets = Math.max(1, ...data.muscles.map((m) => m.sets));

  return (
    <div className="px-4 pt-4">
      <SegmentedControl
        className="mb-3"
        value={tab}
        onChange={setTab}
        options={[
          { value: "entrainement", label: "Entraînement" },
          { value: "progression", label: "Progression" },
          { value: "nutrition", label: "Nutrition" },
        ]}
      />

      <div className="no-scrollbar mb-5 flex gap-1.5 overflow-x-auto">
        {(Object.keys(PERIOD_FILTERS) as PeriodKey[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={
              p === period
                ? "shrink-0 rounded-xl bg-accent px-3 py-1.5 text-xs font-medium text-accent-contrast"
                : "shrink-0 rounded-xl bg-surface-2 px-3 py-1.5 text-xs font-medium text-muted"
            }
          >
            {PERIOD_FILTERS[p].label}
          </button>
        ))}
      </div>

      {/* ---------------------------------------------------- Entraînement */}
      {tab === "entrainement" ? (
        data.sessions.length === 0 ? (
          <EmptyState
            title="Aucune séance sur la période"
            description="Change de période ou enregistre une séance pour voir tes statistiques."
          />
        ) : (
          <>
            <div className="mb-5 grid grid-cols-2 gap-3">
              <Stat label="Séances" value={String(data.sessions.length)} sub={`${formatNumber1(totals.perWeek)} / semaine`} />
              <Stat label="Volume total" value={formatVolume(totals.volume)} sub={`${formatNumber(totals.sets)} séries`} />
              <Stat label="Durée moyenne" value={formatDurationHuman(totals.avgDuration)} sub={`${formatDurationHuman(totals.seconds)} au total`} />
              <Stat label="Records" value={String(data.recordsCount)} sub="sur la période" />
            </div>

            <SectionTitle>Volume par semaine</SectionTitle>
            <Card className="mb-5">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data.weekly} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
                  <CartesianGrid {...chartGrid} />
                  <XAxis
                    dataKey="week"
                    {...chartAxis}
                    tickFormatter={(v: string) => formatDateShort(v)}
                    minTickGap={24}
                  />
                  <YAxis {...chartAxis} tickFormatter={(v: number) => `${Math.round(v / 1000)}t`} />
                  <Tooltip
                    content={
                      <ChartTooltip
                        labelFormatter={(v) => `Semaine du ${formatDateShort(String(v))}`}
                        format={(value) => `${formatVolume(Number(value))}`}
                      />
                    }
                    cursor={{ fill: "var(--surface-2)" }}
                  />
                  <Bar dataKey="volume" fill="var(--accent)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            <SectionTitle>Séries par muscle</SectionTitle>
            <Card className="mb-5">
              {data.muscles.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted">Aucune donnée.</p>
              ) : (
                <ul className="space-y-2.5">
                  {data.muscles.slice(0, 12).map((m) => (
                    <li key={m.slug}>
                      <div className="mb-1 flex items-baseline justify-between text-sm">
                        <span className="text-muted">{m.name}</span>
                        <span className="tabular text-xs text-subtle">
                          {m.sets} séries · {m.frequency}×
                        </span>
                      </div>
                      <ProgressBar value={m.sets} max={maxSets} color={m.color} height={6} />
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-3 text-xs text-subtle">
                Les muscles secondaires comptent pour une demi-série.
              </p>
            </Card>

            <SectionTitle>Exercices les plus réalisés</SectionTitle>
            <Card className="mb-5 p-0">
              <ul>
                {data.topExercises.map((e, i) => (
                  <li key={e.id} className="border-b border-border last:border-0">
                    <Link
                      href={`/exercices/${e.id}`}
                      className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-2"
                    >
                      <span className="tabular w-5 text-sm text-subtle">{i + 1}</span>
                      <span className="min-w-0 flex-1 truncate text-[0.95rem]">{e.name}</span>
                      <span className="tabular shrink-0 text-sm text-muted">{e.count}×</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>

            {consistencyEnabled ? <ConsistencyCard data={data} /> : null}
          </>
        )
      ) : null}

      {/* ---------------------------------------------------- Progression */}
      {tab === "progression" ? (
        data.weight.length === 0 ? (
          <EmptyState
            title="Aucune pesée sur la période"
            description="Encode ton poids régulièrement pour voir apparaître ta tendance."
          />
        ) : (
          <>
            <div className="mb-5 grid grid-cols-2 gap-3">
              <Stat
                label="Poids actuel"
                value={`${formatWeightValue(data.weight.at(-1)?.weightKg ?? 0, unit)} ${unit}`}
              />
              <Stat
                label="Tendance"
                value={`${formatSigned(data.trendPerWeek, 2)} ${unit}/sem`}
                sub={data.trendPerWeek < 0 ? "en baisse" : data.trendPerWeek > 0 ? "en hausse" : "stable"}
              />
              <Stat label="Pesées" value={String(data.daysWithWeight)} sub={`sur ${data.windowDays} jours`} />
              <Stat label="Records" value={String(data.recordsCount)} sub="sur la période" />
            </div>

            <SectionTitle>Poids corporel</SectionTitle>
            <Card className="mb-5">
              <ResponsiveContainer width="100%" height={220}>
                <LineChart margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid {...chartGrid} />
                  <XAxis
                    dataKey="date"
                    type="category"
                    allowDuplicatedCategory={false}
                    {...chartAxis}
                    tickFormatter={(v: string) => formatDateShort(v)}
                    minTickGap={28}
                  />
                  <YAxis {...chartAxis} domain={["dataMin - 1", "dataMax + 1"]} tickFormatter={(v: number) => v.toFixed(0)} />
                  <Tooltip
                    content={
                      <ChartTooltip
                        labelFormatter={(v) => formatDateShort(String(v))}
                        format={(value) => `${formatWeightValue(Number(value), unit)} ${unit}`}
                      />
                    }
                  />
                  <Line
                    data={data.weight}
                    dataKey="weightKg"
                    name="Pesée"
                    stroke="var(--text-subtle)"
                    strokeWidth={1}
                    dot={{ r: 1.5 }}
                    opacity={0.45}
                    isAnimationActive={false}
                  />
                  <Line
                    data={data.weightAvg7}
                    dataKey="value"
                    name="Moyenne 7 jours"
                    stroke="var(--accent)"
                    strokeWidth={2.5}
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
              <p className="mt-2 text-xs text-subtle">
                La courbe épaisse est la moyenne glissante sur 7 jours : c&apos;est elle qui reflète la
                vraie tendance.
              </p>
            </Card>

            <SectionTitle>Volume par séance</SectionTitle>
            <Card className="mb-5">
              <ResponsiveContainer width="100%" height={190}>
                <LineChart data={data.sessions} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
                  <CartesianGrid {...chartGrid} />
                  <XAxis dataKey="date" {...chartAxis} tickFormatter={(v: string) => formatDateShort(v)} minTickGap={28} />
                  <YAxis {...chartAxis} tickFormatter={(v: number) => `${Math.round(v / 1000)}t`} />
                  <Tooltip
                    content={
                      <ChartTooltip
                        labelFormatter={(v) => formatDateShort(String(v))}
                        format={(value) => formatVolume(Number(value))}
                      />
                    }
                  />
                  <Line dataKey="volume" stroke="var(--info)" strokeWidth={2} dot={{ r: 2 }} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </Card>
          </>
        )
      ) : null}

      {/* ------------------------------------------------------- Nutrition */}
      {tab === "nutrition" ? (
        !nutritionAverages ? (
          <EmptyState
            title="Aucune journée encodée"
            description="Renseigne ton alimentation pour voir tes moyennes et ton respect des objectifs."
          />
        ) : (
          <>
            <div className="mb-5 grid grid-cols-2 gap-3">
              <Stat label="Calories moyennes" value={`${Math.round(nutritionAverages.kcal)}`} sub="kcal / jour encodé" />
              <Stat label="Protéines moyennes" value={`${Math.round(nutritionAverages.protein)} g`} />
              <Stat label="Jours encodés" value={`${nutritionAverages.days}`} sub={`sur ${data.windowDays} jours`} />
              <Stat
                label="Objectif respecté"
                value={
                  data.nutritionGoal
                    ? `${Math.round((nutritionAverages.withinKcal / nutritionAverages.days) * 100)} %`
                    : "—"
                }
                sub="à ±10 % des calories"
              />
            </div>

            <SectionTitle>Calories par jour</SectionTitle>
            <Card className="mb-5">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data.nutrition} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
                  <CartesianGrid {...chartGrid} />
                  <XAxis dataKey="date" {...chartAxis} tickFormatter={(v: string) => formatDateShort(v)} minTickGap={28} />
                  <YAxis {...chartAxis} />
                  <Tooltip
                    content={
                      <ChartTooltip
                        labelFormatter={(v) => formatDateShort(String(v))}
                        format={(value) => `${Math.round(Number(value))} kcal`}
                      />
                    }
                    cursor={{ fill: "var(--surface-2)" }}
                  />
                  <Bar dataKey="kcal" fill="var(--accent)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              {data.nutritionGoal ? (
                <p className="tabular mt-2 text-xs text-subtle">
                  Objectif : {Math.round(data.nutritionGoal.kcal)} kcal · protéines atteintes{" "}
                  {nutritionAverages.proteinHit} jour
                  {nutritionAverages.proteinHit > 1 ? "s" : ""} sur {nutritionAverages.days}
                </p>
              ) : null}
            </Card>

            <SectionTitle>Répartition moyenne</SectionTitle>
            <Card className="mb-5 space-y-3">
              <MacroRow label="Protéines" value={nutritionAverages.protein} goal={data.nutritionGoal?.protein} color="var(--accent)" />
              <MacroRow label="Glucides" value={nutritionAverages.carbs} goal={data.nutritionGoal?.carbs} color="var(--info)" />
              <MacroRow label="Lipides" value={nutritionAverages.fat} goal={data.nutritionGoal?.fat} color="var(--warning)" />
            </Card>
          </>
        )
      ) : null}
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="card p-3.5">
      <p className="text-[0.7rem] uppercase tracking-wider text-subtle">{label}</p>
      <p className="tabular mt-1.5 text-xl font-semibold leading-none">{value}</p>
      {sub ? <p className="mt-1.5 text-xs text-muted">{sub}</p> : null}
    </div>
  );
}

function MacroRow({
  label,
  value,
  goal,
  color,
}: {
  label: string;
  value: number;
  goal?: number;
  color: string;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between text-sm">
        <span className="text-muted">{label}</span>
        <span className="tabular font-medium">
          {Math.round(value)} g{goal ? <span className="text-subtle"> / {Math.round(goal)} g</span> : null}
        </span>
      </div>
      <ProgressBar value={value} max={goal ?? value} color={color} height={6} />
    </div>
  );
}

function ConsistencyCard({ data }: { data: StatsData }) {
  const { score, parts } = data.consistency;
  return (
    <>
      <SectionTitle>Régularité</SectionTitle>
      <Card className="mb-6">
        <div className="flex items-center gap-4">
          <div className="tabular text-4xl font-bold text-accent">{score}</div>
          <div className="min-w-0 flex-1">
            <p className="text-sm text-muted">
              {score >= 80
                ? "Très régulier. C'est ce qui fait la différence sur la durée."
                : score >= 55
                  ? "Bonne base. Un peu plus de constance et la courbe s'envole."
                  : "Chaque séance compte. Reprends à ton rythme, sans pression."}
            </p>
          </div>
        </div>
        <div className="mt-4 space-y-2.5">
          {parts.map((p) => (
            <div key={p.label}>
              <div className="mb-1 flex items-baseline justify-between text-sm">
                <span className="text-muted">{p.label}</span>
                <span className="tabular text-xs text-subtle">{Math.round(p.value * 100)} %</span>
              </div>
              <ProgressBar value={p.value} max={1} height={5} />
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-subtle">
          Indicateur indicatif, désactivable dans les paramètres. Il n&apos;est pas là pour culpabiliser.
        </p>
      </Card>
    </>
  );
}
