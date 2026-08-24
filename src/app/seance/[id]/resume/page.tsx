import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { SessionSummaryView } from "@/components/session/session-summary";

export const metadata: Metadata = { title: "Séance terminée" };
export const dynamic = "force-dynamic";

export default async function SessionSummaryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();

  const session = await prisma.workoutSession.findFirst({
    where: { id, userId: user.id },
    include: {
      exercises: {
        orderBy: { sortOrder: "asc" },
        include: {
          exercise: { select: { name: true, category: true } },
          sets: { orderBy: { setNumber: "asc" } },
        },
      },
      records: { include: { exercise: { select: { name: true } } } },
    },
  });
  if (!session) notFound();

  const previous = await prisma.workoutSession.findFirst({
    where: {
      userId: user.id,
      status: "completed",
      id: { not: session.id },
      startedAt: { lt: session.startedAt },
      ...(session.templateId ? { templateId: session.templateId } : { name: session.name }),
    },
    orderBy: { startedAt: "desc" },
    select: { totalVolumeKg: true, startedAt: true },
  });

  return (
    <SessionSummaryView
      unit={(user.settings?.weightUnit ?? "kg") as "kg" | "lb"}
      session={{
        id: session.id,
        name: session.name,
        startedAt: session.startedAt.toISOString(),
        durationSeconds: session.durationSeconds,
        totalVolumeKg: session.totalVolumeKg,
        totalSets: session.totalSets,
        totalReps: session.totalReps,
        feedback: session.feedback,
        muscles: [...new Set(session.exercises.map((e) => e.exercise.category))],
        exercises: session.exercises.map((e) => ({
          id: e.id,
          name: e.exercise.name,
          sets: e.sets.map((s) => ({
            type: s.type,
            weightKg: s.weightKg,
            reps: s.reps,
            rpe: s.rpe,
            durationSec: s.durationSec,
            distanceM: s.distanceM,
            isPr: s.isPr,
          })),
        })),
        records: session.records.map((r) => ({
          id: r.id,
          type: r.type,
          value: r.value,
          previousValue: r.previousValue,
          weightKg: r.weightKg,
          reps: r.reps,
          exerciseName: r.exercise.name,
        })),
      }}
      previousVolume={previous?.totalVolumeKg ?? null}
    />
  );
}
