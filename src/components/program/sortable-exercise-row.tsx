"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Link2 } from "lucide-react";
import { cn, formatDurationHuman } from "@/lib/utils";
import { repRangeLabel, type EditorExercise } from "./types";

/**
 * Une ligne d'exercice, réordonnable au drag & drop.
 *
 * La poignée est explicite (et large) : sur mobile, un glissement démarré
 * n'importe où dans la carte empêcherait de faire défiler la page.
 */
export function SortableExerciseRow({
  exercise,
  index,
  sameGroupAsPrevious,
  onOpen,
}: {
  exercise: EditorExercise;
  index: number;
  sameGroupAsPrevious: boolean;
  onOpen: () => void;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: exercise.key });

  const details = [
    exercise.targetWeight != null ? `${exercise.targetWeight} kg` : null,
    exercise.targetRpe != null ? `RPE ${exercise.targetRpe}` : null,
    exercise.targetRir != null ? `RIR ${exercise.targetRir}` : null,
    exercise.tempo ? `Tempo ${exercise.tempo}` : null,
  ].filter(Boolean);

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(
        "relative flex items-stretch gap-1 rounded-2xl border bg-surface-2",
        exercise.supersetGroup ? "border-accent-border" : "border-border",
        isDragging && "z-20 opacity-90 shadow-lg"
      )}
    >
      {exercise.supersetGroup && sameGroupAsPrevious ? (
        <span
          aria-hidden
          className="absolute -top-2 left-6 h-2 w-0.5 bg-accent-border"
        />
      ) : null}

      <button
        ref={setActivatorNodeRef}
        type="button"
        {...attributes}
        {...listeners}
        aria-label={`Déplacer ${exercise.name}`}
        className="flex w-11 shrink-0 cursor-grab touch-none items-center justify-center rounded-l-2xl text-subtle transition-colors hover:text-muted active:cursor-grabbing"
      >
        <GripVertical className="h-5 w-5" />
      </button>

      <button
        type="button"
        onClick={onOpen}
        className="min-h-[3.5rem] min-w-0 flex-1 py-2.5 pr-3 text-left"
      >
        <div className="flex items-center gap-2">
          {exercise.supersetGroup ? (
            <span className="flex h-5 shrink-0 items-center gap-1 rounded-md bg-accent-soft px-1.5 text-[0.65rem] font-bold text-accent">
              <Link2 className="h-3 w-3" />
              {exercise.supersetGroup}
            </span>
          ) : (
            <span className="tabular w-4 shrink-0 text-xs text-subtle">{index + 1}</span>
          )}
          <span className="truncate text-[0.95rem] font-medium">{exercise.name}</span>
        </div>

        <div className="tabular mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 pl-6 text-xs text-muted">
          <span className="font-medium text-text">
            {exercise.sets} × {repRangeLabel(exercise)}
          </span>
          <span className="text-subtle">repos {formatDurationHuman(exercise.restSeconds)}</span>
          {details.map((d) => (
            <span key={d} className="text-subtle">
              {d}
            </span>
          ))}
        </div>

        {exercise.notes ? (
          <p className="mt-1 truncate pl-6 text-xs italic text-subtle">{exercise.notes}</p>
        ) : null}
      </button>
    </li>
  );
}
