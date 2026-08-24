"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteSessionAction } from "@/server/actions/history";
import { Sheet } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";

export function DeleteSessionButton({ sessionId }: { sessionId: string }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="-mr-2 rounded-xl p-2 text-muted transition-colors hover:bg-surface-2 hover:text-danger"
        aria-label="Supprimer la séance"
      >
        <Trash2 className="h-5 w-5" />
      </button>

      <Sheet open={open} onClose={() => setOpen(false)} title="Supprimer cette séance">
        <p className="text-sm text-muted">
          La séance et toutes ses séries seront définitivement supprimées. Les records qui en
          découlaient disparaîtront également.
        </p>
        <div className="mt-5 space-y-2">
          <Button
            variant="danger"
            fullWidth
            size="lg"
            loading={pending}
            onClick={() =>
              startTransition(async () => {
                await deleteSessionAction(sessionId);
                router.push("/historique");
              })
            }
          >
            Supprimer définitivement
          </Button>
          <Button variant="secondary" fullWidth size="lg" onClick={() => setOpen(false)}>
            Annuler
          </Button>
        </div>
      </Sheet>
    </>
  );
}
