"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/auth";
import { programSchema, zodError, type ActionResult } from "@/lib/validation";
import { schedulePlannedWorkouts } from "@/server/planning";
import { createStarterProgram, STARTER_PROGRAMS } from "@/server/starter-program";
import { parseDateKey, startOfDay } from "@/lib/utils";

/**
 * Actions du module Programmes & Planning (§10, §16).
 *
 * Règle de sécurité appliquée partout : une donnée utilisateur n'est jamais
 * atteinte par `where: { id }` seul. On passe toujours par un filtre qui
 * remonte à `userId` (directement, ou via `program: { userId }`) — §54.
 */

/**
 * Statuts modifiables d'une journée planifiée. « completed » n'en fait pas
 * partie : une séance déjà réalisée n'est jamais réécrite ni déplacée.
 */
const PLANNED_STATUSES = ["planned", "rest", "skipped"] as const;
type PlannedStatus = (typeof PLANNED_STATUSES)[number];

function revalidateProgramPaths(programId?: string) {
  revalidatePath("/programmes");
  if (programId) revalidatePath(`/programmes/${programId}`);
  revalidatePath("/calendrier");
  revalidatePath("/");
}

/** Jours d'entraînement disponibles du profil ("1,2,4,5" → [1,2,4,5]). */
async function availableDaysOf(userId: string): Promise<number[]> {
  const profile = await prisma.userProfile.findUnique({
    where: { userId },
    select: { availableDays: true },
  });
  const days = (profile?.availableDays ?? "")
    .split(",")
    .map((d) => Number(d.trim()))
    .filter((d) => Number.isInteger(d) && d >= 1 && d <= 7);
  const unique = [...new Set(days)].sort((a, b) => a - b);
  return unique.length > 0 ? unique : [1, 2, 4, 5];
}

/** Accepte "YYYY-MM-DD" comme une date ISO complète, toujours ramenée à minuit local. */
function toLocalDate(value: string): Date | null {
  const trimmed = value.trim();
  const date = /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? parseDateKey(trimmed) : new Date(trimmed);
  return Number.isNaN(date.getTime()) ? null : startOfDay(date);
}

// ---------------------------------------------------------------------------
// Programmes
// ---------------------------------------------------------------------------

/**
 * Crée ou met à jour un programme complet (journées + exercices) en une
 * transaction : l'éditeur envoie l'état entier, jamais des différences.
 */
