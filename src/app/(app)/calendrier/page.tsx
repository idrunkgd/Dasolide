import { Suspense } from "react";
import Link from "next/link";
import { ListChecks } from "lucide-react";
import { requireUserId } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/layout/page-header";
import { Skeleton } from "@/components/ui/misc";
import { CalendarView } from "@/components/calendar/calendar-view";
import type {
  CalendarDay,
  CalendarSummary,
  TemplateOption,
} from "@/components/calendar/types";
import { dayState } from "@/components/calendar/types";
import {
  APP_TIMEZONE,
  addDays,
  dateKey,
  daysBetween,
  formatDateShort,
  parseDateKey,
  startOfDay,
  startOfWeek,
} from "@/lib/utils";

export const dynamic = "force-dynamic";

const MONTH_FMT = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric", timeZone: APP_TIMEZONE });

export default async function CalendrierPage({
  searchParams,
}: {
  searchParams: Promise<{ v?: string; d?: string }>;
}) {
  const { v, d } = await searchParams;
  const view = v === "semaine" ? "semaine" : "mois";
  const anchorKey = /^\d{4}-\d{2}-\d{2}$/.test(d ?? "") ? (d as string) : dateKey(new Date());

  return (
    <>
      <PageHeader
        title="Calendrier"
        subtitle="Planning des séances"
        action={
          <Link
            href="/programmes"
            aria-label="Programmes"
            className="rounded-xl p-2 text-muted transition-colors hover:bg-surface-2 hover:text-text"
          >
            <ListChecks className="h-5 w-5" />
          </Link>
        }
      />
      <Suspense key={`${view}-${anchorKey}`} fallback={<CalendarSkeleton />}>
        <CalendarData view={view} anchorKey={anchorKey} />
      </Suspense>
    </>
  );
}

function CalendarSkeleton() {
  return (
    <div className="px-4 pt-4">
      <Skeleton className="mb-3 h-11 w-full" />
      <Skeleton className="mb-3 h-11 w-full" />
      <Skeleton className="h-64 w-full" />
      <Skeleton className="mt-4 h-28 w-full" />
    </div>
  );
}

/** Période affichée : la grille du mois (semaines complètes) ou une semaine. */
function computeRange(view: "mois" | "semaine", anchor: Date) {
  if (view === "semaine") {
    const gridStart = startOfWeek(anchor);
    const gridEnd = addDays(gridStart, 7);
    return {
      gridStart,
      gridEnd,
      scopeStart: gridStart,
      scopeEnd: gridEnd,
      prevKey: dateKey(addDays(gridStart, -7)),
      nextKey: dateKey(addDays(gridStart, 7)),
      title: `Semaine du ${formatDateShort(gridStart)} au ${formatDateShort(addDays(gridStart, 6))}`,
    };
  }

  const monthStart = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const monthEnd = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 1);
  const gridStart = startOfWeek(monthStart);
  const gridEnd = addDays(startOfWeek(addDays(monthEnd, -1)), 7);

  return {
    gridStart,
    gridEnd,
    scopeStart: monthStart,
    scopeEnd: monthEnd,
    prevKey: dateKey(new Date(anchor.getFullYear(), anchor.getMonth() - 1, 1)),
    nextKey: dateKey(new Date(anchor.getFullYear(), anchor.getMonth() + 1, 1)),
    title: MONTH_FMT.format(monthStart),
  };
}

async function CalendarData({
  view,
  anchorKey,
}: {
  view: "mois" | "semaine";
  anchorKey: string;
}) {
  const userId = await requireUserId();
  const anchor = parseDateKey(anchorKey);
  const range = computeRange(view, anchor);

  const [planned, sessions, programs] = await Promise.all([
    prisma.plannedWorkout.findMany({
      where: { userId, date: { gte: range.gridStart, lt: range.gridEnd } },
      orderBy: { date: "asc" },
      include: {
        program: { select: { name: true, color: true } },
        template: { select: { id: true, name: true, exercises: { select: { sets: true } } } },
        session: {
          select: {
            id: true,
            name: true,
            totalVolumeKg: true,
            totalSets: true,
            durationSeconds: true,
          },
        },
      },
    }),
    prisma.workoutSession.findMany({
      where: {
        userId,
        status: "completed",
        startedAt: { gte: range.gridStart, lt: range.gridEnd },
      },
      orderBy: { startedAt: "asc" },
      select: {
        id: true,
        name: true,
        startedAt: true,
        totalVolumeKg: true,
        totalSets: true,
        durationSeconds: true,
      },
    }),
    prisma.workoutProgram.findMany({
      where: { userId, archivedAt: null },
      orderBy: [{ isActive: "desc" }, { updatedAt: "desc" }],
      select: {
        name: true,
        templates: { orderBy: { sortOrder: "asc" }, select: { id: true, name: true } },
      },
    }),
  ]);

  const plannedByDay = new Map(planned.map((p) => [dateKey(p.date), p]));
  const sessionByDay = new Map<string, (typeof sessions)[number]>();
  for (const s of sessions) {
    const key = dateKey(s.startedAt);
    if (!sessionByDay.has(key)) sessionByDay.set(key, s);
  }

  const today = startOfDay();
  const todayKey = dateKey(today);
  const total = daysBetween(range.gridStart, range.gridEnd);

  const days: CalendarDay[] = Array.from({ length: total }, (_, i) => {
    const date = addDays(range.gridStart, i);
    const key = dateKey(date);
    const p = plannedByDay.get(key);
    const s = p?.session ?? sessionByDay.get(key) ?? null;

    return {
      key,
      dayOfMonth: date.getDate(),
      inScope: date >= range.scopeStart && date < range.scopeEnd,
      isToday: key === todayKey,
      isPast: date < today,
      planned: p
        ? {
            id: p.id,
            status: p.status,
            templateId: p.templateId,
            templateName: p.template?.name ?? null,
            programName: p.program?.name ?? null,
            color: p.program?.color ?? "#a3e635",
            exerciseCount: p.template?.exercises.length ?? 0,
            setCount: p.template?.exercises.reduce((a, e) => a + e.sets, 0) ?? 0,
            sessionId: p.sessionId,
          }
        : null,
      session: s
        ? {
            id: s.id,
            name: s.name,
            volumeKg: s.totalVolumeKg,
            sets: s.totalSets,
            durationSeconds: s.durationSeconds,
          }
        : null,
    };
  });

  const scoped = days.filter((day) => day.inScope);
  const summary: CalendarSummary = {
    done: scoped.filter((day) => dayState(day) === "completed").length,
    planned: scoped.filter((day) => day.planned?.templateId || day.session).length,
    volumeKg: scoped.reduce((a, day) => a + (day.session?.volumeKg ?? 0), 0),
    sets: scoped.reduce((a, day) => a + (day.session?.sets ?? 0), 0),
    minutes: Math.round(
      scoped.reduce((a, day) => a + (day.session?.durationSeconds ?? 0), 0) / 60
    ),
  };

  const templates: TemplateOption[] = programs.flatMap((program) =>
    program.templates.map((t) => ({ id: t.id, name: t.name, programName: program.name }))
  );

  return (
    <CalendarView
      view={view}
      title={range.title}
      prevKey={range.prevKey}
      nextKey={range.nextKey}
      todayKey={todayKey}
      days={days}
      templates={templates}
      summary={summary}
      summaryLabel={view === "mois" ? range.title : "Cette semaine"}
    />
  );
}
