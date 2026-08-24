"use client";

import { useState, useTransition } from "react";
import { Check } from "lucide-react";
import { updateProfileAction, updateSettingsAction } from "@/server/actions/settings";
import { Card, SectionTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Input, PillGroup, Select, Toggle } from "@/components/ui/field";
import { SegmentedControl, Sheet, useToast } from "@/components/ui/misc";
import { DangerZone } from "@/components/profile/danger-zone";
import {
  ACCENT_COLORS,
  ACTIVITY_LEVELS,
  DAY_SHORT,
  DAY_LABELS,
  EQUIPMENT_OPTIONS,
  LEVELS,
  MAIN_GOALS,
} from "@/lib/constants";
import { cn } from "@/lib/utils";

type ProfileState = {
  firstName: string;
  sex: string | null;
  birthDate: string;
  heightCm: number | null;
  targetWeightKg: number | null;
  level: string;
  mainGoal: string;
  activityLevel: string;
  sessionsPerWeek: number;
  sessionMinutes: number;
  equipment: string[];
  availableDays: number[];
};

type SettingsState = {
  weightUnit: "kg" | "lb";
  lengthUnit: "cm" | "in";
  theme: "dark" | "light" | "system";
  accentColor: string;
  defaultRestSeconds: number;
  autoStartRestTimer: boolean;
  restTimerVibrate: boolean;
  restTimerSound: boolean;
  keepScreenAwake: boolean;
  showRpe: boolean;
  showRir: boolean;
  prefillLastSession: boolean;
  autoProgressionEnabled: boolean;
  upperIncrementKg: number;
  lowerIncrementKg: number;
  notificationsEnabled: boolean;
  consistencyEnabled: boolean;
};