export async function saveProgramAction(
  input: unknown
): Promise<ActionResult<{ id: string; templateIds: string[] }>> {
  const userId = await requireUserId();
  const parsed = programSchema.safeParse(input);
  if (!parsed.success) return zodError(parsed.error);

  const d = parsed.data;
  if (d.templates.length === 0) {
    return { ok: false, error: "Ajoute au moins une journée à ce programme." };
  }

  // Les exercices personnalisés d'un autre utilisateur ne sont pas utilisables.
  const exerciseIds = [...new Set(d.templates.flatMap((t) => t.exercises.map((e) => e.exerciseId)))];
  if (exerciseIds.length > 0) {
    const found = await prisma.exercise.findMany({
      where: { id: { in: exerciseIds }, OR: [{ isCustom: false }, { userId }] },
      select: { id: true },
    });
    if (found.length !== exerciseIds.length) {
      return { ok: false, error: "Un des exercices sélectionnés est introuvable." };
    }
  }

  if (d.id) {
    const existing = await prisma.workoutProgram.findFirst({
      where: { id: d.id, userId },
      select: { id: true },
    });
    if (!existing) return { ok: false, error: "Programme introuvable." };
  }

  const exercisesOf = (template: (typeof d.templates)[number]) =>
    template.exercises.map((e, index) => ({
      exerciseId: e.exerciseId,
      sortOrder: index,
      sets: e.sets,
      targetRepsMin: e.targetRepsMin ?? null,
      targetRepsMax: e.targetRepsMax ?? null,
      targetWeight: e.targetWeight ?? null,
      targetRpe: e.targetRpe ?? null,
      targetRir: e.targetRir ?? null,
      restSeconds: e.restSeconds,
      tempo: e.tempo?.trim() ? e.tempo.trim() : null,
      notes: e.notes?.trim() ? e.notes.trim() : null,
      supersetGroup: e.supersetGroup?.trim() ? e.supersetGroup.trim().toUpperCase() : null,
    }));

  const programData = {
    name: d.name,
    description: d.description?.trim() ? d.description.trim() : null,
    type: d.type,
    color: d.color,
  };

  let programId = d.id ?? "";
  // Renvoyés au client : après un enregistrement, l'éditeur connaît les
  // identifiants réels de ses journées et peut continuer à travailler.
  const templateIds: string[] = [];

  await prisma.$transaction(async (tx) => {
    if (programId) {
      await tx.workoutProgram.update({ where: { id: programId }, data: programData });
      const keptIds = d.templates.map((t) => t.id).filter((id): id is string => Boolean(id));
      await tx.workoutTemplate.deleteMany({
        where: { programId, ...(keptIds.length > 0 ? { id: { notIn: keptIds } } : {}) },
      });
    } else {
      const created = await tx.workoutProgram.create({
        data: { ...programData, userId, cycleLength: 7 },
        select: { id: true },
      });
      programId = created.id;
    }

    for (const [index, template] of d.templates.entries()) {
      const base = {
        name: template.name,
        notes: template.notes?.trim() ? template.notes.trim() : null,
        dayOfWeek: template.dayOfWeek ?? null,
        sortOrder: index,
      };

      const existing = template.id
        ? await tx.workoutTemplate.findFirst({
            where: { id: template.id, programId },
            select: { id: true },
          })
        : null;

      if (existing) {
        await tx.workoutTemplate.update({
          where: { id: existing.id },
          data: { ...base, exercises: { deleteMany: {}, create: exercisesOf(template) } },
        });
        templateIds.push(existing.id);
      } else {
        const created = await tx.workoutTemplate.create({
          data: { ...base, programId, exercises: { create: exercisesOf(template) } },
          select: { id: true },
        });
        templateIds.push(created.id);
      }
    }
  });

  revalidateProgramPaths(programId);
  return { ok: true, data: { id: programId, templateIds } };
}

export async function deleteProgramAction(id: string): Promise<ActionResult> {
  const userId = await requireUserId();
  const res = await prisma.workoutProgram.deleteMany({ where: { id, userId } });
  if (res.count === 0) return { ok: false, error: "Programme introuvable." };
  revalidateProgramPaths();
  return { ok: true };
}

/** Copie intégrale d'un programme (journées + exercices), jamais active. */
export async function duplicateProgramAction(id: string): Promise<ActionResult<{ id: string }>> {
  const userId = await requireUserId();
  const source = await prisma.workoutProgram.findFirst({
    where: { id, userId },
    include: {
      templates: {
        orderBy: { sortOrder: "asc" },
        include: { exercises: { orderBy: { sortOrder: "asc" } } },
      },
    },
  });
  if (!source) return { ok: false, error: "Programme introuvable." };

  const copy = await prisma.workoutProgram.create({
    data: {
      userId,
      name: `${source.name} (copie)`.slice(0, 80),
      description: source.description,
      type: source.type,
      color: source.color,
      cycleLength: source.cycleLength,
      isActive: false,
      templates: {
        create: source.templates.map((t, ti) => ({
          name: t.name,
          notes: t.notes,
          dayOfWeek: t.dayOfWeek,
          color: t.color,
          sortOrder: ti,
          exercises: {
            create: t.exercises.map((e, ei) => ({
              exerciseId: e.exerciseId,
              sortOrder: ei,
              sets: e.sets,
              targetRepsMin: e.targetRepsMin,
              targetRepsMax: e.targetRepsMax,
              targetWeight: e.targetWeight,
              targetRpe: e.targetRpe,
              targetRir: e.targetRir,
              restSeconds: e.restSeconds,
              tempo: e.tempo,
              notes: e.notes,
              supersetGroup: e.supersetGroup,
            })),
          },
        })),
      },
    },
    select: { id: true },
  });

  revalidateProgramPaths();
  return { ok: true, data: { id: copy.id } };
}

/** Archive (ou désarchive) un programme — il quitte la liste principale. */
export async function archiveProgramAction(id: string, archived = true): Promise<ActionResult> {
  const userId = await requireUserId();
  const res = await prisma.workoutProgram.updateMany({
    where: { id, userId },
    data: { archivedAt: archived ? new Date() : null, ...(archived ? { isActive: false } : {}) },
  });
  if (res.count === 0) return { ok: false, error: "Programme introuvable." };
  revalidateProgramPaths(id);
  return { ok: true };
}

