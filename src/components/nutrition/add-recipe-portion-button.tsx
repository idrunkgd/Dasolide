"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { Sheet, useToast } from "@/components/ui/misc";
import { addDiaryEntryAction } from "@/server/actions/nutrition";
import { MEAL_TYPES } from "@/lib/constants";
import { dateKey } from "@/lib/utils";
import { MACRO_COLORS } from "./macro-bars";
import { scaleMacros, type Macros } from "./types";

/** Ajoute une (ou plusieurs) portion(s) de recette au journal. */
export function AddRecipePortionButton({
  recipeId,
  perServing,
  label = "Ajouter au journal",
  size = "md",
  variant = "primary",
}: {
  recipeId: string;
  perServing: Macros;
  label?: string;
  size?: "sm" | "md" | "lg";
  variant?: "primary" | "secondary";
}) {
  const [open, setOpen] = useState(false);
  const [day, setDay] = useState(dateKey(new Date()));
  const [mealType, setMealType] = useState("diner");
  const [portionsRaw, setPortionsRaw] = useState("1");
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  const portions = Number(portionsRaw.replace(",", "."));
  const valid = Number.isFinite(portions) && portions > 0;
  const preview = scaleMacros(perServing, valid ? portions : 0);

  function add() {
    if (!valid) return;
    startTransition(async () => {
      const res = await addDiaryEntryAction({ date: day, mealType, recipeId, servings: portions });
      if (res.ok) {
        setOpen(false);
        toast.show("Recette ajoutée au journal");
        router.push(`/nutrition?date=${day}`);
        router.refresh();
      } else {
        toast.show(res.error, "error");
      }
    });
  }

  return (
    <>
      <Button type="button" variant={variant} size={size} onClick={() => setOpen(true)}>
        <CalendarPlus className="h-4 w-4" />
        {label}
      </Button>

      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title="Ajouter une portion"
        footer={
          <Button size="lg" fullWidth loading={pending} disabled={!valid} onClick={add}>
            Ajouter
          </Button>
        }
      >
        <div className="space-y-4">
          <Field label="Nombre de portions">
            <Input
              type="number"
              inputMode="decimal"
              min="0.1"
              step="0.5"
              value={portionsRaw}
              onChange={(e) => setPortionsRaw(e.target.value)}
              className="tabular"
            />
          </Field>
          <Field label="Journée">
            <Input type="date" value={day} onChange={(e) => setDay(e.target.value)} />
          </Field>
          <Field label="Repas">
            <Select value={mealType} onChange={(e) => setMealType(e.target.value)}>
              {Object.entries(MEAL_TYPES).map(([key, meal]) => (
                <option key={key} value={key}>
                  {meal.label}
                </option>
              ))}
            </Select>
          </Field>

          <div className="rounded-2xl border border-border bg-surface-2 p-4">
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-muted">Calories ajoutées</span>
              <span className="tabular text-xl font-bold">{Math.round(preview.kcal)} kcal</span>
            </div>
            <p className="tabular mt-2 text-xs">
              <span style={{ color: MACRO_COLORS.protein }}>P {Math.round(preview.protein)}</span>
              {" · "}
              <span style={{ color: MACRO_COLORS.carbs }}>G {Math.round(preview.carbs)}</span>
              {" · "}
              <span style={{ color: MACRO_COLORS.fat }}>L {Math.round(preview.fat)}</span>
            </p>
          </div>
        </div>
      </Sheet>

      {toast.node}
    </>
  );
}
