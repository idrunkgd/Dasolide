"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { Sheet, useToast } from "@/components/ui/misc";
import { addSavedMealToDayAction } from "@/server/actions/nutrition";
import { MEAL_TYPES } from "@/lib/constants";
import { dateKey } from "@/lib/utils";

/** Ajoute toutes les lignes d'un repas enregistré à une journée, en un geste. */
export function AddSavedMealButton({
  savedMealId,
  defaultMealType,
  label = "Ajouter au journal",
  size = "md",
  variant = "secondary",
}: {
  savedMealId: string;
  defaultMealType: string;
  label?: string;
  size?: "sm" | "md" | "lg";
  variant?: "primary" | "secondary";
}) {
  const [open, setOpen] = useState(false);
  const [day, setDay] = useState(dateKey(new Date()));
  const [mealType, setMealType] = useState(defaultMealType);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function add() {
    startTransition(async () => {
      const res = await addSavedMealToDayAction(savedMealId, day, mealType);
      if (res.ok) {
        setOpen(false);
        toast.show(`${res.data?.count ?? 0} aliments ajoutés`);
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
        title="Ajouter au journal"
        footer={
          <Button size="lg" fullWidth loading={pending} onClick={add}>
            Ajouter
          </Button>
        }
      >
        <div className="space-y-4">
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
        </div>
      </Sheet>

      {toast.node}
    </>
  );
}