/**
 * Rend un programme actif — il ne peut y en avoir qu'un — puis régénère le
 * planning des 4 prochaines semaines sur les jours disponibles du profil.
 */
export async function setActiveProgramAction(id: string): Promise<ActionResult<{ planned: number }>> {
  const userId = await requireUserId();
  const program = await prisma.workoutProgram.findFirst({
    where: { id, userId },
    select: { id: true, templates: { select: { id: true }, take: 1 } },
  });
  if (!program) return { ok: false, error: "Programme introuvable." };
  if (program.templates.length === 0) {
    return { ok: false, error: "Ajoute au moins une journée avant d'activer ce programme." };
  }

  await prisma.workoutProgram.updateMany({ where: { userId }, data: { isActive: false } });
  await prisma.workoutProgram.updateMany({
    where: { id, userId },
    data: { isActive: true, archivedAt: null },
  });

  const planned = await schedulePlannedWorkouts(userId, id, await availableDaysOf(userId), 4);

  revalidateProgramPaths(id);
  return { ok: true, data: { planned } };
}

/** Crée un des programmes prêts à l'emploi et planifie les 4 semaines à venir. */
export async function createFromStarterAction(key: string): Promise<ActionResult<{ id: string }>> {
  const userId = await requireUserId();
  if (!STARTER_PROGRAMS.some((p) => p.key === key)) {
    return { ok: false, error: "Modèle inconnu." };
  }

  const program = await createStarterProgram(userId, key, true);
  await schedulePlannedWorkouts(userId, program.id, await availableDaysOf(userId), 4);

  revalidateProgramPaths(program.id);
  return { ok: true, data: { id: program.id } };
}

/** Duplique une journée à l'intérieur de son programme. */
export async function duplicateTemplateAction(templateId: string): Promise<ActionResult<{ id: string }>> {
  const userId = await requireUserId();
  const source = await prisma.workoutTemplate.findFirst({
    where: { id: templateId, program: { userId } },
    include: { exercises: { orderBy: { sortOrder: "asc" } } },
  });
  if (!source) return { ok: false, error: "Journée introuvable." };

  const last = await prisma.workoutTemplate.findFirst({
    where: { programId: source.programId },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });

  const copy = await prisma.workoutTemplate.create({
    data: {
      programId: source.programId,
      name: `${source.name} (copie)`.slice(0, 60),
      notes: source.notes,
      dayOfWeek: null,
      color: source.color,
      sortOrder: (last?.sortOrder ?? 0) + 1,
      exercises: {
        create: source.exercises.map((e, i) => ({
          exerciseId: e.exerciseId,
          sortOrder: i,
          sets: e.sets,
          targetRepsMin: e.targetRepsMin,
          targetRepsMax: e.targetRepsMax,
          targetWeight: e.targetWeight,
          targetRpe: e.targetRpe,
          targetRir: e.targetRir,
          restSeconds: e.restSeconds,
          tempo: e.tempo,
          notes: e.notes,
          supersetGroup: e.supersetGroup,
        })),
      },
    },
    select: { id: true },
  });

  revalidateProgramPaths(source.programId);
  return { ok: true, data: { id: copy.id } };
}

// ---------------------------------------------------------------------------
// Planning (§16)
// ---------------------------------------------------------------------------

/**
 * Déplace une séance prévue vers un autre jour.
 *
 * Si le jour d'arrivée porte déjà une séance, les deux échangent leur date :
 * c'est le comportement attendu quand on réorganise sa semaine.
 */
