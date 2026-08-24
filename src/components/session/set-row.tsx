"use client";

import { useState } from "react";
import { Check, Trash2 } from "lucide-react";
import { SET_TYPES, type SetType } from "@/lib/constants";
import type { SessionExerciseState, SessionSetState, SessionSettings } from "./types";
import { cn, kgToLb, lbToKg } from "@/lib/utils";
import { Sheet } from "@/components/ui/misc";

/**
 * Une ligne de série.
 *
 * Priorité absolue : encoder en quelques secondes, à une main, sans clavier
 * si possible. Un appui long / un appui sur le numéro ouvre les options
 * (type de série, suppression) pour ne pas encombrer la ligne (§48).
 */
export function SetRow({
  set,
  exercise,
  settings,
  onPatch,
  onToggle,
  onRemove,
}: {
  set: SessionSetState;
  exercise: SessionExerciseState;
  settings: SessionSettings;
  onPatch: (patch: Partial<SessionSetState>) => void;
  onToggle: () => void;
  onRemove: () => void;
}) {
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [focus, setFocus] = useState<"weight" | "reps" | null>(null);

  const unit = settings.weightUnit;
  const isDuration = exercise.trackingType === "duration";
  const isDistance = exercise.trackingType === "distance_duration";
  const isRepsOnly = exercise.trackingType === "reps_only";

  const typeMeta = SET_TYPES[set.type];
  const placeholderReps = exercise.targetRepsMax ?? exercise.targetRepsMin ?? undefined;

  const displayWeight =
    set.weightKg == null ? "" : String(Math.round((unit === "lb" ? kgToLb(set.weightKg) : set.weightKg) * 100) / 100);

  function setWeightFromDisplay(v: string) {
    if (v === "") return onPatch({ weightKg: null });
    const n = Number(v.replace(",", "."));
    if (Number.isNaN(n)) return;
    onPatch({ weightKg: unit === "lb" ? Math.round(lbToKg(n) * 100) / 100 : n });
  }

  function bumpWeight(deltaKg: number) {
    const base = set.weightKg ?? exercise.suggestion?.weightKg ?? 0;
    onPatch({ weightKg: Math.max(0, Math.round((base + deltaKg) * 100) / 100) });
  }

  function bumpReps(delta: number) {
    const base = set.reps ?? placeholderReps ?? 0;
    onPatch({ reps: Math.max(0, base + delta) });
  }

  return (
    <>
      <div
        data-set-row={set.setNumber}
        data-set-completed={set.completed ? "1" : "0"}
        className={cn(
          "rounded-2xl border transition-colors",
          set.completed
            ? "border-accent-border bg-accent-soft"
            : set.type === "W"
              ? "border-border bg-surface-2/50"
              : "border-border bg-surface-2"
        )}
      >
        <div className="grid grid-cols-[2.25rem_1fr_1fr_auto] items-center gap-2 p-2">
          {/* Numéro / type de série */}
          <button
            onClick={() => setOptionsOpen(true)}
            className={cn(
              "tabular flex h-11 w-9 flex-col items-center justify-center rounded-xl text-sm font-semibold transition-colors",
              set.type === "N" ? "bg-surface-3 text-muted" : "bg-surface-3 text-accent"
            )}
            aria-label={`Série ${set.setNumber} — ${typeMeta.label}`}
          >
            {set.type === "N" ? set.setNumber : typeMeta.short}
          </button>

          {/* Champ principal */}
          {isDuration ? (
            <NumberField
              field="duration"
              value={set.durationSec ?? ""}
              placeholder="60"
              suffix="s"
              onChange={(v) => onPatch({ durationSec: v === "" ? null : Number(v) })}
              onFocus={() => setFocus("weight")}
            />
          ) : isDistance ? (
            <NumberField
              field="distance"
              value={set.distanceM != null ? set.distanceM / 1000 : ""}
              placeholder="5"
              suffix="km"
              step="0.01"
              onChange={(v) => onPatch({ distanceM: v === "" ? null : Number(v) * 1000 })}
              onFocus={() => setFocus("weight")}
            />
          ) : isRepsOnly ? (
            <NumberField
              field="weight"
              value={displayWeight}
              placeholder="0"
              suffix={`+${unit}`}
              step="0.5"
              onChange={setWeightFromDisplay}
              onFocus={() => setFocus("weight")}
            />
          ) : (
            <NumberField
              field="weight"
              value={displayWeight}
              placeholder={
                exercise.suggestion?.weightKg
                  ? String(Math.round(exercise.suggestion.weightKg * 10) / 10)
                  : "—"
              }
              step="0.5"
              onChange={setWeightFromDisplay}
              onFocus={() => setFocus("weight")}
            />
          )}

          {/* Champ secondaire */}
          {isDistance ? (
            <NumberField
              field="duration"
              value={set.durationSec != null ? Math.round(set.durationSec / 60) : ""}
              placeholder="30"
              suffix="min"
              onChange={(v) => onPatch({ durationSec: v === "" ? null : Number(v) * 60 })}
              onFocus={() => setFocus("reps")}
            />
          ) : isDuration ? (
            <NumberField
              field="reps"
              value={set.reps ?? ""}
              placeholder="1"
              suffix="×"
              onChange={(v) => onPatch({ reps: v === "" ? null : Number(v) })}
              onFocus={() => setFocus("reps")}
            />
          ) : (
            <NumberField
              field="reps"
              value={set.reps ?? ""}
              placeholder={placeholderReps != null ? String(placeholderReps) : "—"}
              onChange={(v) => onPatch({ reps: v === "" ? null : Number(v) })}
              onFocus={() => setFocus("reps")}
            />
          )}

          {/* Validation */}
          <button
            onClick={onToggle}
            className={cn(
              "flex h-11 w-11 items-center justify-center rounded-xl transition-all active:scale-90",
              set.completed
                ? "bg-accent text-accent-contrast"
                : "bg-surface-3 text-subtle hover:text-muted"
            )}
            aria-label={set.completed ? "Annuler la validation" : "Valider la série"}
            aria-pressed={set.completed}
          >
            <Check className="h-5 w-5" strokeWidth={3} />
          </button>
        </div>

        {/* Pavé rapide — apparaît quand on touche un champ (§8) */}
        {focus && !isDuration && !isDistance ? (
          <div className="flex items-center gap-1.5 border-t border-border px-2 py-2">
            {focus === "weight" ? (
              <>
                <Stepper label={`−${exercise.increment * 2}`} onClick={() => bumpWeight(-exercise.increment * 2)} />
                <Stepper label={`−${exercise.increment}`} onClick={() => bumpWeight(-exercise.increment)} />
                <Stepper label={`+${exercise.increment}`} onClick={() => bumpWeight(exercise.increment)} primary />
                <Stepper label={`+${exercise.increment * 2}`} onClick={() => bumpWeight(exercise.increment * 2)} primary />
              </>
            ) : (
              <>
                <Stepper label="−1" onClick={() => bumpReps(-1)} />
                <Stepper label="+1" onClick={() => bumpReps(1)} primary />
                <Stepper label="+2" onClick={() => bumpReps(2)} primary />
              </>
            )}
            <button
              onClick={() => setFocus(null)}
              className="ml-auto px-3 py-2 text-xs text-subtle"
              aria-label="Masquer le pavé"
            >
              Fermer
            </button>
          </div>
        ) : null}

        {/* RPE / RIR */}
        {(settings.showRpe || settings.showRir) && !isDuration && !isDistance && set.completed ? (
          <div className="flex items-center gap-2 border-t border-border px-3 py-2">
            {settings.showRpe ? (
              <label className="flex items-center gap-2 text-xs text-subtle">
                RPE
                <input
                  type="number"
                  min={1}
                  max={10}
                  step={0.5}
                  value={set.rpe ?? ""}
                  onChange={(e) => onPatch({ rpe: e.target.value === "" ? null : Number(e.target.value) })}
                  className="tabular h-8 w-14 rounded-lg bg-surface-3 px-2 text-center text-sm text-text"
                />
              </label>
            ) : null}
            {settings.showRir ? (
              <label className="flex items-center gap-2 text-xs text-subtle">
                RIR
                <input
                  type="number"
                  min={0}
                  max={10}
                  value={set.rir ?? ""}
                  onChange={(e) => onPatch({ rir: e.target.value === "" ? null : Number(e.target.value) })}
                  className="tabular h-8 w-14 rounded-lg bg-surface-3 px-2 text-center text-sm text-text"
                />
              </label>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* Options de la série */}
      <Sheet open={optionsOpen} onClose={() => setOptionsOpen(false)} title={`Série ${set.setNumber}`}>
        <p className="mb-2 text-xs uppercase tracking-wider text-subtle">Type de série</p>
        <div className="space-y-1.5">
          {(Object.keys(SET_TYPES) as SetType[]).map((t) => (
            <button
              key={t}
              onClick={() => {
                onPatch({ type: t });
                setOptionsOpen(false);
              }}
              className={cn(
                "flex w-full items-center gap-3 rounded-2xl px-3.5 py-3 text-left transition-colors",
                set.type === t ? "bg-accent-soft text-text" : "bg-surface-2 text-muted"
              )}
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-3 text-sm font-bold">
                {SET_TYPES[t].short}
              </span>
              <span className="flex-1">
                <span className="block text-[0.95rem]">{SET_TYPES[t].label}</span>
                {!SET_TYPES[t].countsInStats ? (
                  <span className="block text-xs text-subtle">Exclue des statistiques</span>
                ) : null}
              </span>
              {set.type === t ? <Check className="h-4 w-4 text-accent" /> : null}
            </button>
          ))}
        </div>

        <button
          onClick={() => {
            onRemove();
            setOptionsOpen(false);
          }}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl border border-danger/30 py-3 text-sm font-medium text-danger"
        >
          <Trash2 className="h-4 w-4" />
          Supprimer cette série
        </button>
      </Sheet>
    </>
  );
}

function NumberField({
  value,
  placeholder,
  suffix,
  step,
  field,
  onChange,
  onFocus,
}: {
  value: string | number;
  placeholder?: string;
  suffix?: string;
  step?: string;
  /** Repère stable pour les tests automatisés et l'accessibilité. */
  field?: string;
  onChange: (v: string) => void;
  onFocus?: () => void;
}) {
  return (
    <div className="relative">
      <input
        data-field={field}
        type="number"
        inputMode="decimal"
        step={step ?? "1"}
        value={value}
        placeholder={placeholder}
        onFocus={onFocus}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "tabular h-11 w-full rounded-xl border-0 bg-surface-3 px-2 text-center text-lg font-semibold",
          "text-text placeholder:font-normal placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-[var(--accent)]",
          suffix && "pr-7"
        )}
      />
      {suffix ? (
        <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-subtle">
          {suffix}
        </span>
      ) : null}
    </div>
  );
}

function Stepper({ label, onClick, primary }: { label: string; onClick: () => void; primary?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "tabular h-10 flex-1 rounded-xl text-sm font-semibold transition-all active:scale-95",
        primary ? "bg-accent-soft text-accent" : "bg-surface-3 text-muted"
      )}
    >
      {label}
    </button>
  );
}
