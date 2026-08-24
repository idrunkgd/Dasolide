import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/layout/page-header";
import { GoalsPanel } from "@/components/progression/goals-panel";
import { resolveCurrentValue, type GoalView } from "@/components/progression/goal-utils";
import { dateKey } from "@/lib/utils";

export const dynamic = "force-dynamic";

/**
 * §26 — Objectifs.
 *
 * La valeur courante n'est jamais saisie à la main : elle est relue depuis les
 * données réelles (dernière pesée, dernière mensuration, meilleur record).
 */
export default async function GoalsPage() {
  const user = await requireUser();

  const goals = await prisma.goal.findMany({
    where: { userId: user.id },
    include: { exercise: { select: { name: true } } },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });

  const exerciseIds = goals.map((g) => g.exerciseId).filter((id): id is string => Boolean(id));

  const [lastWeight, measurements, records] = await Promise.all([
    prisma.bodyWeight.findFirst({ where: { userId: user.id }, orderBy: { date: "desc" } }),
    prisma.bodyMeasurement.findMany({ where: { userId: user.id }, orderBy: { date: "desc" }, take: 40 }),
    exerciseIds.length
      ? prisma.personalRecord.findMany({
          where: { userId: user.id, type: "max_weight", exerciseId: { in: exerciseIds } },
          orderBy: { value: "desc" },
        })
      : Promise.resolve([]),
  ]);

  /** Meilleure charge par exercice. */
  const bestByExercise = new Map<string, number>();
  for (const record of records) {
    if (!bestByExercise.has(record.exerciseId)) bestByExercise.set(record.exerciseId, record.value);
  }

  const context = {
    lastWeightKg: lastWeight?.weightKg ?? null,
    measurements: measurements as unknown as Record<string, unknown>[],
    bestByExercise,
  };

  const views: GoalView[] = goals.map((g) => {
    return {
      id: g.id,
      type: g.type,
      title: g.title,
      unit: g.unit,
      startValue: g.startValue,
      targetValue: g.targetValue,
      targetDate: g.targetDate ? dateKey(g.targetDate) : null,
      status: g.status,
      measureKey: g.measureKey,
      exerciseId: g.exerciseId,
      exerciseName: g.exercise?.name ?? null,
      currentValue: resolveCurrentValue(g, context),
    };
  });

  return (
    <>
      <PageHeader title="Objectifs" subtitle="Mesurables et datés" back="/progression" />
      <GoalsPanel goals={views} />
    </>
  );
}
