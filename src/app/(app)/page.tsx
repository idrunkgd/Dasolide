import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  Flame,
  Plus,
  Scale,
  Timer,
  TrendingUp,
  Trophy,
} from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getTodayPlan } from "@/server/planning";
import { getActiveSession, getDaysSinceLastSession, getWeekSummary } from "@/server/queries/training";
import { getDayNutrition } from "@/server/queries/nutrition";
import { getWeightData } from "@/server/queries/body";
import { Card, SectionTitle } from "@/components/ui/card";
import { Badge, ProgressBar } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { MacroRing } from "@/components/nutrition/macro-ring";
import { StartSessionButton } from "@/components/session/start-session-button";
import { QuickWeightCard } from "@/components/progression/quick-weight-card";
import {
  APP_TIMEZONE,
  formatDateLong,
  formatDurationHuman,
  formatSigned,
  formatVolume,
  formatWeight,
  startOfDay,
} from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireUser();
  const unit = (user.settings?.weightUnit ?? "kg") as "kg" | "lb";

  const [{ todayPlan, nextPlan }, activeSession, week, sinceLast, nutrition, weight, recentPr] =
    await Promise.all([
      getTodayPlan(user.id),
      getActiveSession(user.id),
      getWeekSummary(user.id),
      getDaysSinceLastSession(user.id),
      getDayNutrition(user.id, new Date()),
      getWeightData(user.id, 120),
      // On ne met en avant que les records parlants : une charge maximale ou
      // un 1RM estimé, jamais un volume de séance.
      prisma.personalRecord.findFirst({
        where: { userId: user.id, type: { in: ["max_weight", "estimated_1rm"] } },
        orderBy: { achievedAt: "desc" },
        include: { exercise: { select: { name: true } } },
      }),
    ]);

  const template = todayPlan?.template ?? null;
  const isRestDay = todayPlan?.status === "rest" || (!template && !todayPlan);
  const doneToday = todayPlan?.status === "completed";

  const plannedSets = template?.exercises.reduce((a, e) => a + e.sets, 0) ?? 0;
  const estimatedSeconds =
    template?.exercises.reduce((a, e) => a + e.sets * (e.restSeconds + 45), 0) ?? 0;
  const muscles = [
    ...new Set(template?.exercises.map((e) => e.exercise.category) ?? []),
  ];

  const goal = nutrition.goal;
  const totals = nutrition.totals;

  return (
    <div className="px-4 pt-5">
      <header className="mb-5 flex items-end justify-between">
        <div>
          <p className="text-sm capitalize text-muted">{formatDateLong(new Date())}</p>
          <h1 className="mt-0.5 text-2xl font-bold">
            Salut {user.profile?.firstName ?? user.name} 👋
          </h1>
        </div>
        <Link
          href="/calendrier"
          className="rounded-2xl bg-surface-2 p-2.5 text-muted transition-colors hover:text-text"
          aria-label="Calendrier"
        >
          <CalendarDays className="h-5 w-5" />
        </Link>
      </header>

      {/* ------------------------------------------------------ Séance du jour */}
      {activeSession ? (
        <Card className="mb-4 border-accent-border bg-accent-soft">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <Badge tone="accent">Séance en cours</Badge>
              <p className="mt-2 truncate text-lg font-bold">{activeSession.name}</p>
            </div>
            <Link href={`/seance/${activeSession.id}`} className="shrink-0">
              <Button size="lg">
                Reprendre <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </Card>
      ) : null}

      <SectionTitle>Aujourd&apos;hui</SectionTitle>

      {template && !doneToday ? (
        <Card className="mb-5 overflow-hidden p-0">
          <div className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-accent">
                  {todayPlan?.program?.name ?? "Entraînement"}
                </p>
                <h2 className="mt-1 text-2xl font-bold">{template.name}</h2>
              </div>
              {sinceLast.days != null ? (
                <Badge tone="neutral">
                  {sinceLast.days === 0 ? "Séance faite aujourd'hui" : `J+${sinceLast.days}`}
                </Badge>
              ) : null}
            </div>

            <div className="tabular mt-4 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm text-muted">
              <span>{template.exercises.length} exercices</span>
              <span>{plannedSets} séries</span>
              <span className="flex items-center gap-1">
                <Timer className="h-3.5 w-3.5" />
                {formatDurationHuman(estimatedSeconds)}
              </span>
            </div>

            {muscles.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {muscles.map((m) => (
                  <span key={m} className="rounded-lg bg-surface-2 px-2 py-1 text-xs capitalize text-muted">
                    {m}
                  </span>
                ))}
              </div>
            ) : null}

            <ol className="mt-4 space-y-1.5">
              {template.exercises.slice(0, 4).map((e, i) => (
                <li key={e.id} className="flex items-center gap-3 text-sm">
                  <span className="tabular w-4 text-subtle">{i + 1}</span>
                  <span className="min-w-0 flex-1 truncate">{e.exercise.name}</span>
                  <span className="tabular shrink-0 text-xs text-subtle">
                    {e.sets} × {e.targetRepsMin}
                    {e.targetRepsMax && e.targetRepsMax !== e.targetRepsMin ? `-${e.targetRepsMax}` : ""}
                  </span>
                </li>
              ))}
              {template.exercises.length > 4 ? (
                <li className="pl-7 text-sm text-subtle">
                  + {template.exercises.length - 4} autres exercices
                </li>
              ) : null}
            </ol>
          </div>

          <div className="border-t border-border p-4">
            <StartSessionButton templateId={template.id} size="xl" fullWidth />
          </div>
        </Card>
      ) : doneToday ? (
        <Card className="mb-5 border-success/30 bg-success/5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-success/15 text-success">
              <Trophy className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold">Séance terminée</p>
              <p className="text-sm text-muted">Bien joué. Récupération jusqu&apos;à la prochaine.</p>
            </div>
          </div>
        </Card>
      ) : (
        <Card className="mb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-surface-2 text-muted">
              🛌
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{isRestDay ? "Jour de repos" : "Rien de prévu"}</p>
              <p className="text-sm text-muted">
                {nextPlan
                  ? `Prochaine séance : ${nextPlan.template?.name ?? "Entraînement"}`
                  : "Crée un programme pour planifier tes séances."}
              </p>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <StartSessionButton
              variant="secondary"
              fullWidth
              label="Séance libre"
              className="flex-1"
            />
            <Link href="/programmes" className="flex-1">
              <Button variant="secondary" fullWidth>
                Programmes
              </Button>
            </Link>
          </div>
        </Card>
      )}

      {nextPlan && template ? (
        <p className="mb-5 -mt-2 px-1 text-xs text-subtle">
          Prochaine séance : <span className="text-muted">{nextPlan.template?.name}</span> ·{" "}
          {new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", timeZone: APP_TIMEZONE }).format(nextPlan.date)}
        </p>
      ) : null}

      {/* --------------------------------------------------------- Alimentation */}
      <SectionTitle
        action={
          <Link href="/nutrition" className="text-xs font-medium text-accent">
            Détail
          </Link>
        }
      >
        Alimentation
      </SectionTitle>

      <Card className="mb-5">
        {goal ? (
          <>
            <div className="flex items-center gap-4">
              <MacroRing value={totals.kcal} max={goal.kcal} />
              <div className="min-w-0 flex-1">
                <p className="tabular text-2xl font-bold leading-none">
                  {Math.round(totals.kcal)}
                  <span className="text-base font-medium text-subtle"> / {Math.round(goal.kcal)} kcal</span>
                </p>
                <p className="mt-1.5 text-sm text-muted">
                  {goal.kcal - totals.kcal > 0
                    ? `${Math.round(goal.kcal - totals.kcal)} kcal restantes`
                    : `${Math.round(totals.kcal - goal.kcal)} kcal au-dessus`}
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              <MacroLine label="Protéines" value={totals.protein} max={goal.protein} color="var(--accent)" />
              <MacroLine label="Glucides" value={totals.carbs} max={goal.carbs} color="var(--info)" />
              <MacroLine label="Lipides" value={totals.fat} max={goal.fat} color="var(--warning)" />
            </div>

            <Link href="/nutrition" className="mt-4 block">
              <Button variant="secondary" fullWidth size="md">
                <Plus className="h-4 w-4" />
                Ajouter un aliment
              </Button>
            </Link>
          </>
        ) : (
          <div className="py-2 text-center">
            <p className="text-sm text-muted">Aucun objectif nutritionnel défini.</p>
            <Link href="/nutrition/objectifs" className="mt-3 inline-block">
              <Button size="sm">Définir mes objectifs</Button>
            </Link>
          </div>
        )}
      </Card>

      {/* ----------------------------------------------------------- Progression */}
      <SectionTitle
        action={
          <Link href="/progression" className="text-xs font-medium text-accent">
            Détail
          </Link>
        }
      >
        Progression
      </SectionTitle>

      <div className="mb-5 grid grid-cols-2 gap-3">
        <Card className="p-3.5">
          <div className="flex items-center gap-1.5 text-[0.7rem] font-medium uppercase tracking-wider text-subtle">
            <Scale className="h-3.5 w-3.5" /> Poids
          </div>
          <p className="tabular mt-1.5 text-xl font-semibold leading-none">
            {weight.latest ? formatWeight(weight.latest.weightKg, unit) : "—"}
          </p>
          <p className="mt-1.5 text-xs text-muted">
            {weight.change30 != null ? (
              <span className={weight.change30 < 0 ? "text-success" : "text-warning"}>
                {formatSigned(weight.change30)} kg / 30 j
              </span>
            ) : (
              "Encode ton poids"
            )}
          </p>
        </Card>

        <Card className="p-3.5">
          <div className="flex items-center gap-1.5 text-[0.7rem] font-medium uppercase tracking-wider text-subtle">
            <Flame className="h-3.5 w-3.5" /> Séances
          </div>
          <p className="tabular mt-1.5 text-xl font-semibold leading-none">
            {week.sessionsDone}
            <span className="text-base text-subtle"> / {week.sessionsPlanned || "—"}</span>
          </p>
          <p className="mt-1.5 text-xs text-muted">cette semaine</p>
        </Card>

        <Card className="p-3.5">
          <div className="flex items-center gap-1.5 text-[0.7rem] font-medium uppercase tracking-wider text-subtle">
            <TrendingUp className="h-3.5 w-3.5" /> Volume
          </div>
          <p className="tabular mt-1.5 text-xl font-semibold leading-none">{formatVolume(week.volume)}</p>
          <p className="mt-1.5 text-xs text-muted">{week.sets} séries</p>
        </Card>

        <Card className="p-3.5">
          <div className="flex items-center gap-1.5 text-[0.7rem] font-medium uppercase tracking-wider text-subtle">
            <Trophy className="h-3.5 w-3.5" /> Record récent
          </div>
          {recentPr ? (
            <>
              <p className="tabular mt-1.5 truncate text-base font-semibold leading-tight">
                {recentPr.exercise.name}
              </p>
              <p className="tabular mt-1 text-xs text-accent">
                {recentPr.type === "estimated_1rm"
                  ? `${formatWeight(recentPr.value, unit)} de 1RM estimé`
                  : `${formatWeight(recentPr.value, unit)}${recentPr.reps ? ` × ${recentPr.reps}` : ""}`}
              </p>
            </>
          ) : (
            <p className="mt-1.5 text-sm text-muted">Aucun record pour l&apos;instant</p>
          )}
        </Card>
      </div>

      {/* Encodage du poids en un geste */}
      <QuickWeightCard
        unit={unit}
        todayValue={
          weight.rows.find((r) => r.date.getTime() === startOfDay().getTime())?.weightKg ?? null
        }
        lastValue={weight.latest?.weightKg ?? null}
      />
    </div>
  );
}

function MacroLine({
  label,
  value,
  max,
  color,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between text-sm">
        <span className="text-muted">{label}</span>
        <span className="tabular font-medium">
          {Math.round(value)}
          <span className="text-subtle"> / {Math.round(max)} g</span>
        </span>
      </div>
      <ProgressBar value={value} max={max} color={color} height={6} />
    </div>
  );
}
