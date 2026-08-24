"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, SectionTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea, Toggle } from "@/components/ui/field";
import { useToast } from "@/components/ui/misc";
import {
  CATEGORIES,
  DIFFICULTIES,
  EQUIPMENT,
  MOVEMENT_TYPES,
  TRACKING_TYPES,
} from "@/lib/constants";
import { createExerciseAction, updateExerciseAction } from "@/server/actions/exercise";
import { MusclePicker } from "./muscle-picker";
import type { MuscleOption } from "./types";

export type ExerciseFormValues = {
  id?: string;
  name: string;
  description: string;
  instructions: string;
  category: string;
  primaryMuscleSlug: string;
  secondaryMuscleSlugs: string[];
  equipment: string;
  movementType: string;
  difficulty: string;
  trackingType: string;
  isUnilateral: boolean;
  videoUrl: string;
};

export const EMPTY_EXERCISE: ExerciseFormValues = {
  name: "",
  description: "",
  instructions: "",
  category: "poitrine",
  primaryMuscleSlug: "pectoraux",
  secondaryMuscleSlugs: [],
  equipment: "halteres",
  movementType: "polyarticulaire",
  difficulty: "intermediaire",
  trackingType: "weight_reps",
  isUnilateral: false,
  videoUrl: "",
};

/** Création / modification d'un exercice personnalisé (§6). */
export function ExerciseForm({
  initial,
  muscles,
}: {
  initial: ExerciseFormValues;
  muscles: MuscleOption[];
}) {
  const [values, setValues] = useState<ExerciseFormValues>(initial);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  const set =
    (key: keyof ExerciseFormValues) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setValues((v) => ({ ...v, [key]: e.target.value }));

  function toggleSecondary(slug: string) {
    setValues((v) => ({
      ...v,
      secondaryMuscleSlugs: v.secondaryMuscleSlugs.includes(slug)
        ? v.secondaryMuscleSlugs.filter((s) => s !== slug)
        : [...v.secondaryMuscleSlugs, slug],
    }));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      name: values.name,
      description: values.description || null,
      instructions: values.instructions || null,
      category: values.category,
      primaryMuscleSlug: values.primaryMuscleSlug,
      secondaryMuscleSlugs: values.secondaryMuscleSlugs.filter((s) => s !== values.primaryMuscleSlug),
      equipment: values.equipment,
      movementType: values.movementType,
      difficulty: values.difficulty,
      trackingType: values.trackingType,
      isUnilateral: values.isUnilateral,
      videoUrl: values.videoUrl.trim() || null,
    };

    const existingId = values.id;
    startTransition(async () => {
      const res = existingId
        ? await updateExerciseAction(existingId, payload)
        : await createExerciseAction(payload);

      if (!res.ok) {
        setFieldErrors(res.fieldErrors ?? {});
        toast.show(res.error, "error");
        return;
      }
      toast.show(existingId ? "Exercice mis à jour" : "Exercice créé");
      router.push(res.data ? `/exercices/${res.data.id}` : "/exercices");
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="px-4 pb-8 pt-4">
      <SectionTitle>Identité</SectionTitle>
      <Card className="mb-5 space-y-4">
        <Field label="Nom" error={fieldErrors.name?.[0]}>
          <Input
            value={values.name}
            onChange={set("name")}
            placeholder="Développé incliné aux haltères"
            required
            maxLength={80}
          />
        </Field>
        <Field label="Description (facultatif)" error={fieldErrors.description?.[0]}>
          <Textarea
            value={values.description}
            onChange={set("description")}
            rows={3}
            maxLength={2000}
            placeholder="À quoi sert cet exercice, dans quel contexte l'utiliser."
          />
        </Field>
        <Field
          label="Instructions (facultatif)"
          hint="Une étape par ligne : elles seront numérotées automatiquement."
          error={fieldErrors.instructions?.[0]}
        >
          <Textarea
            value={values.instructions}
            onChange={set("instructions")}
            rows={4}
            maxLength={4000}
            placeholder={"Régler le banc à 30°.\nDescendre en contrôlant.\nPousser sans verrouiller les coudes."}
          />
        </Field>
      </Card>

      <SectionTitle>Muscles</SectionTitle>
      <Card className="mb-5 space-y-4">
        <MusclePicker
          muscles={muscles}
          primarySlug={values.primaryMuscleSlug}
          secondarySlugs={values.secondaryMuscleSlugs}
          onPrimaryChange={(slug) => setValues((v) => ({ ...v, primaryMuscleSlug: slug }))}
          onToggleSecondary={toggleSecondary}
          error={fieldErrors.primaryMuscleSlug?.[0]}
        />
      </Card>

      <SectionTitle>Classement</SectionTitle>
      <Card className="mb-5 space-y-4">
        <Field label="Catégorie" error={fieldErrors.category?.[0]}>
          <Select value={values.category} onChange={set("category")}>
            {Object.entries(CATEGORIES).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Équipement" error={fieldErrors.equipment?.[0]}>
          <Select value={values.equipment} onChange={set("equipment")}>
            {Object.entries(EQUIPMENT).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Type de mouvement">
          <Select value={values.movementType} onChange={set("movementType")}>
            {Object.entries(MOVEMENT_TYPES).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Difficulté">
          <Select value={values.difficulty} onChange={set("difficulty")}>
            {Object.entries(DIFFICULTIES).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Type de suivi" hint="Ce que tu encoderas pendant la séance.">
          <Select value={values.trackingType} onChange={set("trackingType")}>
            {Object.entries(TRACKING_TYPES).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
        <Toggle
          checked={values.isUnilateral}
          onChange={(v) => setValues((prev) => ({ ...prev, isUnilateral: v }))}
          label="Exercice unilatéral"
          hint="Un côté à la fois (bras, jambe)."
        />
        <Field label="Lien vidéo (facultatif)" error={fieldErrors.videoUrl?.[0]}>
          <Input
            value={values.videoUrl}
            onChange={set("videoUrl")}
            type="url"
            inputMode="url"
            placeholder="https://www.youtube.com/watch?v=…"
          />
        </Field>
      </Card>

      <Button type="submit" size="lg" fullWidth loading={pending}>
        {values.id ? "Enregistrer les modifications" : "Créer l'exercice"}
      </Button>

      {toast.node}
    </form>
  );
}
