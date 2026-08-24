import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/layout/page-header";
import { SettingsView } from "@/components/profile/settings-view";

export const metadata: Metadata = { title: "Paramètres" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await requireUser();
  const p = user.profile;
  const s = user.settings;

  return (
    <div>
      <PageHeader title="Paramètres" back="/profil" />
      <SettingsView
        profile={{
          firstName: p?.firstName ?? user.name ?? "",
          sex: p?.sex ?? null,
          birthDate: p?.birthDate ? p.birthDate.toISOString().slice(0, 10) : "",
          heightCm: p?.heightCm ?? null,
          targetWeightKg: p?.targetWeightKg ?? null,
          level: p?.level ?? "intermediaire",
          mainGoal: p?.mainGoal ?? "hypertrophie",
          activityLevel: p?.activityLevel ?? "modere",
          sessionsPerWeek: p?.sessionsPerWeek ?? 4,
          sessionMinutes: p?.sessionMinutes ?? 60,
          equipment: (p?.equipment ?? "").split(",").filter(Boolean),
          availableDays: (p?.availableDays ?? "")
            .split(",")
            .filter(Boolean)
            .map(Number),
        }}
        settings={{
          weightUnit: (s?.weightUnit ?? "kg") as "kg" | "lb",
          lengthUnit: (s?.lengthUnit ?? "cm") as "cm" | "in",
          theme: (s?.theme ?? "dark") as "dark" | "light" | "system",
          accentColor: s?.accentColor ?? "lime",
          defaultRestSeconds: s?.defaultRestSeconds ?? 120,
          autoStartRestTimer: s?.autoStartRestTimer ?? true,
          restTimerVibrate: s?.restTimerVibrate ?? true,
          restTimerSound: s?.restTimerSound ?? true,
          keepScreenAwake: s?.keepScreenAwake ?? true,
          showRpe: s?.showRpe ?? true,
          showRir: s?.showRir ?? false,
          prefillLastSession: s?.prefillLastSession ?? true,
          autoProgressionEnabled: s?.autoProgressionEnabled ?? true,
          upperIncrementKg: s?.upperIncrementKg ?? 2.5,
          lowerIncrementKg: s?.lowerIncrementKg ?? 5,
          notificationsEnabled: s?.notificationsEnabled ?? false,
          consistencyEnabled: s?.consistencyEnabled ?? true,
        }}
      />
    </div>
  );
}
