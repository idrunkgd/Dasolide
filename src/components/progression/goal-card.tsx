"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Pencil, RotateCcw, Trash2 } from "lucide-react";
import { deleteGoalAction, toggleGoalStatusAction } from "@/server/actions/body";
import { Badge, ProgressBar, Sheet } from "@/components/ui/misc";
import { GOAL_TYPES, MEASUREMENT_FIELDS } from "@/lib/constants";
import { formatDate, formatNumber1, parseDateKey } from "@/lib/utils";
import { daysLeft, goalProgress, type GoalView } from "./goal-utils";

/** Carte d'objectif : avancement réel, reste à parcourir, échéance (§26). */
export function GoalCard({ goal, onEdit }: { goal: GoalView; onEdit: (goal: GoalView) => void }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, start] = useTransition();

  const progress = goalProgress(goal);
  const left = daysLeft(goal.targetDate);
  const achieved = goal.status === "atteint";

  const context =
    goal.type === "force" && goal.exerciseName
      ? goal.exerciseName
      : goal.type === "mensuration" && goal.measureKey
        ? (MEASUREMENT_FIELDS.find((f) => f.key === goal.measureKey)?.label ?? "Mensuration")
        : (GOAL_TYPES[goal.type as keyof typeof GOAL_TYPES] ?? goal.type);

  function toggle() {
    start(async () => {
      await toggleGoalStatusAction(goal.id, achieved ? "active" : "atteint");
      router.refresh();
    });
  }

  function remove() {
    start(async () => {
      await deleteGoalAction(goal.id);
      setConfirming(false);
      router.refresh();
    });
  }

  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[0.95rem] font-semibold leading-tight">{goal.title}</p>
          <p className="mt-0.5 truncate text-xs text-subtle">{context}</p>
        </div>
        <Badge tone={achieved ? "success" : "accent"}>
          {achieved ? "Atteint" : `${progress.percent} %`}
        </Badge>
      </div>

      <div className="mt-3">
        <ProgressBar
          value={progress.ratio}
          max={1}
          height={8}
          color={achieved ? "var(--success)" : undefined}
        />
        <div className="tabular mt-2 flex items-baseline justify-between text-xs text-muted">
          <span>
            {formatNumber1(goal.startValue)} {goal.unit}
          </span>
          <span className="font-medium text-text">
            {goal.currentValue != null ? `${formatNumber1(goal.currentValue)} ${goal.unit}` : "—"}
          </span>
          <span>
            {formatNumber1(goal.targetValue)} {goal.unit}
          </span>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
        {progress.manual ? (
          <span>Suivi manuel : marque-le comme atteint quand tu y es.</span>
        ) : achieved ? (
          <span className="text-success">Objectif atteint, bravo.</span>
        ) : progress.reached ? (
          <span className="text-success">Cible franchie — valide-le quand tu veux.</span>
        ) : (
          <span className="tabular">
            Reste {formatNumber1(progress.remaining)} {goal.unit}
          </span>
        )}
        {goal.targetDate ? (
          <span className="tabular">
            Cible : {formatDate(parseDateKey(goal.targetDate))}
            {left != null && !achieved
              ? left >= 0
                ? ` · ${left} j restants`
                : ` · dépassée de ${-left} j`
              : ""}
          </span>
        ) : null}
      </div>

      <div className="mt-3 flex gap-2">
        <button
          onClick={() => onEdit(goal)}
          className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-2xl border border-border bg-surface-2 text-sm font-medium text-muted transition-colors hover:text-text"
        >
          <Pencil className="h-3.5 w-3.5" /> Modifier
        </button>
        <button
          onClick={toggle}
          disabled={pending}
          className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-2xl border border-border bg-surface-2 text-sm font-medium text-muted transition-colors hover:text-text disabled:opacity-50"
        >
          {achieved ? (
            <>
              <RotateCcw className="h-3.5 w-3.5" /> Réactiver
            </>
          ) : (
            <>
              <Check className="h-3.5 w-3.5" /> Atteint
            </>
          )}
        </button>
        <button
          onClick={() => setConfirming(true)}
          aria-label="Supprimer l'objectif"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-border bg-surface-2 text-muted transition-colors hover:text-danger"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <Sheet open={confirming} onClose={() => setConfirming(false)} title="Supprimer cet objectif ?">
        <p className="text-sm text-muted">L&apos;objectif « {goal.title} » sera définitivement supprimé.</p>
        <div className="mt-5 flex gap-2">
          <button
            onClick={() => setConfirming(false)}
            className="h-12 flex-1 rounded-2xl border border-border bg-surface-2 font-medium"
          >
            Annuler
          </button>
          <button
            onClick={remove}
            disabled={pending}
            className="h-12 flex-1 rounded-2xl bg-danger font-medium text-white disabled:opacity-50"
          >
            Supprimer
          </button>
        </div>
      </Sheet>
    </div>
  );
}
