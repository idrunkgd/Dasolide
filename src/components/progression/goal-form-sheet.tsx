"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveGoalAction } from "@/server/actions/body";
import { Button } from "@/components/ui/button";
import { Field, Input, PillGroup, Select } from "@/components/ui/field";
import { Sheet } from "@/components/ui/misc";
import { GOAL_TYPES, MEASUREMENT_FIELDS } from "@/lib/constants";
import { ExerciseSelect } from "./exercise-select";
import { defaultUnitFor, type GoalView } from "./goal-utils";
import { parseNumber } from "./units";

/** Création et modification d'un objectif (§26). */
export function GoalFormSheet({
  open,
  goal,
  onClose,
}: {
  open: boolean;
  /** null = création */
  goal: GoalView | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const [type, setType] = useState(goal?.type ?? "poids");
  const [title, setTitle] = useState(goal?.title ?? "");
  const [startValue, setStartValue] = useState(goal ? String(goal.startValue) : "");
  const [targetValue, setTargetValue] = useState(goal ? String(goal.targetValue) : "");
  const [unit, setUnit] = useState(goal?.unit ?? "kg");
  const [targetDate, setTargetDate] = useState(goal?.targetDate ?? "");
  const [exerciseId, setExerciseId] = useState<string | null>(goal?.exerciseId ?? null);
  const [exerciseName, setExerciseName] = useState<string | null>(goal?.exerciseName ?? null);
  const [measureKey, setMeasureKey] = useState(goal?.measureKey ?? "waistCm");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function changeType(next: string) {
    setType(next);
    setUnit(defaultUnitFor(next));
  }

  function submit() {
    const from = parseNumber(startValue);
    const to = parseNumber(targetValue);
    if (!title.trim()) return setError("Donne un titre à ton objectif.");
    if (from == null || to == null) return setError("Renseigne la valeur de départ et la valeur cible.");
    if (from === to) return setError("La valeur cible doit être différente du départ.");
    if (type === "force" && !exerciseId) return setError("Choisis l'exercice concerné.");
    setError(null);

    start(async () => {
      const res = await saveGoalAction({
        id: goal?.id,
        type,
        title: title.trim(),
        exerciseId: type === "force" ? exerciseId : null,
        measureKey: type === "mensuration" ? measureKey : null,
        startValue: from,
        targetValue: to,
        unit: unit.trim() || defaultUnitFor(type),
        targetDate: targetDate || null,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.refresh();
      onClose();
    });
  }

  return (
    <Sheet open={open} onClose={onClose} title={goal ? "Modifier l'objectif" : "Nouvel objectif"} fullHeight>
      <div className="space-y-4">
        <Field label="Type d'objectif">
          <PillGroup
            columns={2}
            value={type}
            onChange={changeType}
            options={Object.entries(GOAL_TYPES).map(([value, label]) => ({ value, label }))}
          />
        </Field>

        <Field label="Titre">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Descendre à 80 kg"
            maxLength={100}
          />
        </Field>

        {type === "force" ? (
          <Field label="Exercice" hint="La valeur courante suivra ton meilleur record de charge.">
            <ExerciseSelect
              value={exerciseId}
              valueName={exerciseName}
              onChange={(id, name) => {
                setExerciseId(id);
                setExerciseName(name);
              }}
            />
          </Field>
        ) : null}

        {type === "mensuration" ? (
          <Field label="Mesure suivie">
            <Select value={measureKey} onChange={(e) => setMeasureKey(e.target.value)}>
              {MEASUREMENT_FIELDS.map((f) => (
                <option key={f.key} value={f.key}>
                  {f.label}
                </option>
              ))}
            </Select>
          </Field>
        ) : null}

        <div className="grid grid-cols-2 gap-3">
          <Field label="Valeur de départ">
            <Input
              type="number"
              inputMode="decimal"
              step="0.1"
              value={startValue}
              onChange={(e) => setStartValue(e.target.value)}
              className="tabular"
            />
          </Field>
          <Field label="Valeur cible">
            <Input
              type="number"
              inputMode="decimal"
              step="0.1"
              value={targetValue}
              onChange={(e) => setTargetValue(e.target.value)}
              className="tabular"
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Unité">
            <Input value={unit} onChange={(e) => setUnit(e.target.value)} maxLength={10} placeholder="kg" />
          </Field>
          <Field label="Date cible" hint="Facultatif">
            <Input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
          </Field>
        </div>

        {error ? <p className="text-sm text-danger">{error}</p> : null}

        <Button onClick={submit} loading={pending} fullWidth size="lg">
          {goal ? "Mettre à jour" : "Créer l'objectif"}
        </Button>
        <p className="pb-2 text-xs text-subtle">
          Les valeurs de départ et cible s&apos;expriment dans l&apos;unité indiquée. Pour un objectif de
          poids ou de mensuration, encode-les en kg et en cm, comme le reste de tes données.
        </p>
      </div>
    </Sheet>
  );
}
