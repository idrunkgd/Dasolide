import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getActiveNutritionGoal } from "@/server/queries/nutrition";
import { Card, SectionTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/misc";
import { PageHeader } from "@/components/layout/page-header";
import { NutritionGoalForm, type GoalValues } from "@/components/nutrition/goal-form";
import { age, suggestMacros } from "@/lib/calc";
import { ACTIVITY_LEVELS, MAIN_GOALS, type ActivityLevel, type MainGoal } from "@/lib/constants";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ObjectifsPage() {
  const user = await requireUser();
  const profile = user.profile;

  const [goal, lastWeight, history] = await Promise.all([
    getActiveNutritionGoal(user.id),
    prisma.bodyWeight.findFirst({ where: { userId: user.id }, orderBy: { date: "desc" } }),
    prisma.nutritionGoal.findMany({
      where: { userId: user.id, isActive: false },
      orderBy: { activeFrom: "desc" },
      take: 5,
    }),
  ]);

  const weightKg = lastWeight?.weightKg ?? profile?.startWeightKg ?? null;
  const heightCm = profile?.heightCm ?? null;

  let suggestion: GoalValues | null = null;
  let suggestionNote =
    "Complète ta taille et ton poids dans ton profil pour obtenir une estimation personnalisée.";

  if (weightKg && heightCm) {
    const activityLevel = (profile?.activityLevel ?? "modere") as ActivityLevel;
    const mainGoal = (profile?.mainGoal ?? "hypertrophie") as MainGoal;
    const s = suggestMacros({
      weightKg,
      heightCm,
      age: age(profile?.birthDate ?? null),
      sex: profile?.sex ?? null,
      activityLevel,
      mainGoal,
      sessionsPerWeek: profile?.sessionsPerWeek ?? 4,
    });
    suggestion = {
      kcal: String(s.kcal),
      protein: String(s.protein),
      carbs: String(s.carbs),
      fat: String(s.fat),
      fiber: String(s.fiber),
      waterMl: String(Math.round(weightKg * 35)),
    };
    suggestionNote = `Calculée à partir de ${Math.round(weightKg)} kg, ${Math.round(heightCm)} cm, ${age(
      profile?.birthDate ?? null
    )} ans — activité « ${ACTIVITY_LEVELS[activityLevel]?.label ?? "modérée"} », objectif « ${
      MAIN_GOALS[mainGoal]?.label ?? "hypertrophie"
    } ».`;
  }

  const current: GoalValues | null = goal
    ? {
        kcal: String(Math.round(goal.kcal)),
        protein: String(Math.round(goal.protein)),
        carbs: String(Math.round(goal.carbs)),
        fat: String(Math.round(goal.fat)),
        fiber: goal.fiber != null ? String(Math.round(goal.fiber)) : "",
        waterMl: goal.waterMl != null ? String(Math.round(goal.waterMl)) : "2500",
      }
    : null;

  return (
    <>
      <PageHeader title="Objectifs nutritionnels" back="/nutrition" />

      <NutritionGoalForm current={current} suggestion={suggestion} suggestionNote={suggestionNote} />

      {history.length > 0 ? (
        <div className="px-4 pb-8">
          <SectionTitle>Historique</SectionTitle>
          <Card className="p-0">
            <ul className="divide-y divide-border">
              {history.map((h) => (
                <li key={h.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="tabular text-sm font-medium">
                      {Math.round(h.kcal)} kcal · P {Math.round(h.protein)} · G {Math.round(h.carbs)} · L{" "}
                      {Math.round(h.fat)}
                    </p>
                    <p className="text-xs text-subtle">Actif à partir du {formatDate(h.activeFrom)}</p>
                  </div>
                  <Badge tone="neutral">{h.source === "manuel" ? "Manuel" : "Estimé"}</Badge>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      ) : null}
    </>
  );
}