export function SettingsView({
  profile: initialProfile,
  settings: initialSettings,
}: {
  profile: ProfileState;
  settings: SettingsState;
}) {
  const toast = useToast();
  const [profile, setProfile] = useState(initialProfile);
  const [settings, setSettings] = useState(initialSettings);
  const [profileOpen, setProfileOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  /** Les réglages s'appliquent immédiatement : aucun bouton « enregistrer ». */
  function patchSettings(patch: Partial<SettingsState>) {
    const next = { ...settings, ...patch };
    setSettings(next);

    // Le thème et l'accent sont appliqués tout de suite, sans attendre le serveur.
    if (patch.theme) {
      const root = document.documentElement;
      const resolved =
        patch.theme === "system"
          ? window.matchMedia("(prefers-color-scheme: dark)").matches
            ? "dark"
            : "light"
          : patch.theme;
      root.setAttribute("data-theme", resolved);
      try {
        localStorage.setItem("muscu.theme", patch.theme);
      } catch {
        /* ignoré */
      }
    }
    if (patch.accentColor) {
      document.documentElement.setAttribute("data-accent", patch.accentColor);
      try {
        localStorage.setItem("muscu.accent", patch.accentColor);
      } catch {
        /* ignoré */
      }
    }

    startTransition(async () => {
      const res = await updateSettingsAction(patch);
      if (!res.ok) toast.show(res.error, "error");
    });
  }

  function saveProfile() {
    startTransition(async () => {
      const res = await updateProfileAction({
        ...profile,
        birthDate: profile.birthDate || null,
        heightCm: profile.heightCm ?? undefined,
        targetWeightKg: profile.targetWeightKg ?? null,
      });
      if (res.ok) {
        toast.show("Profil mis à jour");
        setProfileOpen(false);
      } else {
        toast.show(res.error, "error");
      }
    });
  }

  async function askNotificationPermission() {
    if (typeof Notification === "undefined") {
      toast.show("Notifications non supportées par ce navigateur", "error");
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      patchSettings({ notificationsEnabled: true });
      toast.show("Notifications activées");
    } else {
      toast.show("Autorisation refusée dans le navigateur", "error");
    }
  }

  return (
    <div className="px-4 pt-4">
      {/* ---------------------------------------------------------- Profil */}
      <SectionTitle>Profil</SectionTitle>
      <Card className="mb-5">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-medium">{profile.firstName}</p>
            <p className="truncate text-sm text-muted">
              {MAIN_GOALS[profile.mainGoal as keyof typeof MAIN_GOALS]?.label} ·{" "}
              {profile.sessionsPerWeek} séances / semaine
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={() => setProfileOpen(true)}>
            Modifier
          </Button>
        </div>
      </Card>

      {/* ------------------------------------------------------ Apparence */}
      <SectionTitle>Apparence</SectionTitle>
      <Card className="mb-5">
        <p className="mb-2 text-sm text-muted">Thème</p>
        <SegmentedControl
          value={settings.theme}
          onChange={(v) => patchSettings({ theme: v })}
          options={[
            { value: "dark" as const, label: "Sombre" },
            { value: "light" as const, label: "Clair" },
            { value: "system" as const, label: "Système" },
          ]}
        />

        <p className="mb-2 mt-4 text-sm text-muted">Couleur d&apos;accent</p>
        <div className="flex flex-wrap gap-2.5">
          {Object.entries(ACCENT_COLORS).map(([key, meta]) => (
            <button
              key={key}
              onClick={() => patchSettings({ accentColor: key })}
              aria-label={meta.label}
              aria-pressed={settings.accentColor === key}
              className={cn(
                "flex h-11 w-11 items-center justify-center rounded-2xl transition-transform active:scale-90",
                settings.accentColor === key && "ring-2 ring-offset-2 ring-offset-[var(--surface)]"
              )}
              style={{
                background: `hsl(${meta.hue})`,
                ...(settings.accentColor === key ? { boxShadow: `0 0 0 2px hsl(${meta.hue})` } : {}),
              }}
            >
              {settings.accentColor === key ? (
                <Check className="h-4 w-4 text-black/70" strokeWidth={3} />
              ) : null}
            </button>
          ))}
        </div>
      </Card>

      {/* ---------------------------------------------------------- Unités */}
      <SectionTitle>Unités</SectionTitle>
      <Card className="mb-5">
        <p className="mb-2 text-sm text-muted">Poids</p>
        <SegmentedControl
          value={settings.weightUnit}
          onChange={(v) => patchSettings({ weightUnit: v })}
          options={[
            { value: "kg" as const, label: "Kilogrammes" },
            { value: "lb" as const, label: "Livres" },
          ]}
        />
        <p className="mb-2 mt-4 text-sm text-muted">Mensurations</p>
        <SegmentedControl
          value={settings.lengthUnit}
          onChange={(v) => patchSettings({ lengthUnit: v })}
          options={[
            { value: "cm" as const, label: "Centimètres" },
            { value: "in" as const, label: "Pouces" },
          ]}
        />
      </Card>

      {/* ---------------------------------------------------------- Séance */}
      <SectionTitle>Séance</SectionTitle>
      <Card className="mb-5 divide-y divide-border">
        <div className="pb-3">
          <p className="mb-2 text-sm text-muted">Repos par défaut</p>
          <div className="flex gap-2">
            {[60, 90, 120, 180, 240].map((s) => (
              <button
                key={s}
                onClick={() => patchSettings({ defaultRestSeconds: s })}
                className={cn(
                  "tabular h-11 flex-1 rounded-xl text-sm font-medium",
                  settings.defaultRestSeconds === s
                    ? "bg-accent text-accent-contrast"
                    : "bg-surface-2 text-muted"
                )}
              >
                {Math.floor(s / 60)}:{String(s % 60).padStart(2, "0")}
              </button>
            ))}
          </div>
        </div>

        <Toggle
          label="Démarrer le timer automatiquement"
          hint="Dès qu'une série est validée"
          checked={settings.autoStartRestTimer}
          onChange={(v) => patchSettings({ autoStartRestTimer: v })}
        />
        <Toggle
          label="Vibration"
          hint="À la fin du repos et à la validation d'une série"
          checked={settings.restTimerVibrate}
          onChange={(v) => patchSettings({ restTimerVibrate: v })}
        />
        <Toggle
          label="Son de fin de repos"
          checked={settings.restTimerSound}
          onChange={(v) => patchSettings({ restTimerSound: v })}
        />
        <Toggle
          label="Garder l'écran allumé"
          hint="Pendant toute la séance"
          checked={settings.keepScreenAwake}
          onChange={(v) => patchSettings({ keepScreenAwake: v })}
        />
        <Toggle
          label="Afficher le RPE"
          hint="Effort perçu de 1 à 10"
          checked={settings.showRpe}
          onChange={(v) => patchSettings({ showRpe: v })}
        />
        <Toggle
          label="Afficher le RIR"
          hint="Répétitions en réserve"
          checked={settings.showRir}
          onChange={(v) => patchSettings({ showRir: v })}
        />
        <Toggle
          label="Préremplir avec la dernière séance"
          checked={settings.prefillLastSession}
          onChange={(v) => patchSettings({ prefillLastSession: v })}
        />
      </Card>

      {/* --------------------------------------------- Progression auto */}
      <SectionTitle>Progression automatique</SectionTitle>
      <Card className="mb-5">
        <Toggle
          label="Proposer la charge suivante"
          hint="Suggestion affichée pendant la séance, jamais appliquée sans toi"
          checked={settings.autoProgressionEnabled}
          onChange={(v) => patchSettings({ autoProgressionEnabled: v })}
        />
        {settings.autoProgressionEnabled ? (
          <div className="mt-3 grid grid-cols-2 gap-3 border-t border-border pt-3">
            <Field label="Incrément haut du corps">
              <Input
                type="number"
                step="0.5"
                min="0.5"
                value={settings.upperIncrementKg}
                onChange={(e) => patchSettings({ upperIncrementKg: Number(e.target.value) })}
              />
            </Field>
            <Field label="Incrément bas du corps">
              <Input
                type="number"
                step="0.5"
                min="0.5"
                value={settings.lowerIncrementKg}
                onChange={(e) => patchSettings({ lowerIncrementKg: Number(e.target.value) })}
              />
            </Field>
          </div>
        ) : null}
        <p className="mt-3 text-xs text-subtle">
          Règle appliquée : si toutes les séries de travail atteignent le haut de la fourchette de
          répétitions, la charge supérieure est proposée. Deux séances sous le bas de la fourchette
          déclenchent une proposition de deload.
        </p>
      </Card>

      {/* --------------------------------------------------------- Divers */}
      <SectionTitle>Notifications et affichage</SectionTitle>
      <Card className="mb-5 divide-y divide-border">
        <Toggle
          label="Notifications du navigateur"
          hint="Rappels d'entraînement, fin de repos"
          checked={settings.notificationsEnabled}
          onChange={(v) => (v ? void askNotificationPermission() : patchSettings({ notificationsEnabled: false }))}
        />
        <Toggle
          label="Afficher le score de régularité"
          hint="Indicateur facultatif dans les statistiques"
          checked={settings.consistencyEnabled}
          onChange={(v) => patchSettings({ consistencyEnabled: v })}
        />
      </Card>

      <DangerZone />

      {pending ? (
        <p className="mt-4 text-center text-xs text-subtle">Enregistrement…</p>
      ) : null}

      {/* ------------------------------------------------ Feuille profil */}
      <Sheet
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        title="Mon profil"
        fullHeight
        footer={
          <Button fullWidth size="lg" loading={pending} onClick={saveProfile}>
            Enregistrer
          </Button>
        }
      >
        <div className="space-y-4">
          <Field label="Prénom">
            <Input
              value={profile.firstName}
              onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
            />
          </Field>

          <Field label="Sexe" hint="Utilisé uniquement pour estimer les besoins caloriques">
            <Select
              value={profile.sex ?? ""}
              onChange={(e) => setProfile({ ...profile, sex: e.target.value || null })}
            >
              <option value="">Non précisé</option>
              <option value="homme">Homme</option>
              <option value="femme">Femme</option>
              <option value="autre">Autre</option>
            </Select>
          </Field>

          <Field label="Date de naissance">
            <Input
              type="date"
              value={profile.birthDate}
              onChange={(e) => setProfile({ ...profile, birthDate: e.target.value })}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Taille (cm)">
              <Input
                type="number"
                value={profile.heightCm ?? ""}
                onChange={(e) =>
                  setProfile({ ...profile, heightCm: e.target.value ? Number(e.target.value) : null })
                }
              />
            </Field>
            <Field label="Poids objectif (kg)">
              <Input
                type="number"
                step="0.1"
                value={profile.targetWeightKg ?? ""}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    targetWeightKg: e.target.value ? Number(e.target.value) : null,
                  })
                }
              />
            </Field>
          </div>

          <Field label="Objectif principal">
            <PillGroup
              columns={2}
              value={profile.mainGoal}
              onChange={(v) => setProfile({ ...profile, mainGoal: v })}
              options={Object.entries(MAIN_GOALS).map(([k, v]) => ({ value: k, label: v.label }))}
            />
          </Field>

          <Field label="Niveau">
            <PillGroup
              columns={2}
              value={profile.level}
              onChange={(v) => setProfile({ ...profile, level: v })}
              options={Object.entries(LEVELS).map(([k, v]) => ({ value: k, label: v.label }))}
            />
          </Field>

          <Field label="Niveau d'activité">
            <Select
              value={profile.activityLevel}
              onChange={(e) => setProfile({ ...profile, activityLevel: e.target.value })}
            >
              {Object.entries(ACTIVITY_LEVELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.label}
                </option>
              ))}
            </Select>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Séances / semaine">
              <Input
                type="number"
                min={1}
                max={14}
                value={profile.sessionsPerWeek}
                onChange={(e) => setProfile({ ...profile, sessionsPerWeek: Number(e.target.value) })}
              />
            </Field>
            <Field label="Durée (min)">
              <Input
                type="number"
                min={15}
                max={240}
                value={profile.sessionMinutes}
                onChange={(e) => setProfile({ ...profile, sessionMinutes: Number(e.target.value) })}
              />
            </Field>
          </div>

          <Field label="Jours disponibles">
            <div className="grid grid-cols-7 gap-1.5">
              {DAY_SHORT.map((d, i) => {
                const day = i + 1;
                const active = profile.availableDays.includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    aria-label={DAY_LABELS[i]}
                    aria-pressed={active}
                    onClick={() =>
                      setProfile({
                        ...profile,
                        availableDays: active
                          ? profile.availableDays.filter((x) => x !== day)
                          : [...profile.availableDays, day].sort((a, b) => a - b),
                      })
                    }
                    className={cn(
                      "h-12 rounded-2xl border text-sm font-semibold transition-all active:scale-95",
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

          <Field label="Équipement disponible">
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(EQUIPMENT_OPTIONS).map(([key, label]) => {
                const active = profile.equipment.includes(key);
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() =>
                      setProfile({
                        ...profile,
                        equipment: active
                          ? profile.equipment.filter((x) => x !== key)
                          : [...profile.equipment, key],
                      })
                    }
                    className={cn(
                      "flex items-center justify-between rounded-2xl border px-3.5 py-3 text-sm transition-all",
                      active
                        ? "border-accent-border bg-accent-soft text-text"
                        : "border-border bg-surface-2 text-muted"
                    )}
                  >
                    <span>{label}</span>
                    {active ? <Check className="h-4 w-4 text-accent" /> : null}
                  </button>
                );
              })}
            </div>
          </Field>
        </div>
      </Sheet>

      {toast.node}
    </div>
  );
}
