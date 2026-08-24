"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw, Sparkles } from "lucide-react";
import { Card, SectionTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { SegmentedControl, useToast } from "@/components/ui/misc";
import { saveNutritionGoalAction } from "@/server/actions/nutrition";
import { macroKcal } from "@/lib/calc";
import { MACRO_COLORS } from "./macro-bars";
import { CoherenceNotice } from "./coherence-notice";

export type GoalValues = { kcal: string; protein: string; carbs: string; fat: string; fiber: string; waterMl: string };

const num = (s: string) => {
  const n = Number(s.replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

/**
 * Objectifs caloriques (§53).
 *
 * L'estimation Mifflin-St Jeor n'est qu'un point de départ : chaque champ reste
 * modifiable, et le mode manuel est toujours accessible.
 */
export function NutritionGoalForm({
  current,
  suggestion,
  suggestionNote,
}: {
  current: GoalValues | null;
  suggestion: GoalValues | null;
  suggestionNote: string;
}) {
  const [mode, setMode] = useState<"auto" | "manuel">(current ? "manuel" : suggestion ? "auto" : "manuel");
  const [values, setValues] = useState<GoalValues>(
    current ?? suggestion ?? { kcal: "", protein: "", carbs: "", fat: "", fiber: "", waterMl: "2500" }
  );
  const [edited, setEdited] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  const set = (key: keyof GoalValues) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setEdited(true);
    setValues((v) => ({ ...v, [key]: e.target.value }));
  };

  const kcal = num(values.kcal);
  const protein = num(values.protein);
  const carbs = num(values.carbs);
  const fat = num(values.fat);
  const computed = macroKcal(protein, carbs, fat);
  const gap = kcal > 0 ? Math.abs(computed - kcal) / kcal : 0;
  const inconsistent = kcal > 0 && computed > 0 && gap > 0.1;

  const pct = (part: number) => (kcal > 0 ? Math.round((part / kcal) * 100) : 0);

  function applySuggestion() {
    if (!suggestion) return;
    setValues(suggestion);
    setEdited(false);
  }

  function switchMode(next: "auto" | "manuel") {
    setMode(next);
    if (next === "auto" && suggestion) {
      setValues(suggestion);
      setEdited(false);
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await saveNutritionGoalAction({
        kcal,
        protein,
        carbs,
        fat,
        fiber: values.fiber ? num(values.fiber) : null,
        waterMl: values.waterMl ? num(values.waterMl) : null,
        source: mode === "auto" && !edited ? "mifflin_st_jeor" : "manuel",
      });
      if (res.ok) {
        toast.show("Objectifs enregistrés");
        router.push("/nutrition");
        router.refresh();
      } else {
        toast.show(res.error, "error");
      }
    });
  }

  return (
    <form onSubmit={submit} className="px-4 pb-8 pt-4">
      <SegmentedControl
        className="mb-4"
        value={mode}
        onChange={switchMode}
        options={[
          { value: "auto", label: "Estimation automatique" },
          { value: "manuel", label: "Saisie manuelle" },
        ]}
      />

      {mode === "auto" ? (
        <Card className="mb-5 border-accent-border bg-accent-soft">
          <div className="flex items-start gap-2.5">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
            <div className="min-w-0 text-sm">
              <p className="font-medium">Estimation Mifflin-St Jeor</p>
              <p className="mt-0.5 text-xs text-muted">{suggestionNote}</p>
            </div>
          </div>
          {suggestion ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="mt-3"
              onClick={applySuggestion}
              disabled={!edited}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Revenir à l&apos;estimation
            </Button>
          ) : null}
        </Card>
      ) : null}

      <SectionTitle>Objectifs quotidiens</SectionTitle>
      <Card className="mb-5 space-y-4">
        <Field label="Calories (kcal)" hint="Tu peux toujours écraser la valeur proposée.">
          <Input
            type="number"
            inputMode="numeric"
            min="800"
            max="8000"
            step="any"
            value={values.kcal}
            onChange={set("kcal")}
            className="tabular h-14 text-xl font-semibold"
            required
          />
        </Field>

        <div className="grid grid-cols-3 gap-3">
          <MacroField label="Protéines" value={values.protein} onChange={set("protein")} pct={pct(protein * 4)} color={MACRO_COLORS.protein} />
          <MacroField label="Glucides" value={values.carbs} onChange={set("carbs")} pct={pct(carbs * 4)} color={MACRO_COLORS.carbs} />
          <MacroField label="Lipides" value={values.fat} onChange={set("fat")} pct={pct(fat * 9)} color={MACRO_COLORS.fat} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Fibres (g)">
            <Input
              type="number"
              inputMode="numeric"
              min="0"
              max="150"
              step="any"
              value={values.fiber}
              onChange={set("fiber")}
              className="tabular"
            />
          </Field>
          <Field label="Eau (ml)">
            <Input
              type="number"
              inputMode="numeric"
              min="0"
              max="10000"
              step="any"
              value={values.waterMl}
              onChange={set("waterMl")}
              className="tabular"
            />
          </Field>
        </div>

        {kcal > 0 && computed > 0 ? (
          <CoherenceNotice
            inconsistent={inconsistent}
            title={inconsistent ? "Macros et calories ne concordent pas" : "Répartition cohérente"}
            detail={`Tes macros représentent ${Math.round(computed)} kcal, pour un objectif de ${Math.round(
              kcal
            )} kcal${inconsistent ? " — ajuste l'un ou l'autre." : "."}`}
          />
        ) : null}
      </Card>

      <Button type="submit" size="lg" fullWidth loading={pending} disabled={kcal <= 0}>
        Enregistrer mes objectifs
      </Button>
      <p className="mt-3 px-1 text-xs text-subtle">
        L&apos;objectif précédent est conservé dans ton historique : tes statistiques passées restent
        comparées à ce qui avait cours à l&apos;époque.
      </p>

      {toast.node}
    </form>
  );
}

function MacroField({
  label,
  value,
  onChange,
  pct,
  color,
}: {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  pct: number;
  color: string;
}) {
  return (
    <Field label={label}>
      <Input type="number" inputMode="numeric" min="0" step="any" value={value} onChange={onChange} className="tabular" />
      <p className="tabular mt-1.5 text-xs font-medium" style={{ color }}>
        {pct} % des kcal
      </p>
    </Field>
  );
}
