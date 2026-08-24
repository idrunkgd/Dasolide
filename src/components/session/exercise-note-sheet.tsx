"use client";

import { useEffect, useState, useTransition } from "react";
import { saveExerciseNoteAction } from "@/server/actions/session";
import { Sheet } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/field";

/** Note permanente rattachée à l'exercice, réaffichée à chaque séance (§33). */
export function ExerciseNoteSheet({
  open,
  onClose,
  exerciseId,
  exerciseName,
  initialNote,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  exerciseId: string;
  exerciseName: string;
  initialNote: string | null;
  onSaved: (content: string) => void;
}) {
  const [value, setValue] = useState(initialNote ?? "");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (open) setValue(initialNote ?? "");
  }, [open, initialNote]);

  function save() {
    startTransition(async () => {
      await saveExerciseNoteAction(exerciseId, value);
      onSaved(value.trim());
      onClose();
    });
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={exerciseName}
      footer={
        <Button fullWidth size="lg" loading={pending} onClick={save}>
          Enregistrer la note
        </Button>
      }
    >
      <p className="mb-3 text-sm text-muted">
        Cette note s&apos;affichera automatiquement à chaque fois que tu feras cet exercice.
      </p>
      <Textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Réglage machine : siège position 4. Épaule sensible : ne pas descendre complètement."
        rows={5}
        maxLength={1000}
        autoFocus
      />
    </Sheet>
  );
}
