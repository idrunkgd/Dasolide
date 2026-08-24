"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  pointerWithin,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { SegmentedControl, useToast } from "@/components/ui/misc";
import { movePlannedWorkoutAction, regeneratePlanningAction } from "@/server/actions/program";
import { cn } from "@/lib/utils";
import { MonthGrid } from "./month-grid";
import { WeekView } from "./week-view";
import { DaySheet } from "./day-sheet";
import { ChipPreview } from "./planned-chip";
import { PeriodSummary } from "./period-summary";
import { dayState, type CalendarDay, type CalendarSummary, type TemplateOption } from "./types";

export function CalendarView({
  view,
  title,
  prevKey,
  nextKey,
  todayKey,
  days,
  templates,
  summary,
  summaryLabel,
}: {
  view: "mois" | "semaine";
  title: string;
  prevKey: string;
  nextKey: string;
  todayKey: string;
  days: CalendarDay[];
  templates: TemplateOption[];
  summary: CalendarSummary;
  summaryLabel: string;
}) {
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [dragging, setDragging] = useState<CalendarDay | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor)
  );

  const openDay = days.find((d) => d.key === openKey) ?? null;

  function go(dayKey: string, nextView: "mois" | "semaine" = view) {
    router.push(`/calendrier?v=${nextView}&d=${dayKey}`);
  }

  function onDragStart(event: DragStartEvent) {
    const fromKey = event.active.data.current?.fromKey as string | undefined;
    setDragging(days.find((d) => d.key === fromKey) ?? null);
  }

  function onDragEnd(event: DragEndEvent) {
    const source = dragging;
    setDragging(null);
    const overId = event.over?.id;
    if (!source?.planned || typeof overId !== "string" || !overId.startsWith("day:")) return;

    const targetKey = overId.slice(4);
    if (targetKey === source.key) return;

    const plannedId = source.planned.id;
    startTransition(async () => {
      const res = await movePlannedWorkoutAction(plannedId, targetKey);
      toast.show(res.ok ? "Séance déplacée" : res.error, res.ok ? "ok" : "error");
      if (res.ok) router.refresh();
    });
  }

  return (
    <div className="px-4 pb-8 pt-4">
      <SegmentedControl
        className="mb-3"
        value={view}
        onChange={(v) => go(todayKeyOfView(days, todayKey), v)}
        options={[
          { value: "mois" as const, label: "Mois" },
          { value: "semaine" as const, label: "Semaine" },
        ]}
      />

      <div className="mb-3 flex items-center gap-2">
        <button
          type="button"
          onClick={() => go(prevKey)}
          aria-label={view === "mois" ? "Mois précédent" : "Semaine précédente"}
          className="flex h-11 w-11 items-center justify-center rounded-2xl bg-surface-2 text-muted hover:text-text"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h2 className="flex-1 truncate text-center text-base font-semibold first-letter:uppercase">
          {title}
        </h2>
        <button
          type="button"
          onClick={() => go(nextKey)}
          aria-label={view === "mois" ? "Mois suivant" : "Semaine suivante"}
          className="flex h-11 w-11 items-center justify-center rounded-2xl bg-surface-2 text-muted hover:text-text"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      <DndContext
        // Voir template-editor.tsx : un identifiant fixe évite que dnd-kit
        // numérote ses libellés différemment côté serveur et côté client.
        id="planning"
        sensors={sensors}
        collisionDetection={pointerWithin}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragCancel={() => setDragging(null)}
      >
        {view === "mois" ? (
          <MonthGrid days={days} onOpen={setOpenKey} />
        ) : (
          <WeekView days={days} onOpen={setOpenKey} />
        )}

        <DragOverlay dropAnimation={null}>
          {dragging ? (
            <ChipPreview
              label={dragging.planned?.templateName ?? "Séance"}
              state={dayState(dragging)}
            />
          ) : null}
        </DragOverlay>
      </DndContext>

      <PeriodSummary summary={summary} label={summaryLabel} />

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => go(todayKey)}
          className="min-h-11 flex-1 rounded-2xl bg-surface-2 px-4 text-sm font-medium text-muted transition-colors hover:text-text"
        >
          Aujourd&apos;hui
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const res = await regeneratePlanningAction(4);
              toast.show(res.ok ? "Planning régénéré sur 4 semaines" : res.error, res.ok ? "ok" : "error");
              if (res.ok) router.refresh();
            })
          }
          className={cn(
            "flex min-h-11 flex-1 items-center justify-center gap-2 rounded-2xl bg-surface-2 px-4 text-sm font-medium text-muted transition-colors hover:text-text",
            pending && "opacity-60"
          )}
        >
          <RefreshCw className={cn("h-4 w-4", pending && "animate-spin")} />
          Régénérer
        </button>
      </div>

      <p className="mt-3 px-1 text-xs text-subtle">
        Appuie sur un jour pour le détail. Maintiens une séance pour la glisser vers un autre jour.
      </p>

      {openDay ? (
        <DaySheet day={openDay} templates={templates} onClose={() => setOpenKey(null)} />
      ) : null}

      {toast.node}
    </div>
  );
}

/** Bascule mois ↔ semaine : on reste sur la période visible, pas sur aujourd'hui. */
function todayKeyOfView(days: CalendarDay[], todayKey: string): string {
  if (days.some((d) => d.key === todayKey)) return todayKey;
  return days.find((d) => d.inScope)?.key ?? todayKey;
}
