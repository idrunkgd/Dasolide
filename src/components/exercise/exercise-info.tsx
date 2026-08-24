"use client";

import { ExternalLink } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/misc";
import { CATEGORIES, DIFFICULTIES, EQUIPMENT, MOVEMENT_TYPES, TRACKING_TYPES } from "@/lib/constants";
import { ExerciseNoteCard } from "./exercise-note-card";

export type ExerciseInfoData = {
  id: string;
  name: string;
  description: string | null;
  instructions: string | null;
  category: string;
  equipment: string;
  movementType: string;
  difficulty: string;
  trackingType: string;
  isUnilateral: boolean;
  videoUrl: string | null;
  isCustom: boolean;
  primaryMuscle: { name: string; color: string };
  secondaryMuscles: { name: string; color: string }[];
};

/** Onglet « Infos » de la fiche exercice (§11). */
export function ExerciseInfo({
  exercise,
  note,
}: {
  exercise: ExerciseInfoData;
  note: string | null;
}) {
  const lines = (exercise.instructions ?? "")
    .split(/\n+/)
    .map((l) => l.replace(/^\s*(\d+[.)]|[-•])\s*/, "").trim())
    .filter(Boolean);

  return (
    <div className="space-y-4">
      {exercise.description ? (
        <Card>
          <p className="text-sm leading-relaxed text-muted">{exercise.description}</p>
        </Card>
      ) : null}

      <Card>
        <h3 className="mb-3 text-[0.95rem] font-semibold">Muscles sollicités</h3>
        <div className="flex flex-wrap gap-2">
          <MuscleChip name={exercise.primaryMuscle.name} color={exercise.primaryMuscle.color} primary />
          {exercise.secondaryMuscles.map((m) => (
            <MuscleChip key={m.name} name={m.name} color={m.color} />
          ))}
        </div>
        {exercise.secondaryMuscles.length > 0 ? (
          <p className="mt-2.5 text-xs text-subtle">
            Muscle principal en premier, muscles secondaires ensuite.
          </p>
        ) : null}
      </Card>

      <Card>
        <h3 className="mb-3 text-[0.95rem] font-semibold">Caractéristiques</h3>
        <dl className="space-y-2.5 text-sm">
          <Row label="Catégorie" value={CATEGORIES[exercise.category as keyof typeof CATEGORIES] ?? exercise.category} />
          <Row label="Équipement" value={EQUIPMENT[exercise.equipment as keyof typeof EQUIPMENT] ?? exercise.equipment} />
          <Row
            label="Type de mouvement"
            value={MOVEMENT_TYPES[exercise.movementType as keyof typeof MOVEMENT_TYPES] ?? exercise.movementType}
          />
          <Row
            label="Difficulté"
            value={DIFFICULTIES[exercise.difficulty as keyof typeof DIFFICULTIES] ?? exercise.difficulty}
          />
          <Row
            label="Suivi"
            value={TRACKING_TYPES[exercise.trackingType as keyof typeof TRACKING_TYPES] ?? exercise.trackingType}
          />
          <Row label="Exécution" value={exercise.isUnilateral ? "Unilatérale (un côté à la fois)" : "Bilatérale"} />
        </dl>
      </Card>

      {lines.length > 0 ? (
        <Card>
          <h3 className="mb-3 text-[0.95rem] font-semibold">Exécution</h3>
          <ol className="space-y-2.5">
            {lines.map((line, i) => (
              <li key={i} className="flex gap-3 text-sm leading-relaxed text-muted">
                <span className="tabular mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-lg bg-surface-3 text-[0.7rem] font-semibold text-subtle">
                  {i + 1}
                </span>
                <span>{line}</span>
              </li>
            ))}
          </ol>
        </Card>
      ) : null}

      {exercise.videoUrl ? (
        <a
          href={exercise.videoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-h-[3.25rem] items-center justify-between gap-3 rounded-2xl border border-border bg-surface-2 px-4 py-3 text-sm font-medium transition-colors hover:border-border-strong"
        >
          Voir la vidéo de démonstration
          <ExternalLink className="h-4 w-4 shrink-0 text-subtle" />
        </a>
      ) : null}

      <ExerciseNoteCard exerciseId={exercise.id} initialNote={note} />
    </div>
  );
}

function MuscleChip({ name, color, primary }: { name: string; color: string; primary?: boolean }) {
  return (
    <span
      className={
        primary
          ? "inline-flex items-center gap-2 rounded-full border border-accent-border bg-accent-soft px-3 py-1.5 text-sm font-medium"
          : "inline-flex items-center gap-2 rounded-full bg-surface-2 px-3 py-1.5 text-sm text-muted"
      }
    >
      <span
        className="h-2.5 w-2.5 shrink-0 rounded-full"
        style={{ backgroundColor: color }}
        aria-hidden
      />
      {name}
      {primary ? <Badge tone="accent">Principal</Badge> : null}
    </span>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}
