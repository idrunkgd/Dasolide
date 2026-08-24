"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { finishSessionAction } from "@/server/actions/session";
import { Sheet } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/field";
import { CATEGORIES } from "@/lib/constants";
import { cn, formatDuration, formatVolume } from "@/lib/utils";
import type { SessionSettings } from "./types";

/**
 * Résumé de fin de séance (§30) + journal personnel (§29).
 * Rien n'est perdu si l'utilisateur passe le journal : il reste facultatif.
 */
export function FinishSheet({
  open,
  onClose,
  sessionId,
  name,
  elapsed,
  totals,
  muscles,
  beforeFinish,
  onFinished,
  settings,
}: {
  open: boolean;
  onClose: () => void;
  sessionId: string;
  name: string;
  elapsed: number;
  totals: { volume: number; sets: number; reps: number; done: number; total: number };
  muscles: string[];
  beforeFinish: () => Promise<void>;
  onFinished: () => void;
  settings: SessionSettings;
}) {
  const router = useRouter();
  const [step, setStep] = useState<"resume" | "journal">("resume");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const [energy, setEnergy] = useState<number | null>(null);
  const [motivation, setMotivation] = useState<number | null>(null);
  const [sleep, setSleep] = useState("");
  const [stress, setStress] = useState<number | null>(null);
  const [soreness, setSoreness] = useState<number | null>(null);
  const [comment, setComment] = useState("");

  void settings;

  function save() {
    setError(null);
    startTransition(async () => {
      await beforeFinish();
      const result = await finishSessionAction({
        sessionId,
        durationSeconds: elapsed,
        feltEnergy: energy,
        feltMotivation: motivation,
        sleepHours: sleep ? Number(sleep.replace(",", ".")) : null,
        stressLevel: stress,
        soreness,
        feedback: comment.trim() || null,
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }
      onFinished();
      router.push(`/seance/${sessionId}/resume`);
    });
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={step === "resume" ? "Résumé de la séance" : "Comment tu te sens ?"}
      footer={
        step === "resume" ? (
          <div className="flex gap-2">
            <Button variant="secondary" size="lg" onClick={onClose}>
              Continuer
            </Button>
            <Button size="lg" className="flex-1" onClick={() => setStep("journal")}>
              Terminer
            </Button>
          </div>
        ) : (
          <div className="flex gap-2">
            <Button variant="secondary" size="lg" onClick={() => setStep("resume")}>
              Retour
            </Button>
            <Button size="lg" className="flex-1" loading={pending} onClick={save}>
              Enregistrer la séance
            </Button>
          </div>
        )
      }
    >
      {step === "resume" ? (
        <div>
          <p className="text-center text-xs font-medium uppercase tracking-[0.2em] text-accent">
            {name}
          </p>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <SummaryStat label="Durée" value={formatDuration(elapsed)} />
            <SummaryStat label="Volume total" value={formatVolume(totals.volume)} />
            <SummaryStat label="Séries" value={String(totals.sets)} />
            <SummaryStat label="Répétitions" value={String(totals.reps)} />
          </div>

          {muscles.length > 0 ? (
            <div className="mt-4">
              <p className="mb-2 text-xs uppercase tracking-wider text-subtle">Muscles travaillés</p>
              <div className="flex flex-wrap gap-1.5">
                {muscles.map((m) => (
                  <span key={m} className="rounded-lg bg-surface-2 px-2.5 py-1 text-sm text-muted">
                    {CATEGORIES[m as keyof typeof CATEGORIES] ?? m}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {totals.done < totals.total ? (
            <p className="mt-4 rounded-2xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">
              {totals.total - totals.done} série{totals.total - totals.done > 1 ? "s" : ""} non validée
              {totals.total - totals.done > 1 ? "s" : ""} — elles ne seront pas enregistrées.
            </p>
          ) : null}

          {error ? (
            <p className="mt-4 rounded-2xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
              {error}
            </p>
          ) : null}
        </div>
      ) : (
        <div className="space-y-5">
          <p className="text-sm text-muted">
            Facultatif — ces informations serviront plus tard à analyser ta récupération.
          </p>

          <Rating label="Énergie" value={energy} onChange={setEnergy} />
          <Rating label="Motivation" value={motivation} onChange={setMotivation} />
          <Rating label="Stress" value={stress} onChange={setStress} />
          <Rating label="Courbatures" value={soreness} onChange={setSoreness} />

          <div>
            <p className="mb-1.5 text-sm font-medium text-muted">Sommeil (heures)</p>
            <input
              type="number"
              step="0.5"
              min="0"
              max="24"
              value={sleep}
              onChange={(e) => setSleep(e.target.value)}
              placeholder="7,5"
              className="tabular h-12 w-full rounded-2xl border border-border bg-surface-2 px-4 text-text focus:border-accent-border focus:outline-none"
            />
          </div>

          <div>
            <p className="mb-1.5 text-sm font-medium text-muted">Commentaire</p>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Bonne séance, le développé couché monte bien."
              rows={3}
            />
          </div>

          {error ? (
            <p className="rounded-2xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
              {error}
            </p>
          ) : null}
        </div>
      )}
    </Sheet>
  );
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-surface-2 p-4 text-center">
      <p className="text-[0.7rem] uppercase tracking-wider text-subtle">{label}</p>
      <p className="tabular mt-1 text-xl font-bold">{value}</p>
    </div>
  );
}

function Rating({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | null;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <p className="mb-1.5 text-sm font-medium text-muted">{label}</p>
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            aria-label={`${label} : ${n} sur 5`}
            className={cn(
              "tabular h-12 flex-1 rounded-2xl border text-base font-semibold transition-all active:scale-95",
              value === n
                ? "border-accent-border bg-accent-soft text-accent"
                : "border-border bg-surface-2 text-subtle"
            )}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}
