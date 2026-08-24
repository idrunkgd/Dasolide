"use client";

import { useState, useTransition } from "react";
import { Droplet, Minus, Plus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { ProgressBar, useToast } from "@/components/ui/misc";
import { setWaterAction } from "@/server/actions/nutrition";
import { cn } from "@/lib/utils";

const GLASS_ML = 250;

/** Suivi de l'hydratation : un verre = 250 ml, un geste = un verre. */
export function WaterTracker({
  day,
  initialMl,
  targetMl,
}: {
  day: string;
  initialMl: number;
  targetMl: number | null;
}) {
  const [ml, setMl] = useState(initialMl);
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  const target = targetMl && targetMl > 0 ? targetMl : 2500;
  const glasses = Math.round(ml / GLASS_ML);
  const targetGlasses = Math.max(1, Math.round(target / GLASS_ML));

  function change(deltaGlasses: number) {
    const next = Math.max(0, Math.min(40, glasses + deltaGlasses)) * GLASS_ML;
    if (next === ml) return;
    setMl(next);
    startTransition(async () => {
      const res = await setWaterAction(day, next);
      if (!res.ok) {
        setMl(ml);
        toast.show(res.error, "error");
      }
    });
  }

  return (
    <Card className="mb-5">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-info/15 text-info">
          <Droplet className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[0.95rem] font-medium">Hydratation</p>
          <p className="tabular text-xs text-subtle">
            {(ml / 1000).toFixed(2).replace(".", ",")} L sur {(target / 1000).toFixed(1).replace(".", ",")} L
            · {glasses} {glasses > 1 ? "verres" : "verre"}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => change(-1)}
            disabled={pending || glasses === 0}
            aria-label="Retirer un verre"
            className="flex h-11 w-11 items-center justify-center rounded-2xl bg-surface-2 text-muted transition-colors hover:text-text disabled:opacity-40"
          >
            <Minus className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => change(1)}
            disabled={pending}
            aria-label="Ajouter un verre de 250 ml"
            className="flex h-11 w-11 items-center justify-center rounded-2xl bg-info/15 text-info transition-colors hover:brightness-125 disabled:opacity-40"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      <ProgressBar value={ml} max={target} color="var(--info)" height={6} className="mt-3.5" />

      <div className="mt-3 flex flex-wrap gap-1.5" aria-hidden>
        {Array.from({ length: Math.min(16, targetGlasses) }).map((_, i) => (
          <span
            key={i}
            className={cn(
              "h-6 w-4 rounded-b-md rounded-t-sm border transition-colors",
              i < glasses ? "border-info bg-info/40" : "border-border bg-surface-2"
            )}
          />
        ))}
      </div>

      {toast.node}
    </Card>
  );
}
