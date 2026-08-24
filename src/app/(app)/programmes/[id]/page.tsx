import { notFound } from "next/navigation";
import { requireUserId } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/layout/page-header";
import { ProgramEditor } from "@/components/program/program-editor";
import { makeKey, type EditorProgram } from "@/components/program/types";
import { PROGRAM_TYPES } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function ProgramEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const userId = await requireUserId();

  const program = await prisma.workoutProgram.findFirst({
    where: { id, userId },
    include: {
      templates: {
        orderBy: { sortOrder: "asc" },
        include: {
          exercises: {
            orderBy: { sortOrder: "asc" },
            include: {
              exercise: {
                select: { id: true, name: true, equipment: true, primaryMuscle: { select: { name: true } } },
              },
            },
          },
        },
      },
    },
  });

  if (!program) notFound();

  const initial: EditorProgram = {
    id: program.id,
    name: program.name,
    description: program.description ?? "",
    type: program.type,
    color: program.color,
    templates: program.templates.map((t) => ({
      key: makeKey("day"),
      id: t.id,
      name: t.name,
      notes: t.notes ?? "",
      dayOfWeek: t.dayOfWeek,
      exercises: t.exercises.map((e) => ({
        key: makeKey("ex"),
        exerciseId: e.exerciseId,
        name: e.exercise.name,
        primaryMuscle: e.exercise.primaryMuscle.name,
        equipment: e.exercise.equipment,
        sets: e.sets,
        targetRepsMin: e.targetRepsMin,
        targetRepsMax: e.targetRepsMax,
        targetWeight: e.targetWeight,
        targetRpe: e.targetRpe,
        targetRir: e.targetRir,
        restSeconds: e.restSeconds,
        tempo: e.tempo ?? "",
        notes: e.notes ?? "",
        supersetGroup: e.supersetGroup,
      })),
    })),
  };

  return (
    <>
      <PageHeader
        title={program.name}
        subtitle={PROGRAM_TYPES[program.type as keyof typeof PROGRAM_TYPES] ?? "Personnalisé"}
        back="/programmes"
      />
      <ProgramEditor initial={initial} isActive={program.isActive && !program.archivedAt} />
    </>
  );
}
