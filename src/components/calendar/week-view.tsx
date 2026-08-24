"use client";

import { useDroppable } from "@dnd-kit/core";
import { Plus } from "lucide-react";
import { DAY_LABELS } from "@/lib/constants";
import { cn, parseDateKey } from "@/lib/utils";
import { PlannedChip } from "./planned-chip";
import { STATE_DOT, STATE_LABEL, dayState, type CalendarDay } from "./types";

/** Vue semaine : une ligne par jour, cibles de dépôt larges et confortables. */
export function WeekView({
  days,
  onOpen,
}: {
  days: CalendarDay[];
  onOpen: (key: string) => void;
}) {
  return (
    <div className="space-y-2">
      {days.map((day) => (
        <WeekRow key={day.key} day={day} onOpen={() => onOpen(day.key)} />
      ))}
    </div>
  );
}

function WeekRow({ day, onOpen }: { day: CalendarDay; onOpen: () => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: `day:${day.key}`, data: { dayKey: day.key } });
  const state = dayState(day);
  const date = parseDateKey(day.key);
  const weekday = DAY_LABELS[(date.getDay() + 6) % 7];

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "relative rounded-2xl border p-3 transition-colors",
        isOver ? "border-accent bg-accent-soft" : "border-border bg-surface",
        day.isToday && "ring-1 ring-accent"
      )}
    >
      <div className="flex items-center gap-3">
        <div className="w-16 shrink-0">
          <p
            className={cn(
              "text-xs font-medium capitalize",
              day.isToday ? "text-accent" : "text-muted"
            )}
          >
            {weekday.slice(0, 3)}
          </p>
          <p className="tabular text-lg font-semibold leading-tight">{day.dayOfMonth}</p>
        </div>

        <div className="min-w-0 flex-1">
          {day.planned?.templateId || day.session ? (
            <PlannedChip day={day} variant="semaine" onOpen={onOpen} />
          ) : (
            <button
              type="button"
              onClick={onOpen}
              className="flex min-h-11 w-full items-center gap-2 rounded-xl px-3 text-left text-sm text-subtle transition-colors hover:bg-surface-2"
            >
              <span className={cn("h-1.5 w-1.5 rounded-full", STATE_DOT[state])} aria-hidden />
              {STATE_LABEL[state]}
              <Plus className="ml-auto h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {day.session ? (
        <p className="tabular mt-2 pl-[4.75rem] text-xs text-success">
          {Math.round(day.session.volumeKg).toLocaleString("fr-FR")} kg · {day.session.sets} séries ·{" "}
          {Math.round(day.session.durationSeconds / 60)} min
        </p>
      ) : day.planned?.templateId && state !== "rest" ? (
        <p className="tabular mt-2 pl-[4.75rem] text-xs text-subtle">
          {day.planned.exerciseCount} exercices · {day.planned.setCount} séries
        </p>
      ) : null}
    </div>
  );
}
