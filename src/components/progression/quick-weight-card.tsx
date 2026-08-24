"use client";

import { useState, useTransition } from "react";
import { Check, Scale } from "lucide-react";
import { saveWeightAction } from "@/server/actions/body";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { useToast } from "@/components/ui/misc";
import { dateKey, kgToLb, lbToKg } from "@/lib/utils";

/** Encodage du poids du jour depuis l'accueil — deux gestes maximum (§18). */
export function QuickWeightCard({
  unit,
  todayValue,
  lastValue,
}: {
  unit: "kg" | "lb";
  todayValue: number | null;
  lastValue: number | null;
}) {
  const toDisplay = (kg: number) => Math.round((unit === "lb" ? kgToLb(kg) : kg) * 10) / 10;
  const [value, setValue] = useState(
    todayValue != null ? String(toDisplay(todayValue)) : lastValue != null ? String(toDisplay(lastValue)) : ""
  );
  const [saved, setSaved] = useState(todayValue != null);
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  function save() {
    const n = Number(value.replace(",", "."));
    if (!n || n <= 0) return;
    const kg = unit === "lb" ? lbToKg(n) : n;
    startTransition(async () => {
      const res = await saveWeightAction({ date: dateKey(), weightKg: Math.round(kg * 100) / 100 });
      if (res.ok) {
        setSaved(true);
        toast.show("Poids enregistré");
      } else {
        toast.show(res.error, "error");
      }
    });
  }

  return (
    <Card className="mb-5">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-surface-2 text-muted">
          <Scale className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[0.95rem] font-medium">
            {saved ? "Poids du jour enregistré" : "Ton poids ce matin ?"}
          </p>
          <p className="text-xs text-subtle">
            {saved ? "Tu peux le corriger si besoin." : "10 secondes, et la courbe reste juste."}
          </p>
        </div>
      </div>

      <div className="mt-3 flex gap-2">
        <div className="relative flex-1">
          <Input
            type="number"
            inputMode="decimal"
            step="0.1"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setSaved(false);
            }}
            placeholder={unit === "kg" ? "84,2" : "185,6"}
            className="tabular pr-12 text-lg font-semibold"
            aria-label={`Poids en ${unit}`}
          />
          <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-subtle">
            {unit}
          </span>
        </div>
        <Button onClick={save} loading={pending} disabled={!value} size="lg" className="px-5">
          {saved ? <Check className="h-5 w-5" /> : "OK"}
        </Button>
      </div>
      {toast.node}
    </Card>
  );
}
