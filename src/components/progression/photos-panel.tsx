"use client";

import { useState } from "react";
import { Camera, Plus } from "lucide-react";
import { Card, SectionTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState, Sheet } from "@/components/ui/misc";
import { PhotoCompare } from "./photo-compare";
import { PhotoGallery, type ProgressPhotoItem } from "./photo-gallery";
import { PhotoUploader } from "./photo-uploader";
import type { WeightUnit } from "./units";

/** §20 — Photos de progression : ajout, galerie, comparateur avant/après. */
export function PhotosPanel({
  photos,
  unit,
  lastWeightKg,
}: {
  /** Du plus récent au plus ancien. */
  photos: ProgressPhotoItem[];
  unit: WeightUnit;
  lastWeightKg: number | null;
}) {
  const [adding, setAdding] = useState(false);

  return (
    <div className="px-4 pt-4">
      <div className="mb-5">
        <Button fullWidth size="lg" onClick={() => setAdding(true)}>
          <Plus className="h-4 w-4" />
          Ajouter une photo
        </Button>
      </div>

      {photos.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Camera className="h-6 w-6" />}
            title="Aucune photo pour l'instant"
            description="Même lumière, même endroit, même heure : c'est ce qui rend la comparaison honnête. Une série par mois suffit."
            action={<Button onClick={() => setAdding(true)}>Ajouter ma première photo</Button>}
          />
        </Card>
      ) : (
        <>
          {photos.length >= 2 ? (
            <>
              <SectionTitle>Avant / après</SectionTitle>
              <Card className="mb-5">
                <PhotoCompare photos={photos} unit={unit} />
                <p className="mt-3 text-xs text-subtle">
                  Fais glisser le curseur sur l&apos;image pour révéler la seconde photo.
                </p>
              </Card>
            </>
          ) : (
            <Card className="mb-5">
              <p className="text-sm text-muted">
                Ajoute une seconde photo pour débloquer le comparateur avant / après.
              </p>
            </Card>
          )}

          <SectionTitle>Galerie</SectionTitle>
          <div className="mb-6">
            <PhotoGallery photos={photos} unit={unit} />
          </div>
        </>
      )}

      <Sheet open={adding} onClose={() => setAdding(false)} title="Nouvelle photo" fullHeight>
        <PhotoUploader unit={unit} defaultWeightKg={lastWeightKg} onSaved={() => setAdding(false)} />
      </Sheet>
    </div>
  );
}
