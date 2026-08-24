"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import fs from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/db";
import { destroySession, requireUserId } from "@/lib/auth";
import {
  profileSchema,
  reminderSchema,
  settingsSchema,
  zodError,
  type ActionResult,
} from "@/lib/validation";

// ---------------------------------------------------------------------------
// Réglages
// ---------------------------------------------------------------------------

export async function updateSettingsAction(input: unknown): Promise<ActionResult> {
  const userId = await requireUserId();
  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) return zodError(parsed.error);

  await prisma.userSettings.upsert({
    where: { userId },
    create: { userId, ...parsed.data },
    update: parsed.data,
  });

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function updateProfileAction(input: unknown): Promise<ActionResult> {
  const userId = await requireUserId();
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return zodError(parsed.error);

  const d = parsed.data;
  const data: Record<string, unknown> = { firstName: d.firstName };
  if (d.sex !== undefined) data.sex = d.sex ?? null;
  if (d.birthDate !== undefined) data.birthDate = d.birthDate ? new Date(d.birthDate) : null;
  if (d.heightCm !== undefined) data.heightCm = d.heightCm;
  if (d.targetWeightKg !== undefined) data.targetWeightKg = d.targetWeightKg ?? null;
  if (d.level !== undefined) data.level = d.level;
  if (d.mainGoal !== undefined) data.mainGoal = d.mainGoal;
  if (d.activityLevel !== undefined) data.activityLevel = d.activityLevel;
  if (d.sessionsPerWeek !== undefined) data.sessionsPerWeek = d.sessionsPerWeek;
  if (d.sessionMinutes !== undefined) data.sessionMinutes = d.sessionMinutes;
  if (d.equipment !== undefined) data.equipment = d.equipment.join(",");
  if (d.availableDays !== undefined) data.availableDays = d.availableDays.join(",");

  await prisma.userProfile.update({ where: { userId }, data });
  await prisma.user.update({ where: { id: userId }, data: { name: d.firstName } });

  revalidatePath("/", "layout");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Rappels (§17)
// ---------------------------------------------------------------------------

export async function saveReminderAction(input: unknown): Promise<ActionResult> {
  const userId = await requireUserId();
  const parsed = reminderSchema.safeParse(input);
  if (!parsed.success) return zodError(parsed.error);

  const d = parsed.data;
  const data = {
    type: d.type,
    time: d.time,
    days: d.days.join(","),
    message: d.message ?? null,
    enabled: d.enabled,
  };

  if (d.id) {
    await prisma.reminder.updateMany({ where: { id: d.id, userId }, data });
  } else {
    await prisma.reminder.create({ data: { ...data, userId } });
  }

  revalidatePath("/notifications");
  return { ok: true };
}

export async function toggleReminderAction(id: string, enabled: boolean): Promise<ActionResult> {
  const userId = await requireUserId();
  await prisma.reminder.updateMany({ where: { id, userId }, data: { enabled } });
  revalidatePath("/notifications");
  return { ok: true };
}

export async function deleteReminderAction(id: string): Promise<ActionResult> {
  const userId = await requireUserId();
  await prisma.reminder.deleteMany({ where: { id, userId } });
  revalidatePath("/notifications");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// RGPD (§54)
// ---------------------------------------------------------------------------

/** Export complet des données de l'utilisateur, au format JSON. */
export async function exportDataAction(): Promise<ActionResult<{ json: string; filename: string }>> {
  const userId = await requireUserId();

  const [user, sessions, weights, measurements, photos, diary, meals, recipes, goals, records, reminders, programs, customExercises, customFoods] =
    await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, name: true, createdAt: true, profile: true, settings: true },
      }),
      prisma.workoutSession.findMany({
        where: { userId },
        include: { exercises: { include: { exercise: { select: { name: true } }, sets: true } } },
        orderBy: { startedAt: "asc" },
      }),
      prisma.bodyWeight.findMany({ where: { userId }, orderBy: { date: "asc" } }),
      prisma.bodyMeasurement.findMany({ where: { userId }, orderBy: { date: "asc" } }),
      prisma.progressPhoto.findMany({ where: { userId }, orderBy: { date: "asc" } }),
      prisma.diaryEntry.findMany({ where: { userId }, orderBy: { date: "asc" } }),
      prisma.savedMeal.findMany({ where: { userId }, include: { items: true } }),
      prisma.recipe.findMany({ where: { userId }, include: { ingredients: true } }),
      prisma.goal.findMany({ where: { userId } }),
      prisma.personalRecord.findMany({
        where: { userId },
        include: { exercise: { select: { name: true } } },
      }),
      prisma.reminder.findMany({ where: { userId } }),
      prisma.workoutProgram.findMany({
        where: { userId },
        include: { templates: { include: { exercises: { include: { exercise: { select: { name: true } } } } } } },
      }),
      prisma.exercise.findMany({ where: { userId } }),
      prisma.food.findMany({ where: { userId } }),
    ]);

  const payload = {
    exportedAt: new Date().toISOString(),
    application: "Muscu",
    user,
    programs,
    sessions,
    records,
    bodyWeights: weights,
    measurements,
    photos: photos.map((p) => ({ ...p, url: p.url })),
    nutrition: { diary, savedMeals: meals, recipes },
    goals,
    reminders,
    customExercises,
    customFoods,
  };

  return {
    ok: true,
    data: {
      json: JSON.stringify(payload, null, 2),
      filename: `muscu-export-${new Date().toISOString().slice(0, 10)}.json`,
    },
  };
}

/** Suppression définitive du compte, des données et des photos (§54). */
export async function deleteAccountAction(confirmation: string): Promise<ActionResult> {
  const userId = await requireUserId();
  if (confirmation.trim().toUpperCase() !== "SUPPRIMER") {
    return { ok: false, error: "Tape SUPPRIMER pour confirmer." };
  }

  // Les fichiers ne sont pas couverts par les suppressions en cascade.
  try {
    await fs.rm(path.join(process.cwd(), "public", "uploads", userId), {
      recursive: true,
      force: true,
    });
  } catch {
    /* dossier absent */
  }

  await prisma.user.delete({ where: { id: userId } });
  await destroySession();
  redirect("/login");
}

/** Supprime uniquement les photos de progression. */
export async function deleteAllPhotosAction(): Promise<ActionResult> {
  const userId = await requireUserId();
  await prisma.progressPhoto.deleteMany({ where: { userId } });
  try {
    await fs.rm(path.join(process.cwd(), "public", "uploads", userId), {
      recursive: true,
      force: true,
    });
  } catch {
    /* dossier absent */
  }
  revalidatePath("/progression/photos");
  return { ok: true };
}
