"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, SectionTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { useToast } from "@/components/ui/misc";
import { createFoodAction, updateFoodAction } from "@/server/actions/nutrition";
import { FOOD_CATEGORIES } from "@/lib/constants";
import { macroKcal } from "@/lib/calc";
import { CoherenceNotice } from "./coherence-notice";

export type FoodFormValues = {
  id?: string;
  name: string;
  brand: string;
  category: string;
  servingName: string;
  servingGrams: string;
  kcal100: string;
  protein100: string;
  carbs100: string;
  fat100: string;
  fiber100: string;
  sugar100: string;
  salt100: string;
};

export const EMPTY_FOOD: FoodFormValues = {
  name: "",
  brand: "",
  category: "autre",
  servingName: "",
  servingGrams: "",
  kcal100: "",
  protein100: "",
  carbs100: "",
  fat100: "",
  fiber100: "",
  sugar100: "",
  salt100: "",
};

const num = (s: string) => {
  const n = Number(s.replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

/** Création / modification d'un aliment personnalisé (valeurs pour 100 g). */
export function FoodForm({ initial }: { initial: FoodFormValues }) {
  const [values, setValues] = useState<FoodFormValues>(initial);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  const set = (key: keyof FoodFormValues) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setValues((v) => ({ ...v, [key]: e.target.value }));

  const kcal = num(values.kcal100);
  const computed = macroKcal(num(values.protein100), num(values.carbs100), num(values.fat100));
  const gap = kcal > 0 ? Math.abs(computed - kcal) / kcal : 0;
  const showCheck = kcal > 0 && computed > 0;
  const inconsistent = showCheck && gap > 0.15;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      name: values.name,
      brand: values.brand || null,
      category: values.category,
      servingName: values.servingName || null,
      servingGrams: values.servingGrams ? num(values.servingGrams) : null,
      kcal100: num(values.kcal100),
      protein100: num(values.protein100),
      carbs100: num(values.carbs100),
      fat100: num(values.fat100),
      fiber100: values.fiber100 ? num(values.fiber100) : null,
      sugar100: values.sugar100 ? num(values.sugar100) : null,
      salt100: values.salt100 ? num(values.salt100) : null,
    };

    const existingId = values.id;
    startTransition(async () => {
      if (existingId) {
        const res = await updateFoodAction(existingId, payload);
        if (!res.ok) {
          setFieldErrors(res.fieldErrors ?? {});
          toast.show(res.error, "error");
          return;
        }
        toast.show("Aliment mis à jour");
        router.push(`/nutrition/aliments/${existingId}`);
      } else {
        const res = await createFoodAction(payload);
        if (!res.ok) {
          setFieldErrors(res.fieldErrors ?? {});
          toast.show(res.error, "error");
          return;
        }
        toast.show("Aliment créé");
        router.push(res.data ? `/nutrition/aliments/${res.data.id}` : "/nutrition");
      }
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="px-4 pb-8 pt-4">
      <SectionTitle>Identité</SectionTitle>
      <Card className="mb-5 space-y-4">
        <Field label="Nom" error={fieldErrors.name?.[0]}>
          <Input value={values.name} onChange={set("name")} placeholder="Yaourt grec 0 %" required />
        </Field>
        <Field label="Marque (facultatif)" error={fieldErrors.brand?.[0]}>
          <Input value={values.brand} onChange={set("brand")} placeholder="Fage" />
        </Field>
        <Field label="Catégorie">
          <Select value={values.category} onChange={set("category")}>
            {Object.entries(FOOD_CATEGORIES).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
      </Card>

      <SectionTitle>Valeurs pour 100 g</SectionTitle>
      <Card className="mb-5 space-y-4">
        <Field label="Calories (kcal)" error={fieldErrors.kcal100?.[0]}>
          <NumberInput value={values.kcal100} onChange={set("kcal100")} placeholder="59" required />
        </Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Protéines" error={fieldErrors.protein100?.[0]}>
            <NumberInput value={values.protein100} onChange={set("protein100")} placeholder="10" required />
          </Field>
          <Field label="Glucides" error={fieldErrors.carbs100?.[0]}>
            <NumberInput value={values.carbs100} onChange={set("carbs100")} placeholder="3,6" required />
          </Field>
          <Field label="Lipides" error={fieldErrors.fat100?.[0]}>
            <NumberInput value={values.fat100} onChange={set("fat100")} placeholder="0,4" required />
          </Field>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Fibres">
            <NumberInput value={values.fiber100} onChange={set("fiber100")} placeholder="0" />
          </Field>
          <Field label="Sucres">
            <NumberInput value={values.sugar100} onChange={set("sugar100")} placeholder="3,6" />
          </Field>
          <Field label="Sel">
            <NumberInput value={values.salt100} onChange={set("salt100")} placeholder="0,1" />
          </Field>
        </div>

        {showCheck ? (
          <CoherenceNotice
            inconsistent={inconsistent}
            title={inconsistent ? "Les valeurs semblent incohérentes" : "Valeurs cohérentes"}
            detail={`4 × protéines + 4 × glucides + 9 × lipides = ${Math.round(
              computed
            )} kcal, pour ${Math.round(kcal)} kcal saisies${inconsistent ? " — vérifie l'étiquette." : "."}`}
          />
        ) : null}
      </Card>

      <SectionTitle>Portion usuelle (facultatif)</SectionTitle>
      <Card className="mb-6 space-y-4">
        <Field label="Nom de la portion" hint="Ce qui apparaîtra comme bouton rapide à l'ajout.">
          <Input value={values.servingName} onChange={set("servingName")} placeholder="1 pot" />
        </Field>
        <Field label="Poids de la portion (g)" error={fieldErrors.servingGrams?.[0]}>
          <NumberInput value={values.servingGrams} onChange={set("servingGrams")} placeholder="150" />
        </Field>
      </Card>

      <Button type="submit" size="lg" fullWidth loading={pending}>
        {values.id ? "Enregistrer les modifications" : "Créer l'aliment"}
      </Button>

      {toast.node}
    </form>
  );
}

function NumberInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <Input type="number" inputMode="decimal" step="any" min="0" className="tabular" {...props} />;
}
