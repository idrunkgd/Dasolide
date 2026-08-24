"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/auth";
import type { ActionResult } from "@/lib/validation";

export async function deleteSessionAction(sessionId: string): Promise<ActionResult> {
  const userId = await requireUserId();

  const session = await prisma.workoutSession.findFirst({
    where: { id: sessionId, userId },
    select: { id: true },
  });
  if (!session) return { ok: false, error: "Séance introuvable." };

  // Les records issus de cette séance disparaissent avec elle (SetNull sur la
  // relation ne suffirait pas : le record ne serait plus justifiable).
  await prisma.personalRecord.deleteMany({ where: { userId, sessionId } });
  await prisma.plannedWorkout.updateMany({
    where: { userId, sessionId },
    data: { sessionId: null, status: "skipped" },
  });
  await prisma.workoutSession.delete({ where: { id: sessionId } });

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function updateSessionNotesAction(
  sessionId: string,
  feedback: string
): Promise<ActionResult> {
  const userId = await requireUserId();
  await prisma.workoutSession.updateMany({
    where: { id: sessionId, userId },
    data: { feedback: feedback.trim().slice(0, 2000) || null },
  });
  revalidatePath(`/historique/${sessionId}`);
  return { ok: true };
}
