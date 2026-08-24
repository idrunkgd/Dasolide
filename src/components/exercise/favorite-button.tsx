"use client";

import { useState, useTransition } from "react";
import { Star } from "lucide-react";
import { toggleExerciseFavoriteAction } from "@/server/actions/exercise";
import { cn } from "@/lib/utils";

/** Étoile « favori » — bascule optimiste, cible tactile 44 px. */
export function FavoriteButton({
  exerciseId,
  initial,
  className,
}: {
  exerciseId: string;
  initial: boolean;
  className?: string;
}) {
  const [isFavorite, setIsFavorite] = useState(initial);
  const [pending, startTransition] = useTransition();

  function toggle() {
    const next = !isFavorite;
    setIsFavorite(next);
    startTransition(async () => {
      const res = await toggleExerciseFavoriteAction(exerciseId);
      if (!res.ok) setIsFavorite(!next);
      else if (res.data) setIsFavorite(res.data.isFavorite);
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-pressed={isFavorite}
      aria-label={isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
      className={cn(
        "flex h-11 w-11 items-center justify-center rounded-2xl border transition-colors active:scale-95",
        isFavorite
          ? "border-accent-border bg-accent-soft text-accent"
          : "border-border bg-surface-2 text-muted hover:text-text",
        className
      )}
    >
      <Star className={cn("h-5 w-5", isFavorite && "fill-current")} />
    </button>
  );
}
