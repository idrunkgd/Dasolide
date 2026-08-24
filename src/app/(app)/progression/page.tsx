import Link from "next/link";
import { Camera, ChevronRight, Ruler, Scale, Target } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getMeasurements, getPhotos, getWeightData } from "@/server/queries/body";
import { PageHeader } from "@/components/layout/page-header";
import { Card, SectionTitle } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { WeightSummaryCard } from "@/components/progression/weight-summary-card";
import {
  goalProgress,
  resolveCurrentValue,
  type GoalView,
} from "@/components/progression/goal-utils";
import { MEASUREMENT_FIELDS } from "@/lib/constants";
import { formatDate, formatLength, formatNumber1, formatSigned } from "@/lib/utils";

export const dynamic = "force-dynamic";

const LINKS = [
  { href: "/progression/poids", label: "Poids", hint: "Courbe et moyenne glissante", icon: Scale },
  { href: "/progression/mensurations", label: "Mensurations", hint: "Tour de taille, bras, cuisses…", icon: Ruler },
  { href: "/progression/photos", label: "Photos", hint: "Galerie et comparateur", icon: Camera },
  { href: "/progression/objectifs", label: "Objectifs", hint: "Ce que tu vises, et où tu en es", icon: Target },
];

/** Hub Progression : la synthèse, puis l'accès aux quatre suivis détaillés. */
export default async function ProgressionPage() {
  const user = await requireUser();
  const weightUnit = (user.settings?.weightUnit ?? "kg") as "kg" | "lb";
  const lengthUnit = (user.settings?.lengthUnit ?? "cm") as "cm" | "in";

  const [weight, measurements, photos, goals] = await Promise.all([
    getWeightData(user.id, 400),
    getMeasurements(user.id, 3650),
    getPhotos(user.id),
    prisma.goal.findMany({
      where: { userId: user.id, status: "active" },
      include: { exercise: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 3,
    }),
  ]);

  // ------------------------------------------------------- Mensuration phare
  // Le tour de taille en premier : c'est la mesure la plus parlante au
  // quotidien. À défaut, la première mesure renseignée.
  const desc = [...measurements].reverse();
  const hasData = (key: string) =>
    desc.some((m) => (m as unknown as Record<string, unknown>)[key] != null);
  const preferred = ["waistCm", "chestCm", "armRightCm"].find(hasData);
  const featuredKey = preferred ?? MEASUREMENT_FIELDS.find((f) => hasData(f.key))?.key ?? null;
  const featured = featuredKey
    ? (MEASUREMENT_FIELDS.find((f) => f.key === featuredKey) ?? null)
    : null;
  const featuredValues = featuredKey
    ? desc
        .map((m) => (m as unknown as Record<string, unknown>)[featuredKey])
        .filter((v): v is number => typeof v === "number")
    : [];
  const featuredLast = featuredValues[0] ?? null;
  const featuredDelta =
    featuredValues.length >= 2 && featuredValues[0] != null && featuredValues[1] != null
      ? featuredValues[0] - featuredValues[1]
      : null;

  const lastPhoto = photos[0] ?? null;

  // ----------------------------------------------- Objectifs (valeur réelle)
  const goalExerciseIds = goals.map((g) => g.exerciseId).filter((id): id is string => Boolean(id));
  const records = goalExerciseIds.length
    ? await prisma.personalRecord.findMany({
        where: { userId: user.id, type: "max_weight", exerciseId: { in: goalExerciseIds } },
        orderBy: { value: "desc" },
      })
    : [];
  const bestByExercise = new Map<string, number>();
  for (const r of records) if (!bestByExercise.has(r.exerciseId)) bestByExercise.set(r.exerciseId, r.value);

  const goalViews: GoalView[] = goals.map((g) => ({
    id: g.id,
    type: g.type,
    title: g.title,
    unit: g.unit,
    startValue: g.startValue,
    targetValue: g.targetValue,
    targetDate: null,
    status: g.status,
    measureKey: g.measureKey,
    exerciseId: g.exerciseId,
    exerciseName: g.exercise?.name ?? null,
    currentValue: resolveCurrentValue(g, {
      lastWeightKg: weight.latest?.weightKg ?? null,
      measurements: desc as unknown as Record<string, unknown>[],
      bestByExercise,
    }),
  }));

  const hasNothing = !weight.latest && measurements.length === 0 && photos.length === 0 && goals.length === 0;

  return (
    <>
      <PageHeader title="Progression" subtitle="Poids, mensurations, photos et objectifs" />

      <div className="px-4 pt-4">
        {hasNothing ? (
          <Card className="mb-5">
            <p className="text-[0.95rem] font-medium">Rien à afficher pour le moment</p>
            <p className="mt-1 text-sm text-muted">
              Commence par encoder ton poids : c&apos;est la donnée la plus utile et la plus rapide à saisir.
              Les mensurations et les photos viendront compléter le tableau.
            </p>
            <Link href="/progression/poids" className="mt-4 block">
              <Button fullWidth size="lg">Encoder mon poids</Button>
            </Link>
          </Card>
        ) : null}

        {/* ------------------------------------------------------------- Poids */}
        <SectionTitle
          action={
            <Link href="/progression/poids" className="text-xs font-medium text-accent">
              Détail
            </Link>
          }
        >
          Poids
        </SectionTitle>
        <WeightSummaryCard
          unit={weightUnit}
          latestKg={weight.latest?.weightKg ?? null}
          latestDate={weight.latest?.date ?? null}
          trendPerWeek={weight.trendPerWeek}
          change7={weight.change7}
          change30={weight.change30}
        />

        {/* ----------------------------------------------- Mensuration & photo */}
        <SectionTitle>Corps</SectionTitle>
        <div className="mb-5 grid grid-cols-2 gap-3">
          <Link href="/progression/mensurations" className="card p-3.5">
            <div className="flex items-center gap-1.5 text-[0.7rem] font-medium uppercase tracking-wider text-subtle">
              <Ruler className="h-3.5 w-3.5" />
              <span className="truncate">{featured?.label ?? "Mensurations"}</span>
            </div>
            <p className="tabular mt-1.5 text-xl font-semibold leading-none">
              {featuredLast != null ? formatLength(featuredLast, lengthUnit) : "—"}
            </p>
            <p className="mt-1.5 text-xs text-muted">
              {featuredDelta == null
                ? "Encode tes mensurations"
                : Math.abs(featuredDelta) < 0.05
                  ? "Stable depuis le relevé précédent"
                  : `${formatSigned(lengthUnit === "in" ? featuredDelta / 2.54 : featuredDelta)} ${lengthUnit} depuis le relevé précédent`}
            </p>
          </Link>

          <Link href="/progression/photos" className="card overflow-hidden p-0">
            {lastPhoto ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={lastPhoto.url}
                  alt="Dernière photo de progression"
                  className="h-28 w-full object-cover"
                />
                <div className="p-3.5">
                  <div className="flex items-center gap-1.5 text-[0.7rem] font-medium uppercase tracking-wider text-subtle">
                    <Camera className="h-3.5 w-3.5" /> Dernière photo
                  </div>
                  <p className="mt-1 text-sm">{formatDate(lastPhoto.date)}</p>
                </div>
              </>
            ) : (
              <div className="p-3.5">
                <div className="flex items-center gap-1.5 text-[0.7rem] font-medium uppercase tracking-wider text-subtle">
                  <Camera className="h-3.5 w-3.5" /> Photos
                </div>
                <p className="mt-1.5 text-xl font-semibold leading-none">—</p>
                <p className="mt-1.5 text-xs text-muted">Aucune photo</p>
              </div>
            )}
          </Link>
        </div>

        {/* --------------------------------------------------------- Objectifs */}
        <SectionTitle
          action={
            <Link href="/progression/objectifs" className="text-xs font-medium text-accent">
              Tous
            </Link>
          }
        >
          Objectifs en cours
        </SectionTitle>
        <Card className="mb-5">
          {goalViews.length === 0 ? (
            <p className="text-sm text-muted">
              Aucun objectif actif. Un cap clair rend les semaines difficiles beaucoup plus faciles à tenir.
            </p>
          ) : (
            <ul className="space-y-4">
              {goalViews.map((goal) => {
                const p = goalProgress(goal);
                return (
                  <li key={goal.id}>
                    <div className="mb-1.5 flex items-baseline justify-between gap-3">
                      <span className="truncate text-sm font-medium">{goal.title}</span>
                      <span className="tabular shrink-0 text-xs text-muted">{p.percent} %</span>
                    </div>
                    <ProgressBar value={p.ratio} max={1} height={6} />
                    <p className="tabular mt-1 text-xs text-subtle">
                      {goal.currentValue != null
                        ? `${formatNumber1(goal.currentValue)} / ${formatNumber1(goal.targetValue)} ${goal.unit}`
                        : `Cible : ${formatNumber1(goal.targetValue)} ${goal.unit}`}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        {/* ------------------------------------------------------------ Liens */}
        <SectionTitle>Suivis détaillés</SectionTitle>
        <nav className="mb-6 space-y-2">
          {LINKS.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className="card flex min-h-[4rem] items-center gap-3 p-3.5 transition-colors hover:border-border-strong"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-surface-2 text-muted">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[0.95rem] font-medium">{link.label}</span>
                  <span className="block truncate text-xs text-subtle">{link.hint}</span>
                </span>
                <ChevronRight className="h-5 w-5 shrink-0 text-subtle" />
              </Link>
            );
          })}
        </nav>
      </div>
    </>
  );
}
