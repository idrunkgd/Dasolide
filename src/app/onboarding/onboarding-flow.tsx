"use client";

import { useMemo, useState, useTransition } from "react";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { completeOnboardingAction } from "@/server/actions/onboarding";
import { Button } from "@/components/ui/button";
import { Field, Input, PillGroup } from "@/components/ui/field";
import { Wordmark } from "@/components/brand";
import {
  ACTIVITY_LEVELS,
  DAY_LABELS,
  DAY_SHORT,
  EQUIPMENT_OPTIONS,
  LEVELS,
  MAIN_GOALS,
} from "@/lib/constants";
import { cn } from "@/lib/utils";
import { age, suggestMacros } from "@/lib/calc";

type ProgramOption = {
  key: string;
  name: string;
  description: string;
  sessionsPerWeek: number;
  days: string[];
};

const STEPS = ["Toi", "Corps", "Objectif", "Entraînement", "Matériel", "Programme"] as const;

export function OnboardingFlow({
  defaultName,
  programs,
}: {
  defaultName: string;
  programs: ProgramOption[];
}) {
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const [firstName, setFirstName] = useState(defaultName);
  const [sex, setSex] = useState<"homme" | "femme" | "autre" | null>(null);
  const [birthDate, setBirthDate] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [currentWeightKg, setCurrentWeightKg] = useState("");
  const [targetWeightKg, setTargetWeightKg] = useState("");
  const [mainGoal, setMainGoal] = useState<string>("hypertrophie");
  const [level, setLevel] = useState<string>("intermediaire");
  const [activityLevel, setActivityLevel] = useState<string>("modere");
  const [sessionsPerWeek, setSessionsPerWeek] = useState(4);
  const [sessionMinutes, setSessionMinutes] = useState(60);
  const [availableDays, setAvailableDays] = useState<number[]>([1, 2, 4, 5]);
  const [equipment, setEquipment] = useState<string[]>(["salle_complete"]);
  const [programKey, setProgramKey] = useState(programs[0]?.key ?? "ppl4");
  const [createDemoProgram, setCreateDemoProgram] = useState(true);

  const preview = useMemo(() => {
    const w = Number(currentWeightKg);
    const h = Number(heightCm);
    if (!w || !h) return null;
    return suggestMacros({
      weightKg: w,
      heightCm: h,
      age: age(birthDate || null),
      sex,
      activityLevel: activityLevel as keyof typeof ACTIVITY_LEVELS,
      mainGoal: mainGoal as keyof typeof MAIN_GOALS,
      sessionsPerWeek,
    });
  }, [currentWeightKg, heightCm, birthDate, sex, activityLevel, mainGoal, sessionsPerWeek]);

  const canContinue = (() => {
    switch (step) {
      case 0:
        return firstName.trim().length > 0;
      case 1:
        return Number(heightCm) >= 100 && Number(currentWeightKg) >= 25;
      case 2:
        return Boolean(mainGoal);
      case 3:
        return availableDays.length > 0 && sessionsPerWeek > 0;
      case 4:
        return equipment.length > 0;
      default:
        return true;
    }
  })();

  function toggleDay(d: number) {
    setAvailableDays((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort((a, b) => a - b)
    );
  }

  function toggleEquipment(key: string) {
    setEquipment((prev) => (prev.includes(key) ? prev.filter((x) => x !== key) : [...prev, key]));
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await completeOnboardingAction({
        firstName: firstName.trim(),
        sex,
        birthDate: birthDate || null,
        heightCm: Number(heightCm),
        currentWeightKg: Number(currentWeightKg),
        targetWeightKg: targetWeightKg ? Number(targetWeightKg) : null,
        level,
        mainGoal,
        activityLevel,
        sessionsPerWeek,
        sessionMinutes,
        equipment,
        availableDays,
        createDemoProgram,
        programKey,
      });
      if (result && !result.ok) setError(result.error);
    });
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col px-5 py-8">
      <Wordmark className="mb-6 justify-center" />

      {/* Progression */}
      <div className="mb-7 flex gap-1.5" aria-label={`Étape ${step + 1} sur ${STEPS.length}`}>
        {STEPS.map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-1 flex-1 rounded-full transition-colors duration-300",
              i <= step ? "bg-accent" : "bg-surface-3"
            )}
          />
        ))}
      </div>

      <div key={step} className="animate-fade-up flex-1">
        {step === 0 && (
          <Section title="Comment tu t'appelles ?" subtitle="Juste pour personnaliser l'application.">
            <Field label="Prénom">
              <Input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Alex"
                autoFocus
              />
            </Field>
            <Field label="Sexe" hint="Facultatif — utilisé uniquement pour estimer tes besoins caloriques.">
              <PillGroup
                columns={3}
                value={sex}
                onChange={(v) => setSex(v)}
                options={[
                  { value: "homme" as const, label: "Homme" },
                  { value: "femme" as const, label: "Femme" },
                  { value: "autre" as const, label: "Autre" },
                ]}
              />
            </Field>
            <Field label="Date de naissance" hint="Facultatif — affine l'estimation du métabolisme.">
              <Input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
            </Field>
          </Section>
        )}

        {step === 1 && (
          <Section title="Ton point de départ" subtitle="Tu pourras tout modifier plus tard.">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Taille (cm)">
                <Input
                  type="number"
                  inputMode="decimal"
                  value={heightCm}
                  onChange={(e) => setHeightCm(e.target.value)}
                  placeholder="178"
                  autoFocus
                />
              </Field>
              <Field label="Poids actuel (kg)">
                <Input
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  value={currentWeightKg}
                  onChange={(e) => setCurrentWeightKg(e.target.value)}
                  placeholder="84.2"
                />
              </Field>
            </div>
            <Field label="Poids objectif (kg)" hint="Facultatif — pour suivre ta progression vers une cible.">
              <Input
                type="number"
                inputMode="decimal"
                step="0.1"
                value={targetWeightKg}
                onChange={(e) => setTargetWeightKg(e.target.value)}
                placeholder="80"
              />
            </Field>
            <Field label="Niveau d'activité en dehors des séances">
              <PillGroup
                columns={1}
                value={activityLevel}
                onChange={setActivityLevel}
                options={Object.entries(ACTIVITY_LEVELS).map(([k, v]) => ({
                  value: k,
                  label: v.label,
                  hint: v.hint,
                }))}
              />
            </Field>
          </Section>
        )}

        {step === 2 && (
          <Section title="Ton objectif principal" subtitle="Il détermine tes calories et tes macros.">
            <PillGroup
              columns={2}
              value={mainGoal}
              onChange={setMainGoal}
              options={Object.entries(MAIN_GOALS).map(([k, v]) => ({ value: k, label: v.label }))}
            />
            {preview ? (
              <div className="mt-5 rounded-2xl border border-accent-border bg-accent-soft p-4">
                <p className="text-xs font-medium uppercase tracking-wider text-accent">
                  Estimation de tes besoins
                </p>
                <p className="tabular mt-1.5 text-2xl font-bold">{preview.kcal} kcal</p>
                <p className="tabular mt-1 text-sm text-muted">
                  {preview.protein} g protéines · {preview.carbs} g glucides · {preview.fat} g lipides
                </p>
                <p className="mt-2 text-xs text-subtle">
                  Formule Mifflin-St Jeor. Tu pourras remplacer ces valeurs manuellement.
                </p>
              </div>
            ) : null}
          </Section>
        )}

        {step === 3 && (
          <Section title="Ton rythme" subtitle="Ce que tu peux réellement tenir sur la durée.">
            <Field label="Niveau">
              <PillGroup
                columns={2}
                value={level}
                onChange={setLevel}
                options={Object.entries(LEVELS).map(([k, v]) => ({ value: k, label: v.label, hint: v.hint }))}
              />
            </Field>

            <Field label={`Séances par semaine : ${sessionsPerWeek}`}>
              <input
                type="range"
                min={1}
                max={7}
                value={sessionsPerWeek}
                onChange={(e) => setSessionsPerWeek(Number(e.target.value))}
                className="h-2 w-full cursor-pointer appearance-none rounded-full bg-surface-3 accent-[var(--accent)]"
              />
            </Field>

            <Field label={`Durée moyenne disponible : ${sessionMinutes} min`}>
              <input
                type="range"
                min={20}
                max={150}
                step={5}
                value={sessionMinutes}
                onChange={(e) => setSessionMinutes(Number(e.target.value))}
                className="h-2 w-full cursor-pointer appearance-none rounded-full bg-surface-3 accent-[var(--accent)]"
              />
            </Field>

            <Field label="Jours disponibles">
              <div className="grid grid-cols-7 gap-1.5">
                {DAY_SHORT.map((d, i) => {
                  const day = i + 1;
                  const active = availableDays.includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleDay(day)}
                      aria-pressed={active}
                      aria-label={DAY_LABELS[i]}
                      className={cn(
                        "flex h-12 items-center justify-center rounded-2xl border text-sm font-semibold transition-all active:scale-95",
                        active
                          ? "border-accent-border bg-accent-soft text-accent"
                          : "border-border bg-surface-2 text-subtle"
                      )}
                    >
                      {d}
                    </button>
                  );
                })}
              </div>
            </Field>
          </Section>
        )}

        {step === 4 && (
          <Section title="Ton matériel" subtitle="Pour te proposer des exercices réalisables.">
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(EQUIPMENT_OPTIONS).map(([key, label]) => {
                const active = equipment.includes(key);
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => toggleEquipment(key)}
                    aria-pressed={active}
                    className={cn(
                      "flex items-center justify-between rounded-2xl border px-4 py-3.5 text-sm transition-all active:scale-[0.98]",
                      active
                        ? "border-accent-border bg-accent-soft text-text"
                        : "border-border bg-surface-2 text-muted"
                    )}
                  >
                    <span className="font-medium">{label}</span>
                    {active ? <Check className="h-4 w-4 text-accent" /> : null}
                  </button>
                );
              })}
            </div>
          </Section>
        )}

        {step === 5 && (
          <Section title="Ton programme de départ" subtitle="Tu pourras le modifier ou en créer un autre.">
            <div className="space-y-2">
              {programs.map((p) => {
                const active = createDemoProgram && programKey === p.key;
                return (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => {
                      setProgramKey(p.key);
                      setCreateDemoProgram(true);
                    }}
                    className={cn(
                      "w-full rounded-2xl border p-4 text-left transition-all active:scale-[0.99]",
                      active ? "border-accent-border bg-accent-soft" : "border-border bg-surface-2"
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold">{p.name}</span>
                      <span className="shrink-0 rounded-full bg-surface-3 px-2 py-0.5 text-xs text-muted">
                        {p.sessionsPerWeek}×/sem
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-muted">{p.description}</p>
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {p.days.map((d, i) => (
                        <span key={i} className="rounded-lg bg-surface-3 px-2 py-0.5 text-[0.7rem] text-subtle">
                          {d}
                        </span>
                      ))}
                    </div>
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => setCreateDemoProgram(false)}
                className={cn(
                  "w-full rounded-2xl border p-4 text-left transition-all",
                  !createDemoProgram ? "border-accent-border bg-accent-soft" : "border-border bg-surface-2"
                )}
              >
                <span className="font-semibold">Je crée le mien</span>
                <p className="mt-1 text-sm text-muted">
                  Partir d&apos;une page blanche et composer ton programme exercice par exercice.
                </p>
              </button>
            </div>
          </Section>
        )}
      </div>

      {error ? (
        <p className="mt-4 rounded-2xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
        </p>
      ) : null}

      <div className="mt-8 flex gap-3">
        {step > 0 ? (
          <Button variant="secondary" size="lg" onClick={() => setStep((s) => s - 1)} aria-label="Précédent">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        ) : null}

        {step < STEPS.length - 1 ? (
          <Button size="lg" fullWidth disabled={!canContinue} onClick={() => setStep((s) => s + 1)}>
            Continuer
            <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button size="lg" fullWidth loading={pending} onClick={submit}>
            Commencer
            <ArrowRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h1 className="text-2xl font-bold leading-tight">{title}</h1>
      {subtitle ? <p className="mt-1.5 text-sm text-muted">{subtitle}</p> : null}
      <div className="mt-6 space-y-4">{children}</div>
    </div>
  );
}
