"use client";

import { useState, useTransition } from "react";
import { Download, ImageOff, Trash2 } from "lucide-react";
import {
  deleteAccountAction,
  deleteAllPhotosAction,
  exportDataAction,
} from "@/server/actions/settings";
import { Card, SectionTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { Sheet, useToast } from "@/components/ui/misc";

/** Export, suppression des photos et suppression du compte (§54, RGPD). */
export function DangerZone() {
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [photosOpen, setPhotosOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);

  function exportData() {
    startTransition(async () => {
      const res = await exportDataAction();
      if (!res.ok || !res.data) {
        toast.show(res.ok ? "Export impossible" : res.error, "error");
        return;
      }
      const blob = new Blob([res.data.json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = res.data.filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.show("Export téléchargé");
    });
  }

  return (
    <>
      <SectionTitle>Données personnelles</SectionTitle>
      <Card className="mb-5 divide-y divide-border p-0">
        <button
          onClick={exportData}
          disabled={pending}
          className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-surface-2 disabled:opacity-50"
        >
          <Download className="h-4 w-4 text-muted" />
          <span className="flex-1">
            <span className="block text-[0.95rem]">Exporter mes données</span>
            <span className="block text-xs text-subtle">
              Fichier JSON contenant l&apos;intégralité de ton compte
            </span>
          </span>
        </button>

        <button
          onClick={() => setPhotosOpen(true)}
          className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-surface-2"
        >
          <ImageOff className="h-4 w-4 text-muted" />
          <span className="flex-1">
            <span className="block text-[0.95rem]">Supprimer mes photos</span>
            <span className="block text-xs text-subtle">
              Efface les photos de progression et les fichiers du disque
            </span>
          </span>
        </button>

        <button
          onClick={() => setDeleteOpen(true)}
          className="flex w-full items-center gap-3 px-4 py-3.5 text-left text-danger transition-colors hover:bg-surface-2"
        >
          <Trash2 className="h-4 w-4" />
          <span className="flex-1">
            <span className="block text-[0.95rem]">Supprimer mon compte</span>
            <span className="block text-xs text-subtle">Action définitive et irréversible</span>
          </span>
        </button>
      </Card>

      <Sheet open={photosOpen} onClose={() => setPhotosOpen(false)} title="Supprimer les photos">
        <p className="text-sm text-muted">
          Toutes tes photos de progression seront effacées de la base et du disque. Cette action
          est irréversible.
        </p>
        <div className="mt-5 space-y-2">
          <Button
            variant="danger"
            fullWidth
            size="lg"
            loading={pending}
            onClick={() =>
              startTransition(async () => {
                const res = await deleteAllPhotosAction();
                toast.show(res.ok ? "Photos supprimées" : res.error, res.ok ? "ok" : "error");
                setPhotosOpen(false);
              })
            }
          >
            Supprimer toutes les photos
          </Button>
          <Button variant="secondary" fullWidth size="lg" onClick={() => setPhotosOpen(false)}>
            Annuler
          </Button>
        </div>
      </Sheet>

      <Sheet open={deleteOpen} onClose={() => setDeleteOpen(false)} title="Supprimer mon compte">
        <p className="text-sm text-muted">
          Ton compte, tes séances, tes mesures, ton alimentation et tes photos seront définitivement
          supprimés. Pense à exporter tes données avant si tu veux les conserver.
        </p>
        <p className="mt-4 text-sm">
          Tape <span className="font-mono font-semibold text-danger">SUPPRIMER</span> pour confirmer :
        </p>
        <Input
          className="mt-2"
          value={confirmation}
          onChange={(e) => setConfirmation(e.target.value)}
          placeholder="SUPPRIMER"
          autoCapitalize="characters"
        />
        {error ? <p className="mt-2 text-sm text-danger">{error}</p> : null}
        <div className="mt-5 space-y-2">
          <Button
            variant="danger"
            fullWidth
            size="lg"
            loading={pending}
            disabled={confirmation.trim().toUpperCase() !== "SUPPRIMER"}
            onClick={() =>
              startTransition(async () => {
                const res = await deleteAccountAction(confirmation);
                if (res && !res.ok) setError(res.error);
              })
            }
          >
            Supprimer définitivement mon compte
          </Button>
          <Button variant="secondary" fullWidth size="lg" onClick={() => setDeleteOpen(false)}>
            Annuler
          </Button>
        </div>
      </Sheet>

      {toast.node}
    </>
  );
}
