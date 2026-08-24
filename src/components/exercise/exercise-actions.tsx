"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { deleteExerciseAction } from "@/server/actions/exercise";
import { Button } from "@/components/ui/button";
import { Sheet, useToast } from "@/components/ui/misc";

/** Modifier / supprimer — réservé aux exercices personnalisés de l'utilisateur. */
export function ExerciseActions({ exerciseId, name }: { exerciseId: string; name: string }) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function remove() {
    setError(null);
    startTransition(async () => {
      const res = await deleteExerciseAction(exerciseId);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      toast.show("Exercice supprimé");
      setConfirming(false);
      router.push("/exercices");
      router.refresh();
    });
  }

  return (
    <>
      <div className="flex gap-2">
        <Link href={`/exercices/${exerciseId}/modifier`} className="flex-1">
          <Button variant="secondary" fullWidth size="md">
            <Pencil className="h-4 w-4" />
            Modifier
          </Button>
        </Link>
        <Button
          variant="secondary"
          size="md"
          className="text-danger"
          onClick={() => {
            setError(null);
            setConfirming(true);
          }}
        >
          <Trash2 className="h-4 w-4" />
          Supprimer
        </Button>
      </div>

      <Sheet
        open={confirming}
        onClose={() => setConfirming(false)}
        title="Supprimer l'exercice ?"
        footer={
          <div className="flex gap-2">
            <Button variant="secondary" fullWidth onClick={() => setConfirming(false)}>
              Annuler
            </Button>
            <Button variant="danger" fullWidth loading={pending} onClick={remove}>
              Supprimer
            </Button>
          </div>
        }
      >
        <p className="text-sm text-muted">
          « {name} » sera définitivement retiré de ta bibliothèque. Cette action est irréversible.
        </p>
        {error ? (
          <div className="mt-4 rounded-2xl border border-warning/30 bg-warning/10 p-3.5">
            <p className="mb-1 text-sm font-semibold text-warning">Suppression impossible</p>
            <p className="text-sm leading-relaxed text-muted">{error}</p>
          </div>
        ) : null}
      </Sheet>

      {toast.node}
    </>
  );
}