export async function movePlannedWorkoutAction(
  plannedId: string,
  newDateISO: string
): Promise<ActionResult> {
  const userId = await requireUserId();

  const date = toLocalDate(newDateISO);
  if (!date) return { ok: false, error: "Date invalide." };

  const planned = await prisma.plannedWorkout.findFirst({ where: { id: plannedId, userId } });
  if (!planned) return { ok: false, error: "Séance introuvable." };
  if (planned.status === "completed") {
    return { ok: false, error: "Une séance déjà réalisée ne peut pas être déplacée." };
  }
  if (startOfDay(planned.date).getTime() === date.getTime()) return { ok: true };

  const target = await prisma.plannedWorkout.findFirst({
    where: { userId, date },
  });

  if (target && target.id !== planned.id) {
    if (target.status === "completed") {
      return { ok: false, error: "Ce jour porte déjà une séance réalisée." };
    }
    // Échange : ce qui occupait le jour d'arrivée prend la place libérée.
    // Un jour de repos reste ainsi marqué comme tel, il ne disparaît pas.
    await prisma.plannedWorkout.update({
      where: { id: target.id },
      data: { date: startOfDay(planned.date) },
    });
  }

  await prisma.plannedWorkout.update({ where: { id: planned.id }, data: { date } });

  revalidatePath("/calendrier");
  revalidatePath("/");
  return { ok: true };
}

export async function setPlannedStatusAction(
  plannedId: string,
  status: string
): Promise<ActionResult> {
  const userId = await requireUserId();
  if (!PLANNED_STATUSES.includes(status as PlannedStatus)) {
    return { ok: false, error: "Statut invalide." };
  }

  const planned = await prisma.plannedWorkout.findFirst({
    where: { id: plannedId, userId },
    select: { id: true, status: true },
  });
  if (!planned) return { ok: false, error: "Séance introuvable." };
  if (!PLANNED_STATUSES.includes(planned.status as PlannedStatus)) {
    return { ok: false, error: "Cette journée est déjà réalisée." };
  }

  await prisma.plannedWorkout.update({ where: { id: planned.id }, data: { status } });

  revalidatePath("/calendrier");
  revalidatePath("/");
  return { ok: true };
}

/** Ajoute (ou remplace) la séance prévue d'un jour. */
export async function addPlannedWorkoutAction(
  dateISO: string,
  templateId: string
): Promise<ActionResult<{ id: string }>> {
  const userId = await requireUserId();

  const date = toLocalDate(dateISO);
  if (!date) return { ok: false, error: "Date invalide." };

  const template = await prisma.workoutTemplate.findFirst({
    where: { id: templateId, program: { userId } },
    select: { id: true, programId: true },
  });
  if (!template) return { ok: false, error: "Journée introuvable." };

  const existing = await prisma.plannedWorkout.findFirst({ where: { userId, date } });

  if (existing) {
    if (existing.status === "completed") {
      return { ok: false, error: "Ce jour porte déjà une séance réalisée." };
    }
    await prisma.plannedWorkout.update({
      where: { id: existing.id },
      data: { templateId: template.id, programId: template.programId, status: "planned" },
    });
    revalidatePath("/calendrier");
    revalidatePath("/");
    return { ok: true, data: { id: existing.id } };
  }

  const created = await prisma.plannedWorkout.create({
    data: {
      userId,
      date,
      templateId: template.id,
      programId: template.programId,
      status: "planned",
    },
    select: { id: true },
  });

  revalidatePath("/calendrier");
  revalidatePath("/");
  return { ok: true, data: { id: created.id } };
}

export async function deletePlannedWorkoutAction(id: string): Promise<ActionResult> {
  const userId = await requireUserId();
  const res = await prisma.plannedWorkout.deleteMany({
    where: { id, userId, status: { in: [...PLANNED_STATUSES] } },
  });
  if (res.count === 0) {
    return { ok: false, error: "Séance introuvable ou déjà réalisée." };
  }
  revalidatePath("/calendrier");
  revalidatePath("/");
  return { ok: true };
}

/** Régénère le planning à partir du programme actif. */
export async function regeneratePlanningAction(weeks = 4): Promise<ActionResult<{ planned: number }>> {
  const userId = await requireUserId();
  const safeWeeks = Math.min(12, Math.max(1, Math.round(weeks)));

  const active = await prisma.workoutProgram.findFirst({
    where: { userId, isActive: true, archivedAt: null },
    select: { id: true },
  });
  if (!active) return { ok: false, error: "Aucun programme actif à planifier." };

  const planned = await schedulePlannedWorkouts(
    userId,
    active.id,
    await availableDaysOf(userId),
    safeWeeks
  );

  revalidatePath("/calendrier");
  revalidatePath("/");
  return { ok: true, data: { planned } };
}
