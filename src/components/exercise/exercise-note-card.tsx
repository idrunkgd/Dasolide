"use client";

import { useState, useTransition } from "react";
import { NotebookPen } from "lucide-react";
import { saveExerciseNoteAction } from "@/server/actions/session";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/field";
import { useToast } from "@/components/ui/misc";

/**
 * Note permanente rattachée à l'exercice (§33) : elle sera réaffichée
 * automatiquement pendant la séance.
 */
export function ExerciseNoteCard({
  exerciseId,
  initialNote,
}: {
  exerciseId: string;
  initialNote: string | null;
}) {
  const [saved, setSaved] = useState(initialNote ?? "");
  const [value, setValue] = useState(initialNote ?? "");
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  function save() {
    startTransition(async () => {
      const res = await saveExerciseNoteAction(exerciseId, value);
      if (!res.ok) {
        toast.show(res.error, "error");
        return;
      }
      setSaved(value.trim());
      setEditing(false);
      toast.show(value.trim() ? "Note enregistrée" : "Note supprimée");
    });
  }

  return (
    <Card>
      <div className="mb-2 flex items-center gap-2">
        <NotebookPen className="h-4 w-4 text-subtle" />
        <h3 className="text-[0.95rem] font-semibold">Ma note</h3>
      </div>

      {editing ? (
        <>
          <Textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Réglage machine : siège position 4. Épaule sensible : ne pas descendre complètement."
            rows={4}
            maxLength={1000}
            autoFocus
          />
          <div className="mt-3 flex gap-2">
            <Button size="md" loading={pending} onClick={save} className="flex-1">
              Enregistrer
            </Button>
            <Button
              size="md"
              variant="secondary"
              onClick={() => {
                setValue(saved);
                setEditing(false);
              }}
            >
              Annuler
            </Button>
          </div>
        </>
      ) : (
        <>
          <p className="whitespace-pre-wrap text-sm text-muted">
            {saved || "Aucune note. Elle s'affichera automatiquement pendant tes séances."}
          </p>
          <Button
            size="sm"
            variant="secondary"
            className="mt-3"
            onClick={() => {
              setValue(saved);
              setEditing(true);
            }}
          >
            {saved ? "Modifier la note" : "Ajouter une note"}
          </Button>
        </>
      )}

      {toast.node}
    </Card>
  );
}
