"use client";

import { useState } from "react";
import { Plus, Target } from "lucide-react";
import { Card, SectionTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/misc";
import { GoalCard } from "./goal-card";
import { GoalFormSheet } from "./goal-form-sheet";
import type { GoalView } from "./goal-utils";

/** §26 — Liste des objectifs actifs et atteints. */
export function GoalsPanel({ goals }: { goals: GoalView[] }) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<GoalView | null>(null);

  const active = goals.filter((g) => g.status !== "atteint");
  const achieved = goals.filter((g) => g.status === "atteint");

  function openCreate() {
    setEditing(null);
    setSheetOpen(true);
  }

  function openEdit(goal: GoalView) {
    setEditing(goal);
    setSheetOpen(true);
  }

  return (
    <div className="px-4 pt-4">
      <div className="mb-5">
        <Button fullWidth size="lg" onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Nouvel objectif
        </Button>
      </div>

      {goals.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Target className="h-6 w-6" />}
            title="Aucun objectif"
            description="Un objectif clair, mesurable et daté vaut mieux que dix bonnes intentions."
            action={<Button onClick={openCreate}>Créer mon premier objectif</Button>}
          />
        </Card>
      ) : (
        <>
          <SectionTitle>En cours ({active.length})</SectionTitle>
          {active.length === 0 ? (
            <Card className="mb-5">
              <p className="text-sm text-muted">
                Tous tes objectifs sont atteints. C&apos;est le bon moment pour en fixer un nouveau.
              </p>
            </Card>
          ) : (
            <div className="mb-5 space-y-3">
              {active.map((goal) => (
                <GoalCard key={goal.id} goal={goal} onEdit={openEdit} />
              ))}
            </div>
          )}

          {achieved.length > 0 ? (
            <>
              <SectionTitle>Atteints ({achieved.length})</SectionTitle>
              <div className="mb-6 space-y-3">
                {achieved.map((goal) => (
                  <GoalCard key={goal.id} goal={goal} onEdit={openEdit} />
                ))}
              </div>
            </>
          ) : null}
        </>
      )}

      <GoalFormSheet
        key={editing?.id ?? "new"}
        open={sheetOpen}
        goal={editing}
        onClose={() => setSheetOpen(false)}
      />
    </div>
  );
}
