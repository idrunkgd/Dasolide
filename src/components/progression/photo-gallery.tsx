"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deletePhotoAction } from "@/server/actions/body";
import { Sheet } from "@/components/ui/misc";
import { PHOTO_POSES } from "@/lib/constants";
import { formatDate, formatNumber1, groupBy, parseDateKey } from "@/lib/utils";
import { weightOut, type WeightUnit } from "./units";

export type ProgressPhotoItem = {
  id: string;
  date: string;
  pose: string;
  url: string;
  weightKg: number | null;
  comment: string | null;
};

/** Galerie groupée par date, du plus récent au plus ancien. */
export function PhotoGallery({ photos, unit }: { photos: ProgressPhotoItem[]; unit: WeightUnit }) {
  const router = useRouter();
  const [zoomed, setZoomed] = useState<ProgressPhotoItem | null>(null);
  const [confirming, setConfirming] = useState<ProgressPhotoItem | null>(null);
  const [pending, start] = useTransition();

  const groups = [...groupBy(photos, (p) => p.date).entries()].sort((a, b) => b[0].localeCompare(a[0]));

  function remove(id: string) {
    start(async () => {
      await deletePhotoAction(id);
      setConfirming(null);
      setZoomed(null);
      router.refresh();
    });
  }

  return (
    <>
      <div className="space-y-5">
        {groups.map(([date, items]) => (
          <section key={date}>
            <h3 className="mb-2 px-1 text-xs font-semibold uppercase tracking-[0.12em] text-subtle">
              {formatDate(parseDateKey(date))}
              {items[0]?.weightKg != null ? (
                <span className="tabular ml-2 normal-case tracking-normal text-muted">
                  {formatNumber1(weightOut(items[0].weightKg, unit))} {unit}
                </span>
              ) : null}
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {items.map((photo) => (
                <button
                  key={photo.id}
                  onClick={() => setZoomed(photo)}
                  className="group relative aspect-[3/4] overflow-hidden rounded-2xl border border-border bg-surface-2"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.url}
                    alt={`Photo ${PHOTO_POSES[photo.pose as keyof typeof PHOTO_POSES] ?? photo.pose}`}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                  <span className="absolute bottom-1 left-1 rounded-lg bg-black/55 px-1.5 py-0.5 text-[0.65rem] font-medium text-white">
                    {PHOTO_POSES[photo.pose as keyof typeof PHOTO_POSES] ?? photo.pose}
                  </span>
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>

      <Sheet
        open={zoomed != null}
        onClose={() => setZoomed(null)}
        title={zoomed ? formatDate(parseDateKey(zoomed.date)) : ""}
        footer={
          zoomed ? (
            <button
              onClick={() => setConfirming(zoomed)}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-border bg-surface-2 font-medium text-danger"
            >
              <Trash2 className="h-4 w-4" /> Supprimer cette photo
            </button>
          ) : null
        }
      >
        {zoomed ? (
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={zoomed.url}
              alt="Photo de progression"
              className="max-h-[55dvh] w-full rounded-2xl object-contain"
            />
            <p className="mt-3 text-sm text-muted">
              {PHOTO_POSES[zoomed.pose as keyof typeof PHOTO_POSES] ?? zoomed.pose}
              {zoomed.weightKg != null ? ` · ${formatNumber1(weightOut(zoomed.weightKg, unit))} ${unit}` : ""}
            </p>
            {zoomed.comment ? <p className="mt-1 text-sm text-subtle">{zoomed.comment}</p> : null}
          </div>
        ) : null}
      </Sheet>

      <Sheet open={confirming != null} onClose={() => setConfirming(null)} title="Supprimer cette photo ?">
        <p className="text-sm text-muted">
          Le fichier est réellement effacé du serveur. Cette action est irréversible.
        </p>
        <div className="mt-5 flex gap-2">
          <button
            onClick={() => setConfirming(null)}
            className="h-12 flex-1 rounded-2xl border border-border bg-surface-2 font-medium"
          >
            Annuler
          </button>
          <button
            onClick={() => confirming && remove(confirming.id)}
            disabled={pending}
            className="h-12 flex-1 rounded-2xl bg-danger font-medium text-white disabled:opacity-50"
          >
            Supprimer
          </button>
        </div>
      </Sheet>
    </>
  );
}
