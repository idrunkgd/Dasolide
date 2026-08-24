"use client";

import { Trash2 } from "lucide-react";
import { Sheet } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { Field, Input, Label, Textarea } from "@/components/ui/field";
import { NumberInput, Stepper } from "./number-controls";
import { cn, formatDurationHuman } from "@/lib/utils";
import { REST_PRESETS, SUPERSET_LETTERS, type EditorExercise } from "./types";

/** Réglages complets d'un exercice d'une journée (§10). */
export function ExerciseSettingsSheet({
  exercise,
  onChange,
  onRemove,
  onClose,
}: {
  exercise: EditorExercise;
  onChange: (patch: Partial<EditorExercise>) => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  return (
    <Sheet
      open
      onClose={onClose}
      title={exercise.name}
      footer={
        <div className="flex gap-2">
          <Button
            type="button"
            variant="secondary"
            size="lg"
            onClick={() => {
              onRemove();
              onClose();
            }}
            aria-label="Retirer l'exercice"
            className="px-4"
          >
            <Trash2 className="h-4 w-4 text-danger" />
          </Button>
          <Button type="button" size="lg" fullWidth onClick={onClose}>
            Terminé
          </Button>
        </div>
      }
    >
      <div className="space-y-5 pb-2">
        <div>
          <Label>Séries</Label>
          <Stepper
            value={exercise.sets}
            min={1}
            max={20}
            onChange={(sets) => onChange({ sets })}
            suffix={exercise.sets > 1 ? "séries" : "série"}
            decreaseLabel="Retirer une série"
            increaseLabel="Ajouter une série"
          />
        </div>

        <div>
          <Label>Répétitions visées</Label>
          <div className="flex items-center gap-2">
            <NumberInput
              value={exercise.targetRepsMin}
              onChange={(v) => onChange({ targetRepsMin: v })}
              placeholder="min"
              min={1}
              max={100}
            />
            <span className="text-subtle">à</span>
            <NumberInput
              value={exercise.targetRepsMax}
              onChange={(v) => onChange({ targetRepsMax: v })}
              placeholder="max"
              min={1}
              max={100}
            />
          </div>
          <p className="mt-1.5 text-xs text-subtle">
            Laisse la seconde valeur vide pour un nombre de répétitions fixe.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <Field label="Charge (kg)">
            <NumberInput
              value={exercise.targetWeight}
              onChange={(v) => onChange({ targetWeight: v })}
              placeholder="—"
              min={0}
              max={1000}
              step={0.5}
            />
          </Field>
          <Field label="RPE">
            <NumberInput
              value={exercise.targetRpe}
              onChange={(v) => onChange({ targetRpe: v })}
              placeholder="—"
              min={1}
              max={10}
              step={0.5}
            />
          </Field>
          <Field label="RIR">
            <NumberInput
              value={exercise.targetRir}
              onChange={(v) => onChange({ targetRir: v })}
              placeholder="—"
              min={0}
              max={10}
            />
          </Field>
        </div>

        <div>
          <Label>Repos entre les séries</Label>
          <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
            {REST_PRESETS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => onChange({ restSeconds: s })}
                className={cn(
                  "tabular min-h-11 shrink-0 rounded-xl px-3.5 text-sm font-medium transition-colors",
                  exercise.restSeconds === s
                    ? "bg-accent text-accent-contrast"
                    : "bg-surface-2 text-muted"
                )}
              >
                {s < 60 ? `${s} s` : `${Math.floor(s / 60)}′${s % 60 ? String(s % 60) : ""}`}
              </button>
            ))}
          </div>
          <p className="tabular mt-1.5 text-xs text-subtle">
            Repos actuel : {formatDurationHuman(exercise.restSeconds)}
          </p>
        </div>

        <div>
          <Label>Superset</Label>
          <div className="flex gap-1.5">
            <SupersetChip
              active={exercise.supersetGroup == null}
              onClick={() => onChange({ supersetGroup: null })}
            >
              Aucun
            </SupersetChip>
            {SUPERSET_LETTERS.map((letter) => (
              <SupersetChip
                key={letter}
                active={exercise.supersetGroup === letter}
                onClick={() => onChange({ supersetGroup: letter })}
              >
                {letter}
              </SupersetChip>
            ))}
          </div>
          <p className="mt-1.5 text-xs text-subtle">
            Les exercices consécutifs portant la même lettre s&apos;enchaînent sans repos complet.
          </p>
        </div>

        <Field label="Tempo (facultatif)" hint="Format excentrique-pause-concentrique-pause, ex. 3-1-1-0.">
          <Input
            value={exercise.tempo}
            onChange={(e) => onChange({ tempo: e.target.value })}
            placeholder="3-1-1-0"
            maxLength={20}
          />
        </Field>

        <Field label="Notes (facultatif)">
          <Textarea
            value={exercise.notes}
            onChange={(e) => onChange({ notes: e.target.value })}
            placeholder="Prise serrée, garder les coudes rentrés…"
            maxLength={500}
            rows={3}
            className="min-h-20"
          />
        </Field>
      </div>
    </Sheet>
  );
}

function SupersetChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "min-h-11 flex-1 rounded-xl px-3 text-sm font-medium transition-colors",
        active ? "bg-accent text-accent-contrast" : "bg-surface-2 text-muted"
      )}
    >
      {children}
    </button>
  );
}
