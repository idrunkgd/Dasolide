import type { Metadata } from "next";
import Link from "next/link";
import {
  BarChart3,
  CalendarDays,
  ChevronRight,
  Dumbbell,
  History,
  LayoutList,
  PersonStanding,
  Play,
  Timer,
  Trophy,
} from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getTodayPlan } from "@/server/planning";
import { getActiveSession, getWeekSummary } from "@/server/queries/training";
import { Card, SectionTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { StartSessionButton } from "@/components/session/start-session-button";
import { formatDurationHuman, formatRelativeDay, formatVolume } from "@/lib/utils";

export const metadata: Metadata = { title: "Entraînement" };
export const dynamic = "force-dynamic";

export default async function TrainingHubPage() {
  const user = await requireUser();

  const [{ todayPlan, nextPlan }, activeSession, week, recentSessions, activeProgram, prCount] =
    await Promise.all([
      getTodayPlan(user.id),
      getActiveSession(user.id),
      getWeekSummary(user.id),
      prisma.workoutSession.findMany({
        where: { userId: user.id, status: "completed" },
        orderBy: { startedAt: "desc" },
        take: 3,
        select: {
          id: true,
          name: true,
          startedAt: true,
          durationSeconds: true,
          totalVolumeKg: true,
          totalSets: true,
          prCount: true,
        },
      }),
      prisma.workoutProgram.findFirst({
        where: { userId: user.id, isActive: true },
        include: { templates: { orderBy: { sortOrder: "asc" }, include: { _count: { select: { exercises: true } } } } },
      }),
      prisma.personalRecord.count({ where: { userId: user.id } }),
    ]);

  const template = todayPlan?.template ?? null;

  return (
    <div className="px-4 pt-6">
      <h1 className="mb-5 text-2xl font-bold">Entraînement</h1>

      {/* Séance en cours ou du jour */}
      {activeSession ? (
        <Card className="mb-5 border-accent-border bg-accent-soft">
          <Badge tone="accent">Séance en cours</Badge>
          <p className="mt-2 text-lg font-bold">{activeSession.name}</p>
          <Link href={`/seance/${activeSession.id}`} className="mt-3 block">
            <Button size="lg" fullWidth>
              Reprendre la séance
            </Button>
          </Link>
        </Card>
      ) : (
        <Card className="mb-5">
          <p className="text-xs font-medium uppercase tracking-wider text-subtle">
            {template ? "Séance du jour" : "Aucune séance prévue aujourd'hui"}
          </p>
          <p className="mt-1 text-xl font-bold">{template?.name ?? "Jour de repos"}</p>
          {template ? (
            <p className="tabular mt-1 text-sm text-muted">
              {template.exercises.length} exercices ·{" "}
              {template.exercises.reduce((a, e) => a + e.sets, 0)} séries
            </p>
          ) : nextPlan ? (
            <p className="mt-1 text-sm text-muted">
              Prochaine : {nextPlan.template?.name} · {formatRelativeDay(nextPlan.date)}
            </p>
          ) : null}
          <div className="mt-4 flex gap-2">
            {template ? (
              <StartSessionButton templateId={template.id} size="lg" className="flex-1" />
            ) : (
              <StartSessionButton size="lg" className="flex-1" label="Démarrer une séance libre" />
            )}
          </div>
        </Card>
      )}

      {/* Semaine */}
      <div className="mb-5 grid grid-cols-3 gap-3">
        <MiniStat label="Séances" value={`${week.sessionsDone}/${week.sessionsPlanned || "—"}`} />
        <MiniStat label="Volume" value={formatVolume(week.volume)} />
        <MiniStat label="Temps" value={formatDurationHuman(week.minutes * 60)} />
      </div>

      {/* Navigation */}
      <SectionTitle>Explorer</SectionTitle>
      <div className="mb-5 grid grid-cols-2 gap-3">
        <NavCard href="/programmes" icon={<LayoutList className="h-5 w-5" />} title="Programmes" sub={activeProgram?.name ?? "Aucun actif"} />
        <NavCard href="/exercices" icon={<Dumbbell className="h-5 w-5" />} title="Exercices" sub="Bibliothèque" />
        <NavCard href="/calendrier" icon={<CalendarDays className="h-5 w-5" />} title="Calendrier" sub="Planning" />
        <NavCard href="/historique" icon={<History className="h-5 w-5" />} title="Historique" sub="Toutes les séances" />
        <NavCard href="/statistiques" icon={<BarChart3 className="h-5 w-5" />} title="Statistiques" sub="Analyses" />
        <NavCard href="/records" icon={<Trophy className="h-5 w-5" />} title="Records" sub={`${prCount} records`} />
        <NavCard
          href="/muscles"
          icon={<PersonStanding className="h-5 w-5" />}
          title="Carte des muscles"
          sub="Répartition"
          className="col-span-2"
        />
      </div>

      {/* Programme actif */}
      {activeProgram ? (
        <>
          <SectionTitle
            action={
              <Link href={`/programmes/${activeProgram.id}`} className="text-xs font-medium text-accent">
                Modifier
              </Link>
            }
          >
            Programme actif
          </SectionTitle>
          <Card className="mb-5 p-0">
            <div className="border-b border-border px-4 py-3">
              <p className="font-semibold">{activeProgram.name}</p>
              <p className="text-sm text-muted">{activeProgram.templates.length} journées</p>
            </div>
            <ul>
              {activeProgram.templates.map((t) => (
                <li key={t.id} className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-0">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[0.95rem] font-medium">{t.name}</span>
                    <span className="tabular block text-xs text-subtle">
                      {t._count.exercises} exercices
                    </span>
                  </span>
                  <StartSessionButton templateId={t.id} size="sm" variant="secondary" label="Démarrer" icon={false} />
                </li>
              ))}
            </ul>
          </Card>
        </>
      ) : (
        <Card className="mb-5">
          <p className="font-semibold">Aucun programme actif</p>
          <p className="mt-1 text-sm text-muted">
            Choisis un modèle ou compose le tien pour voir apparaître ta séance du jour.
          </p>
          <Link href="/programmes" className="mt-3 block">
            <Button fullWidth variant="secondary">
              Choisir un programme
            </Button>
          </Link>
        </Card>
      )}

      {/* Dernières séances */}
      <SectionTitle
        action={
          <Link href="/historique" className="text-xs font-medium text-accent">
            Tout voir
          </Link>
        }
      >
        Dernières séances
      </SectionTitle>
      {recentSessions.length === 0 ? (
        <Card className="mb-5 text-center">
          <p className="py-4 text-sm text-muted">Ta première séance apparaîtra ici.</p>
        </Card>
      ) : (
        <div className="mb-5 space-y-2">
          {recentSessions.map((s) => (
            <Link key={s.id} href={`/historique/${s.id}`} className="block">
              <Card className="flex items-center gap-3 p-3.5 transition-colors hover:border-border-strong">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-surface-2 text-muted">
                  <Play className="h-4 w-4" fill="currentColor" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{s.name}</p>
                  <p className="tabular truncate text-xs text-subtle">
                    {formatRelativeDay(s.startedAt)} · {formatVolume(s.totalVolumeKg)} · {s.totalSets} séries
                  </p>
                </div>
                {s.prCount > 0 ? (
                  <span className="flex shrink-0 items-center gap-1 text-xs text-accent">
                    <Trophy className="h-3.5 w-3.5" /> {s.prCount}
                  </span>
                ) : null}
                <span className="tabular flex shrink-0 items-center gap-1 text-xs text-subtle">
                  <Timer className="h-3.5 w-3.5" />
                  {Math.round(s.durationSeconds / 60)} min
                </span>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-3 text-center">
      <p className="text-[0.65rem] uppercase tracking-wider text-subtle">{label}</p>
      <p className="tabular mt-1 text-base font-semibold">{value}</p>
    </div>
  );
}

function NavCard({
  href,
  icon,
  title,
  sub,
  className,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  sub: string;
  className?: string;
}) {
  return (
    <Link href={href} className={className}>
      <Card className="flex h-full items-center gap-3 p-3.5 transition-colors hover:border-border-strong">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-surface-2 text-accent">
          {icon}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[0.95rem] font-medium">{title}</span>
          <span className="block truncate text-xs text-subtle">{sub}</span>
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-subtle" />
      </Card>
    </Link>
  );
}
