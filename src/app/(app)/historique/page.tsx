import type { Metadata } from "next";
import Link from "next/link";
import { History, Timer, Trophy } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { APP_TIMEZONE, formatDate, formatDuration, formatVolume, groupBy } from "@/lib/utils";

export const metadata: Metadata = { title: "Historique" };
export const dynamic = "force-dynamic";

const PAGE_SIZE = 30;

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page } = await searchParams;
  const current = Math.max(1, Number(page ?? 1) || 1);
  const user = await requireUser();

  const [sessions, total] = await Promise.all([
    prisma.workoutSession.findMany({
      where: { userId: user.id, status: "completed" },
      orderBy: { startedAt: "desc" },
      skip: (current - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        name: true,
        startedAt: true,
        durationSeconds: true,
        totalVolumeKg: true,
        totalSets: true,
        totalReps: true,
        prCount: true,
        exercises: { select: { exercise: { select: { name: true } } }, take: 4 },
        _count: { select: { exercises: true } },
      },
    }),
    prisma.workoutSession.count({ where: { userId: user.id, status: "completed" } }),
  ]);

  const byMonth = groupBy(sessions, (s) =>
    new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric", timeZone: APP_TIMEZONE }).format(s.startedAt)
  );

  const pages = Math.ceil(total / PAGE_SIZE);

  return (
    <div>
      <PageHeader
        title="Historique"
        subtitle={`${total} séance${total > 1 ? "s" : ""} enregistrée${total > 1 ? "s" : ""}`}
        back="/entrainement"
      />

      <div className="px-4 pt-4">
        {sessions.length === 0 ? (
          <EmptyState
            icon={<History className="h-6 w-6" />}
            title="Aucune séance enregistrée"
            description="Tes séances terminées apparaîtront ici, avec le détail de chaque série."
            action={
              <Link href="/entrainement">
                <Button>Aller à l&apos;entraînement</Button>
              </Link>
            }
          />
        ) : (
          <>
            {[...byMonth.entries()].map(([month, list]) => (
              <section key={month} className="mb-6">
                <h2 className="mb-2.5 px-1 text-xs font-semibold uppercase tracking-[0.12em] text-subtle">
                  {month}
                </h2>
                <div className="space-y-2">
                  {list.map((s) => (
                    <Link key={s.id} href={`/historique/${s.id}`} className="block">
                      <Card className="p-4 transition-colors hover:border-border-strong">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate font-semibold">{s.name}</p>
                            <p className="text-xs text-subtle">{formatDate(s.startedAt)}</p>
                          </div>
                          {s.prCount > 0 ? (
                            <span className="flex shrink-0 items-center gap-1 rounded-lg bg-accent-soft px-2 py-1 text-xs font-medium text-accent">
                              <Trophy className="h-3 w-3" /> {s.prCount}
                            </span>
                          ) : null}
                        </div>

                        <div className="tabular mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
                          <span className="flex items-center gap-1">
                            <Timer className="h-3.5 w-3.5" />
                            {formatDuration(s.durationSeconds)}
                          </span>
                          <span>{formatVolume(s.totalVolumeKg)}</span>
                          <span>{s.totalSets} séries</span>
                          <span>{s.totalReps} reps</span>
                        </div>

                        <p className="mt-2 truncate text-xs text-subtle">
                          {s.exercises.map((e) => e.exercise.name).join(" · ")}
                          {s._count.exercises > 4 ? ` +${s._count.exercises - 4}` : ""}
                        </p>
                      </Card>
                    </Link>
                  ))}
                </div>
              </section>
            ))}

            {pages > 1 ? (
              <div className="mb-6 flex items-center justify-between gap-3">
                {current > 1 ? (
                  <Link href={`/historique?page=${current - 1}`} className="flex-1">
                    <Button variant="secondary" fullWidth>
                      Précédent
                    </Button>
                  </Link>
                ) : (
                  <span className="flex-1" />
                )}
                <span className="tabular text-sm text-subtle">
                  {current} / {pages}
                </span>
                {current < pages ? (
                  <Link href={`/historique?page=${current + 1}`} className="flex-1">
                    <Button variant="secondary" fullWidth>
                      Suivant
                    </Button>
                  </Link>
                ) : (
                  <span className="flex-1" />
                )}
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
