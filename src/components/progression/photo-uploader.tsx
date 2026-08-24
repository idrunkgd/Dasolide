"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus } from "lucide-react";
import { savePhotoAction } from "@/server/actions/body";
import { Button } from "@/components/ui/button";
import { Field, Input, PillGroup } from "@/components/ui/field";
import { PHOTO_POSES } from "@/lib/constants";
import { dateKey } from "@/lib/utils";
import { parseNumber, weightIn, weightOut, type WeightUnit } from "./units";

const MAX_WIDTH = 1080;

/**
 * Redimensionne l'image côté client avant l'envoi.
 *
 * Une photo de smartphone pèse facilement 4 à 8 Mo : réduite à 1080 px de large
 * en JPEG, elle tombe sous 300 Ko et passe largement sous la limite de 6 Mo de
 * la server action, sans perte visible à l'écran.
 */
async function resizeToDataUrl(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" }).catch(() =>
    createImageBitmap(file)
  );
  const scale = Math.min(1, MAX_WIDTH / bitmap.width);
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas indisponible");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();

  return canvas.toDataURL("image/jpeg", 0.82);
}

export function PhotoUploader({
  unit,
  defaultWeightKg,
  onSaved,
}: {
  unit: WeightUnit;
  defaultWeightKg: number | null;
  onSaved?: () => void;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [pose, setPose] = useState<string>("face");
  const [date, setDate] = useState(dateKey());
  const [weight, setWeight] = useState(defaultWeightKg != null ? String(weightOut(defaultWeightKg, unit)) : "");
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const [pending, start] = useTransition();

  async function pick(file: File | undefined) {
    if (!file) return;
    setError(null);
    setReading(true);
    try {
      setDataUrl(await resizeToDataUrl(file));
    } catch {
      setError("Impossible de lire cette image.");
    } finally {
      setReading(false);
    }
  }

  function submit() {
    if (!dataUrl) {
      setError("Choisis d'abord une photo.");
      return;
    }
    const w = parseNumber(weight);
    start(async () => {
      const res = await savePhotoAction({
        date,
        pose,
        dataUrl,
        weightKg: w == null ? null : weightIn(w, unit),
        comment: comment.trim() || null,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setDataUrl(null);
      setComment("");
      router.refresh();
      onSaved?.();
    });
  }

  return (
    <div className="space-y-4">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(e) => void pick(e.target.files?.[0])}
      />

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="flex min-h-44 w-full flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl border border-dashed border-border-strong bg-surface-2 p-4 text-muted transition-colors hover:border-accent-border"
      >
        {dataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={dataUrl} alt="Aperçu de la photo" className="max-h-64 w-auto rounded-xl" />
        ) : (
          <>
            <ImagePlus className="h-7 w-7 text-subtle" />
            <span className="text-sm">{reading ? "Lecture de l'image…" : "Choisir une photo"}</span>
            <span className="text-xs text-subtle">Redimensionnée à 1080 px avant l&apos;envoi</span>
          </>
        )}
      </button>

      <Field label="Pose">
        <PillGroup
          columns={3}
          value={pose}
          onChange={setPose}
          options={Object.entries(PHOTO_POSES).map(([value, label]) => ({ value, label }))}
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Date">
          <Input type="date" value={date} max={dateKey()} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label={`Poids (${unit})`} hint="Facultatif">
          <Input
            type="number"
            inputMode="decimal"
            step="0.1"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            className="tabular"
          />
        </Field>
      </div>

      <Field label="Commentaire" hint="Facultatif">
        <Input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Fin de sèche, matin" />
      </Field>

      {error ? <p className="text-sm text-danger">{error}</p> : null}

      <Button onClick={submit} loading={pending} disabled={!dataUrl} fullWidth size="lg">
        Enregistrer la photo
      </Button>
      <p className="text-xs text-subtle">
        Tes photos restent privées : elles sont rangées dans un dossier propre à ton compte.
      </p>
    </div>
  );
}
