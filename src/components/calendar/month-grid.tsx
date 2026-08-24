"use client";

import { useDroppable } from "@dnd-kit/core";
import { DAY_SHORT } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { PlannedChip } from "./planned-chip";
import { STATE_DOT, STATE_LABEL, dayState, type CalendarDay } from "./types";

/** Grille du mois : 7 colonnes, une case par jour, chaque case est une cible de dépôt. */
export function MonthGrid({
  days,
  onOpen,
}: {
  days: CalendarDay[];
  onOpen: (key: string) => void;
}) {
  return (
    <div>
      <div className="mb-1 grid grid-cols-7 gap-1">
        {DAY_SHORT.map((d, i) => (
          <div key={`${d}-${i}`} className="py-1 text-center text-[0.65rem] font-medium text-subtle">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => (
          <DayCell key={day.key} day={day} onOpen={() => onOpen(day.key)} />
        ))}
      </div>
    </div>
  );
}

function DayCell({ day, onOpen }: { day: CalendarDay; onOpen: () => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: `day:${day.key}`, data: { dayKey: day.key } });
  const state = dayState(day);

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "relative flex min-h-[3.6rem] flex-col rounded-xl border p-1 transition-colors",
        day.inScope ? "bg-surface-2" : "bg-surface/40",
        isOver ? "border-accent bg-accent-soft" : "border-border",
        day.isToday && "ring-1 ring-accent"
      )}
    >
      <button
        type="button"
        onClick={onOpen}
        aria-label={`${day.key} — ${STATE_LABEL[state]}`}
        className="absolute inset-0 z-0 rounded-xl"
      />

      <div className="pointer-events-none relative z-[1] flex items-center justify-between px-0.5">
        <span
          className={cn(
            "tabular text-[0.7rem] font-medium",
            day.isToday ? "text-accent" : day.inScope ? "text-muted" : "text-subtle/60"
          )}
        >
          {day.dayOfMonth}
        </span>
        {state !== "empty" ? (
          <span className={cn("h-1.5 w-1.5 rounded-full", STATE_DOT[state])} aria-hidden />
        ) : null}
      </div>

      {day.planned?.templateId || day.session ? (
        <PlannedChip day={day} variant="mois" onOpen={onOpen} />
      ) : null}
    </div>
  );
}
