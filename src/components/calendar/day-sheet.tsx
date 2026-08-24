"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, CalendarRange, Moon, RotateCcw, Trash2, XCircle } from "lucide-react";
import { Sheet, Badge, useToast } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { Field, Select } from "@/components/ui/field";
import { StartSessionButton } from "@/components/session/start-session-button";
import {
  addPlannedWorkoutAction,
  deletePlannedWorkoutAction,
  movePlannedWorkoutAction,
  setPlannedStatusAction,
} from "@/server/actions/program";
import { formatDateLong, formatDurationHuman, formatVolume, parseDateKey } from "@/lib/utils";
import { STATE_LABEL, dayState, type CalendarDay, type TemplateOption } from "./types";

const TONE = {
  completed: "success",
  missed: "warning",
  skipped: "warning",
  rest: "neutral",
  planned: "accent",
  empty: "neutral",
} as const;

/** Détail d'un jour et toutes ses actions (§16). */
export function DaySheet({
  day,
  templates,
  onClose,
}: {
  day: CalendarDay;
  templates: TemplateOption[];
  onClose: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [moveTo, setMoveTo] = useState(day.key);
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? "");
  const router = useRouter();
  const toast = useToast();

  const state = dayState(day);
  const planned = day.planned;
  const editable = planned != null && planned.status !== "completed";

  function run(fn: () => Promise<{ ok: boolean; error?: string }>, okMessage: string, close = true) {
    startTransition(async () => {
      const res = await fn();
      if (res.ok) {
        toast.show(okMessage);
        router.refresh();
        if (close) onClose();
      } else {
        toast.show(res.error ?? "Action impossible", "error");
      }
    });
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title={
        <span className="first-letter:uppercase">{formatDateLong(parseDateKey(day.key))}</span>
      }
    >
      <div className="space-y-5 pb-2">
        <div className="flex items-center gap-2">
          <Badge tone={TONE[state]}>{STATE_LABEL[state]}</Badge>
          {planned?.programName ? (
            <span className="truncate text-xs text-subtle">{planned.programName}</span>
          ) : null}
        </div>

        {/* ------------------------------------------------------------ Contenu */}
        {day.session ? (
          <div className="card p-4">
            <p className="font-semibold">{day.session.name}</p>
            <p className="tabular mt-1.5 text-sm text-muted">
              {formatVolume(day.session.volumeKg)} · {day.session.sets} séries ·{" "}
              {formatDurationHuman(day.session.durationSeconds)}
            </p>
            <Link href={`/seance/${day.session.id}/resume`} className="mt-3 block">
              <Button variant="secondary" fullWidth>
                Voir le résumé
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        ) : planned?.templateId ? (
          <div className="card p-4">
            <p className="font-semibold">{planned.templateName}</p>
            <p className="tabular mt-1.5 text-sm text-muted">
              {planned.exerciseCount} exercice{planned.exerciseCount > 1 ? "s" : ""} ·{" "}
              {planned.setCount} série{planned.setCount > 1 ? "s" : ""}
            </p>
            <StartSessionButton
              templateId={planned.templateId}
              label="Démarrer cette séance"
              size="lg"
              fullWidth
              className="mt-3"
            />
          </div>
        ) : (
          <p className="text-sm text-muted">
            {state === "rest"
              ? "Journée de repos. Profites-en pour récupérer."
              : "Aucune séance prévue ce jour."}
          </p>
        )}

        {/* ---------------------------------------------------------- Déplacer */}
        {editable && planned?.templateId ? (
          <div>
            <Field
              label="Déplacer vers une autre date"
              hint="Le glisser-déposer fait la même chose depuis la grille."
            >
              <div className="flex gap-2">
                <input
                  type="date"
                  value={moveTo}
                  onChange={(e) => setMoveTo(e.target.value)}
                  aria-label="Nouvelle date"
                  className="h-12 flex-1 rounded-2xl border border-border bg-surface-2 px-4 text-text focus:border-accent-border focus:outline-none"
                />
                <Button
                  type="button"
                  onClick={() => run(() => movePlannedWorkoutAction(planned.id, moveTo), "Séance déplacée")}
                  disabled={pending || moveTo === day.key}
                >
                  <CalendarRange className="h-4 w-4" />
                  Déplacer
                </Button>
              </div>
            </Field>
          </div>
        ) : null}

        {/* ------------------------------------------------------------ Statuts */}
        {editable && planned ? (
          <div className="grid grid-cols-1 gap-2">
            {planned.status !== "rest" ? (
              <Button
                type="button"
                variant="secondary"
                fullWidth
                disabled={pending}
                onClick={() => run(() => setPlannedStatusAction(planned.id, "rest"), "Journée de repos")}
              >
                <Moon className="h-4 w-4" />
                Marquer comme repos
              </Button>
            ) : planned.templateId ? (
              <Button
                type="button"
                variant="secondary"
                fullWidth
                disabled={pending}
                onClick={() => run(() => setPlannedStatusAction(planned.id, "planned"), "Séance rétablie")}
              >
                <RotateCcw className="h-4 w-4" />
                Rétablir la séance
              </Button>
            ) : null}

            {planned.templateId && planned.status !== "skipped" ? (
              <Button
                type="button"
                variant="secondary"
                fullWidth
                disabled={pending}
                onClick={() => run(() => setPlannedStatusAction(planned.id, "skipped"), "Séance ignorée")}
              >
                <XCircle className="h-4 w-4" />
                Marquer comme manquée
              </Button>
            ) : null}

            <Button
              type="button"
              variant="ghost"
              fullWidth
              disabled={pending}
              onClick={() => run(() => deletePlannedWorkoutAction(planned.id), "Journée supprimée")}
            >
              <Trash2 className="h-4 w-4 text-danger" />
              Retirer du planning
            </Button>
          </div>
        ) : null}

        {/* -------------------------------------------------------- Ajouter une séance */}
        {state !== "completed" && templates.length > 0 ? (
          <div className="border-t border-border pt-4">
            <Field label={planned?.templateId ? "Remplacer par une autre journée" : "Ajouter une séance"}>
              <Select value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} — {t.programName}
                  </option>
                ))}
              </Select>
            </Field>
            <Button
              type="button"
              variant="secondary"
              fullWidth
              className="mt-2"
              disabled={pending || !templateId}
              onClick={() =>
                run(() => addPlannedWorkoutAction(day.key, templateId), "Séance ajoutée au planning")
              }
            >
              {planned?.templateId ? "Remplacer la séance" : "Ajouter au planning"}
            </Button>
          </div>
        ) : null}
      </div>

      {toast.node}
    </Sheet>
  );
}
