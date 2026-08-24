"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { STATE_CHIP, dayState, type CalendarDay, type DayState } from "./types";

/**
 * Pastille d'une séance prévue.
 *
 * Elle est glissable d'un jour à l'autre. Le glissement n'est jamais le seul
 * moyen de déplacer une séance : la feuille du jour propose un choix de date.
 */
export function PlannedChip({
  day,
  variant,
  onOpen,
}: {
  day: CalendarDay;
  variant: "mois" | "semaine";
  onOpen: () => void;
}) {
  const state = dayState(day);
  const planned = day.planned;
  const movable = Boolean(planned && planned.status !== "completed" && planned.templateId);

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: planned?.id ?? `none-${day.key}`,
    disabled: !movable,
    data: { fromKey: day.key },
  });

  // Une journée basculée en repos affiche « Repos », même si le modèle de
  // séance reste attaché (il permet de la rétablir en un geste). Une journée
  // réalisée affiche le nom de la séance faite, pas celui qui était prévu.
  const label =
    state === "rest"
      ? "Repos"
      : state === "completed"
        ? (day.session?.name ?? planned?.templateName ?? "Séance")
        : (planned?.templateName ?? "Séance");

  if (variant === "mois") {
    return (
      <div
        ref={setNodeRef}
        style={{ transform: CSS.Translate.toString(transform) }}
        // `flex` évite l'espace résiduel sous un bouton inline : sans lui, une
        // fine bande de la case ne réagirait à aucun appui.
        className={cn("relative z-10 mt-auto flex w-full", isDragging && "opacity-40")}
      >
        <button
          type="button"
          onClick={onOpen}
          {...(movable ? { ...attributes, ...listeners } : {})}
          className={cn(
            "block w-full touch-none rounded-md px-1 py-[3px] text-left text-[0.6rem] font-medium leading-tight",
            STATE_CHIP[state]
          )}
        >
          <span className="block truncate">{label}</span>
        </button>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform) }}
      className={cn("relative z-10 flex items-center gap-2", isDragging && "opacity-40")}
    >
      {movable ? (
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label={`Déplacer ${label}`}
          className="flex h-11 w-8 shrink-0 cursor-grab touch-none items-center justify-center rounded-lg text-subtle hover:text-muted active:cursor-grabbing"
        >
          <GripVertical className="h-4 w-4" />
        </button>
      ) : null}
      <button
        type="button"
        onClick={onOpen}
        className={cn(
          "min-h-11 min-w-0 flex-1 rounded-xl px-3 py-2 text-left text-sm font-medium",
          STATE_CHIP[state]
        )}
      >
        <span className="block truncate">{label}</span>
        {planned?.programName ? (
          <span className="block truncate text-[0.7rem] font-normal opacity-80">
            {planned.programName}
          </span>
        ) : null}
      </button>
    </div>
  );
}

/** Rendu léger utilisé dans le `DragOverlay`. */
export function ChipPreview({ label, state }: { label: string; state: DayState }) {
  return (
    <div
      className={cn(
        "rounded-lg px-2 py-1.5 text-xs font-medium shadow-lg",
        STATE_CHIP[state],
        "border border-border-strong bg-surface-3"
      )}
    >
      {label}
    </div>
  );
}
