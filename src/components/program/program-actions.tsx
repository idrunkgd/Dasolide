"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Archive, ArchiveRestore, Copy, Pencil, Play, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/misc";
import {
  archiveProgramAction,
  deleteProgramAction,
  duplicateProgramAction,
  setActiveProgramAction,
} from "@/server/actions/program";

/** Actions d'une carte de programme (liste /programmes). */
export function ProgramActions({
  id,
  isActive,
  isArchived,
}: {
  id: string;
  isActive: boolean;
  isArchived: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const router = useRouter();
  const toast = useToast();

  function run(fn: () => Promise<{ ok: boolean; error?: string }>, okMessage: string) {
    startTransition(async () => {
      const res = await fn();
      if (res.ok) {
        toast.show(okMessage);
        router.refresh();
      } else {
        toast.show(res.error ?? "Action impossible", "error");
      }
    });
  }

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
      {!isActive ? (
        <Button
          type="button"
          size="sm"
          onClick={() => run(() => setActiveProgramAction(id), "Programme activé et planifié")}
          disabled={pending}
        >
          <Play className="h-3.5 w-3.5" fill="currentColor" />
          Activer
        </Button>
      ) : null}

      <Link href={`/programmes/${id}`}>
        <Button type="button" size="sm" variant="secondary">
          <Pencil className="h-3.5 w-3.5" />
          Modifier
        </Button>
      </Link>

      <button
        type="button"
        onClick={() => run(() => duplicateProgramAction(id), "Programme dupliqué")}
        disabled={pending}
        aria-label="Dupliquer le programme"
        className="flex h-11 w-11 items-center justify-center rounded-xl bg-surface-2 text-muted transition-colors hover:text-text disabled:opacity-40"
      >
        <Copy className="h-4 w-4" />
      </button>

      <button
        type="button"
        onClick={() =>
          run(
            () => archiveProgramAction(id, !isArchived),
            isArchived ? "Programme restauré" : "Programme archivé"
          )
        }
        disabled={pending}
        aria-label={isArchived ? "Restaurer le programme" : "Archiver le programme"}
        className="flex h-11 w-11 items-center justify-center rounded-xl bg-surface-2 text-muted transition-colors hover:text-text disabled:opacity-40"
      >
        {isArchived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
      </button>

      {confirming ? (
        <Button
          type="button"
          size="sm"
          variant="danger"
          onClick={() => run(() => deleteProgramAction(id), "Programme supprimé")}
          disabled={pending}
        >
          Confirmer la suppression
        </Button>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          disabled={pending}
          aria-label="Supprimer le programme"
          className="flex h-11 w-11 items-center justify-center rounded-xl bg-surface-2 text-muted transition-colors hover:text-danger disabled:opacity-40"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}

      {toast.node}
    </div>
  );
}
