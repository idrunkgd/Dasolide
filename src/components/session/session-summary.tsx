"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CATEGORIES, PR_TYPES, SET_TYPES } from "@/lib/constants";
import { cn, formatDate, formatDuration, formatSigned, formatVolume, formatWeightValue } from "@/lib/utils";

type SummarySession = {
  id: string;
  name: string;
  startedAt: string;
  durationSeconds: number;
  totalVolumeKg: number;
  totalSets: number;
  totalReps: number;
  feedback: string | null;
  muscles: string[];
  exercises: {
    id: string;
    name: string;
    sets: {
      type: string;
      weightKg: number | null;
      reps: number | null;
      rpe: number | null;
      durationSec: number | null;
      distanceM: number | null;
      isPr: boolean;
    }[];
  }[];
  records: {
    id: string;
    type: string;
    value: number;
    previousValue: number | null;
    weightKg: number | null;
    reps: number | null;
    exerciseName: string;
  }[];
};

export function SessionSummaryView({
  session,
  previousVolume,
  unit,
}: {
  session: SummarySession;
  previousVolume: number | null;
  unit: "kg" | "lb";
}) {
  // Un seul record mis en avant par exercice — la charge maximale prime sur le
  // 1RM estimé — et trois au maximum pour que l'écran reste lisible.
  const highlighted = (() => {
    const byExercise = new Map<string, SummarySession["records"][number]>();
    for (const r of session.records) {
      if (r.type !== "max_weight" && r.type !== "estimated_1rm") continue;
      const current = byExercise.get(r.exerciseName);
      if (!current || (current.type === "estimated_1rm" && r.type === "max_weight")) {
        byExercise.set(r.exerciseName, r);
      }
    }
    return [...byExercise.values()].slice(0, 3);
  })();

  const [showCelebration, setShowCelebration] = useState(highlighted.length > 0);

  useEffect(() => {
    if (!showCelebration) return;
    const timer = window.setTimeout(() => setShowCelebration(false), 4200);
    return () => window.clearTimeout(timer);
  }, [showCelebration]);

  const volumeDelta =
    previousVolume && previousVolume > 0
      ? ((session.totalVolumeKg - previousVolume) / previousVolume) * 100
      : null;

  return (
    <div className="relative min-h-dvh px-4 pb-10 pt-8">
      {showCelebration ? <Confetti /> : null}

      <div className="animate-fade-up text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-accent-soft">
          <Trophy className="h-8 w-8 text-accent" />
        </div>
        <p className="mt-4 text-xs font-medium uppercase tracking-[0.25em] text-subtle">
          Séance terminée
        </p>
        <h1 className="mt-1 text-3xl font-bold">{session.name}</h1>
        <p className="mt-1 text-sm text-muted">{formatDate(session.startedAt)}</p>
      </div>

      {/* Records */}
      {highlighted.length > 0 ? (
        <div className="mt-7 space-y-2.5">
          {highlighted.map((r, i) => (
            <div
              key={r.id}
              className="animate-pop rounded-3xl border border-accent-border bg-accent-soft p-4"
              style={{ animationDelay: `${i * 110}ms` }}
            >
              <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-accent">
                🏆 Nouveau record
              </p>
              <p className="mt-1.5 text-lg font-bold">{r.exerciseName}</p>
              <p className="tabular mt-0.5 text-2xl font-bold text-accent">
                {r.type === "estimated_1rm"
                  ? `${formatWeightValue(r.value, unit)} ${unit} de 1RM estimé`
                  : `${formatWeightValue(r.value, unit)} ${unit}${r.reps ? ` × ${r.reps}` : ""}`}
              </p>
              {r.previousValue ? (
                <p className="tabular mt-1 text-sm text-muted">
                  Ancien record : {formatWeightValue(r.previousValue, unit)} {unit}
                </p>
              ) : (
                <p className="mt-1 text-sm text-muted">Premier record sur cet exercice.</p>
              )}
            </div>
          ))}
        </div>
      ) : null}

      {/* Chiffres clés */}
      <div className="mt-7 grid grid-cols-2 gap-3">
        <BigStat label="Durée" value={formatDuration(session.durationSeconds)} />
        <BigStat
          label="Volume total"
          value={formatVolume(session.totalVolumeKg)}
          sub={
            volumeDelta != null ? (
              <span className={volumeDelta >= 0 ? "text-success" : "text-muted"}>
                {formatSigned(volumeDelta, 0)} % vs dernière fois
              </span>
            ) : undefined
          }
        />
        <BigStat label="Séries" value={String(session.totalSets)} />
        <BigStat label="Répétitions" value={String(session.totalReps)} />
      </div>

      {session.records.length > 0 ? (
        <p className="mt-3 text-center text-sm text-muted">
          {session.records.length} record{session.records.length > 1 ? "s" : ""} battu
          {session.records.length > 1 ? "s" : ""} 🏆
        </p>
      ) : null}

      {session.muscles.length > 0 ? (
        <div className="mt-5 flex flex-wrap justify-center gap-1.5">
          {session.muscles.map((m) => (
            <span key={m} className="rounded-lg bg-surface-2 px-2.5 py-1 text-sm text-muted">
              {CATEGORIES[m as keyof typeof CATEGORIES] ?? m}
            </span>
          ))}
        </div>
      ) : null}

      {/* Détail */}
      <div className="mt-7 space-y-3">
        {session.exercises.map((e) => (
          <Card key={e.id} className="p-4">
            <p className="font-semibold">{e.name}</p>
            <div className="mt-2 space-y-1">
              {e.sets.map((s, i) => (
                <div key={i} className="tabular flex items-center gap-3 text-sm">
                  <span
                    className={cn(
                      "w-5 shrink-0 text-center text-xs",
                      s.type === "W" ? "text-warning" : "text-subtle"
                    )}
                  >
                    {s.type === "N" ? i + 1 : SET_TYPES[s.type as keyof typeof SET_TYPES]?.short}
                  </span>
                  <span className="flex-1 text-muted">
                    {s.weightKg != null ? `${formatWeightValue(s.weightKg, unit)} ${unit}` : ""}
                    {s.weightKg != null && s.reps != null ? " × " : ""}
                    {s.reps != null ? s.reps : ""}
                    {s.durationSec != null ? ` ${s.durationSec}s` : ""}
                    {s.distanceM != null ? ` ${(s.distanceM / 1000).toFixed(2)} km` : ""}
                  </span>
                  {s.rpe ? <span className="text-xs text-subtle">RPE {s.rpe}</span> : null}
                  {s.isPr ? <Trophy className="h-3.5 w-3.5 text-accent" /> : null}
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>

      {session.records.length > highlighted.length ? (
        <Card className="mt-3">
          <p className="mb-2 text-xs uppercase tracking-wider text-subtle">Autres records</p>
          <ul className="space-y-1 text-sm text-muted">
            {session.records
              .filter((r) => !highlighted.some((h) => h.id === r.id))
              .map((r) => (
                <li key={r.id} className="tabular flex justify-between gap-3">
                  <span className="truncate">{r.exerciseName}</span>
                  <span className="shrink-0 text-subtle">
                    {PR_TYPES[r.type as keyof typeof PR_TYPES]} · {Math.round(r.value * 10) / 10}
                  </span>
                </li>
              ))}
          </ul>
        </Card>
      ) : null}

      {session.feedback ? (
        <Card className="mt-3">
          <p className="mb-1 text-xs uppercase tracking-wider text-subtle">Ton commentaire</p>
          <p className="text-sm text-muted">{session.feedback}</p>
        </Card>
      ) : null}

      <div className="mt-8 space-y-2">
        <Link href="/" className="block">
          <Button size="xl" fullWidth>
            Retour à l&apos;accueil
          </Button>
        </Link>
        <Link href="/historique" className="block">
          <Button variant="secondary" size="lg" fullWidth>
            Voir l&apos;historique
          </Button>
        </Link>
      </div>
    </div>
  );
}

function BigStat({ label, value, sub }: { label: string; value: string; sub?: React.ReactNode }) {
  return (
    <div className="card p-4 text-center">
      <p className="text-[0.7rem] uppercase tracking-wider text-subtle">{label}</p>
      <p className="tabular mt-1 text-2xl font-bold">{value}</p>
      {sub ? <p className="mt-1 text-xs">{sub}</p> : null}
    </div>
  );
}

/** Confettis CSS — aucun paquet supplémentaire, et respectueux de prefers-reduced-motion. */
function Confetti() {
  const pieces = Array.from({ length: 36 }, (_, i) => i);
  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden" aria-hidden>
      {pieces.map((i) => {
        const left = (i * 37) % 100;
        const delay = (i % 12) * 0.13;
        const duration = 2.4 + ((i * 7) % 10) / 10;
        const colors = ["var(--accent)", "var(--warning)", "var(--info)", "var(--success)"];
        return (
          <span
            key={i}
            className="absolute top-0 block h-2.5 w-1.5 rounded-sm"
            style={{
              left: `${left}%`,
              background: colors[i % colors.length],
              animation: `confetti-fall ${duration}s ${delay}s cubic-bezier(0.3, 0.7, 0.5, 1) forwards`,
            }}
          />
        );
      })}
    </div>
  );
}
