import Link from "next/link";
import { CalendarDays, Dumbbell, ListChecks, Plus, Timer } from "lucide-react";
import { requireUserId } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/layout/page-header";
import { Card, SectionTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge, EmptyState } from "@/components/ui/misc";
import { ProgramActions } from "@/components/program/program-actions";
import { StarterPicker } from "@/components/program/starter-picker";
import { STARTER_PROGRAMS } from "@/server/starter-program";
import { DAY_LABELS, PROGRAM_TYPES } from "@/lib/constants";
import { formatDurationHuman } from "@/lib/utils";

export const dynamic = "force-dynamic";

type ProgramRow = Awaited<ReturnType<typeof loadPrograms>>[number];

async function loadPrograms(userId: string) {
  return prisma.workoutProgram.findMany({
    where: { userId },
    orderBy: [{ isActive: "desc" }, { updatedAt: "desc" }],
    include: {
      templates: {
        orderBy: { sortOrder: "asc" },
        include: {
          exercises: {
            orderBy: { sortOrder: "asc" },
            select: { sets: true, restSeconds: true, supersetGroup: true },
          },
        },
      },
    },
  });
}

/** Totaux affichés sur la carte : ce que le programme représente en une semaine. */
function summarize(program: ProgramRow) {
  const exercises = program.templates.reduce((a, t) => a + t.exercises.length, 0);
  const sets = program.templates.reduce(
    (a, t) => a + t.exercises.reduce((b, e) => b + e.sets, 0),
    0
  );
  const seconds = program.templates.reduce(
    (a, t) =>
      a +
      t.exercises.reduce(
        (b, e) => b + e.sets * ((e.supersetGroup ? e.restSeconds / 2 : e.restSeconds) + 45),
        0
      ),
    0
  );
  return { exercises, sets, seconds };
}

export default async function ProgramsPage() {
  const userId = await requireUserId();
  const programs = await loadPrograms(userId);

  const active = programs.find((p) => p.isActive && !p.archivedAt) ?? null;
  const others = programs.filter((p) => !p.archivedAt && p.id !== active?.id);
  const archived = programs.filter((p) => p.archivedAt);

  const starters = STARTER_PROGRAMS.map((s) => ({
    key: s.key,
    name: s.name,
    description: s.description,
    sessionsPerWeek: s.sessionsPerWeek,
    days: s.templates.map((t) => t.name),
  }));

  return (
    <>
      <PageHeader
        title="Programmes"
        subtitle={
          programs.length > 0
            ? `${programs.length} programme${programs.length > 1 ? "s" : ""}`
            : undefined
        }
        action={
          <Link
            href="/calendrier"
            aria-label="Calendrier"
            className="rounded-xl p-2 text-muted transition-colors hover:bg-surface-2 hover:text-text"
          >
            <CalendarDays className="h-5 w-5" />
          </Link>
        }
      />

      <div className="px-4 pb-8 pt-4">
        {programs.length === 0 ? (
          <Card className="mb-6">
            <EmptyState
              icon={<Dumbbell className="h-6 w-6" />}
              title="Aucun programme pour l'instant"
              description="Crée ton programme sur mesure, ou pars d'un modèle éprouvé et ajuste-le ensuite."
              action={
                <Link href="/programmes/nouveau">
                  <Button size="lg">
                    <Plus className="h-4 w-4" />
                    Nouveau programme
                  </Button>
                </Link>
              }
            />
          </Card>
        ) : (
          <>
            <Link href="/programmes/nouveau" className="mb-5 block">
              <Button size="lg" fullWidth>
                <Plus className="h-4 w-4" />
                Nouveau programme
              </Button>
            </Link>

            {active ? (
              <>
                <SectionTitle>Programme actif</SectionTitle>
                <ProgramCard program={active} highlighted />
              </>
            ) : null}

            {others.length > 0 ? (
              <>
                <SectionTitle className="mt-6">
                  {active ? "Autres programmes" : "Mes programmes"}
                </SectionTitle>
                {others.map((program) => (
                  <ProgramCard key={program.id} program={program} />
                ))}
              </>
            ) : null}

            {archived.length > 0 ? (
              <details className="mt-6 rounded-2xl border border-border bg-surface/60">
                <summary className="cursor-pointer list-none px-4 py-3.5 text-sm font-medium text-muted">
                  Programmes archivés ({archived.length})
                </summary>
                <div className="px-3 pb-3">
                  {archived.map((program) => (
                    <ProgramCard key={program.id} program={program} />
                  ))}
                </div>
              </details>
            ) : null}
          </>
        )}

        <SectionTitle className="mt-8">Partir d&apos;un modèle</SectionTitle>
        <StarterPicker options={starters} />
      </div>
    </>
  );
}

function ProgramCard({
  program,
  highlighted = false,
}: {
  program: ProgramRow;
  highlighted?: boolean;
}) {
  const { exercises, sets, seconds } = summarize(program);
  const perSession = program.templates.length > 0 ? seconds / program.templates.length : 0;

  return (
    <Card className={highlighted ? "mb-4 border-accent-border" : "mb-3"}>
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="mt-1 h-9 w-1.5 shrink-0 rounded-full"
          style={{ backgroundColor: program.color }}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/programmes/${program.id}`} className="min-w-0">
              <h3 className="truncate text-base font-semibold">{program.name}</h3>
            </Link>
            {program.isActive && !program.archivedAt ? <Badge tone="accent">Actif</Badge> : null}
            {program.archivedAt ? <Badge tone="neutral">Archivé</Badge> : null}
          </div>
          <p className="mt-0.5 text-xs text-subtle">
            {PROGRAM_TYPES[program.type as keyof typeof PROGRAM_TYPES] ?? "Personnalisé"}
          </p>
          {program.description ? (
            <p className="mt-1.5 line-clamp-2 text-sm text-muted">{program.description}</p>
          ) : null}
        </div>
      </div>

      <div className="tabular mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
        <span className="flex items-center gap-1">
          <CalendarDays className="h-3.5 w-3.5" />
          {program.templates.length} journée{program.templates.length > 1 ? "s" : ""}
        </span>
        <span className="flex items-center gap-1">
          <Dumbbell className="h-3.5 w-3.5" />
          {exercises} exercice{exercises > 1 ? "s" : ""}
        </span>
        <span className="flex items-center gap-1">
          <ListChecks className="h-3.5 w-3.5" />
          {sets} série{sets > 1 ? "s" : ""} / semaine
        </span>
        <span className="flex items-center gap-1">
          <Timer className="h-3.5 w-3.5" />≈ {formatDurationHuman(perSession)} / séance
        </span>
      </div>

      {program.templates.length > 0 ? (
        <ul className="mt-3 space-y-1">
          {program.templates.map((t) => (
            <li key={t.id} className="flex items-center gap-2 text-sm">
              <span className="min-w-0 flex-1 truncate">{t.name}</span>
              <span className="tabular shrink-0 text-xs text-subtle">
                {t.dayOfWeek ? `${DAY_LABELS[t.dayOfWeek - 1]} · ` : ""}
                {t.exercises.length} ex.
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-subtle">Aucune journée : ouvre l&apos;éditeur pour en ajouter.</p>
      )}

      <ProgramActions
        id={program.id}
        isActive={program.isActive && !program.archivedAt}
        isArchived={Boolean(program.archivedAt)}
      />
    </Card>
  );
}
