"use client";

import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/misc";

/**
 * Barre d'enregistrement fixée au-dessus de la navigation.
 *
 * Elle dit en permanence si le travail en cours est enregistré : c'est le seul
 * repère fiable quand on modifie un programme au fil de plusieurs journées.
 */
export function SaveBar({
  dirty,
  isNew,
  pending,
  onSave,
}: {
  dirty: boolean;
  isNew: boolean;
  pending: boolean;
  onSave: () => void;
}) {
  return (
    <div
      className="fixed inset-x-0 z-30 mx-auto max-w-2xl border-t border-border bg-bg-elevated/95 px-4 py-3 backdrop-blur-xl"
      style={{ bottom: "calc(var(--nav-height) + var(--safe-bottom))" }}
    >
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          {dirty ? (
            <Badge tone="warning">Modifications non enregistrées</Badge>
          ) : (
            <Badge tone="success">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {isNew ? "Prêt à créer" : "À jour"}
            </Badge>
          )}
        </div>
        <Button
          type="button"
          size="lg"
          onClick={onSave}
          loading={pending}
          disabled={!dirty && !isNew}
          className="shrink-0"
        >
          {isNew ? "Créer le programme" : "Enregistrer"}
        </Button>
      </div>
    </div>
  );
}
