import "server-only";
import { prisma } from "@/lib/db";
import { addDays, startOfDay, startOfWeek } from "@/lib/utils";

/**
 * Génère le planning à partir d'un programme et des jours disponibles (§16).
 *
 * Les jours non couverts par une séance sont explicitement marqués « repos » :
 * l'utilisateur voit ainsi une semaine complète, pas des trous.
 */
export async function schedulePlannedWorkouts(
  userId: string,
  programId: string,
  availableDays: number[],
  weeks = 4,
  from: Date = startOfWeek()
) {
  const program = await prisma.workoutProgram.findFirst({
    where: { id: programId, userId },
    include: { templates: { orderBy: { sortOrder: "asc" } } },
  });
  if (!program || program.templates.length === 0) return 0;

  const days = [...new Set(availableDays)].sort((a, b) => a - b);
  if (days.length === 0) return 0;

  const start = startOfDay(from);
  const end = addDays(start, weeks * 7);

  // On ne touche jamais aux séances déjà réalisées.
  await prisma.plannedWorkout.deleteMany({
    where: { userId, date: { gte: start, lt: end }, status: { in: ["planned", "rest"] } },
  });

  const rows: {
    userId: string;
    date: Date;
    programId: string;
    templateId: string | null;
    status: string;
  }[] = [];

  let templateIndex = 0;
  const today = startOfDay();

  for (let w = 0; w < weeks; w++) {
    for (let dow = 1; dow <= 7; dow++) {
      const date = addDays(start, w * 7 + (dow - 1));
      if (date < today) continue; // pas de réécriture du passé

      if (days.includes(dow)) {
        const template = program.templates[templateIndex % program.templates.length];
        templateIndex++;
        rows.push({ userId, date, programId, templateId: template.id, status: "planned" });
      } else {
        rows.push({ userId, date, programId, templateId: null, status: "rest" });
      }
    }
  }

  if (rows.length === 0) return 0;

  // createMany est disponible sur SQLite comme sur PostgreSQL.
  await prisma.plannedWorkout.createMany({ data: rows });
  return rows.length;
}

/** La séance prévue aujourd'hui (ou le prochain jour d'entraînement). */
export async function getTodayPlan(userId: string) {
  const today = startOfDay();

  const todayPlan = await prisma.plannedWorkout.findFirst({
    where: { userId, date: today },
    include: {
      template: { include: { exercises: { include: { exercise: true }, orderBy: { sortOrder: "asc" } } } },
      program: true,
      session: true,
    },
  });

  const nextPlan = await prisma.plannedWorkout.findFirst({
    where: {
      userId,
      date: { gt: today },
      status: "planned",
      templateId: { not: null },
    },
    orderBy: { date: "asc" },
    include: { template: true, program: true },
  });

  return { todayPlan, nextPlan };
}
