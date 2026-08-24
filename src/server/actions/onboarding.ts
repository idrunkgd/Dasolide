"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/auth";
import { onboardingSchema, zodError, type ActionResult } from "@/lib/validation";
import { age, suggestMacros } from "@/lib/calc";
import { startOfDay } from "@/lib/utils";
import { createStarterProgram } from "@/server/starter-program";
import { schedulePlannedWorkouts } from "@/server/planning";
import type { ActivityLevel, MainGoal } from "@/lib/constants";

export async function completeOnboardingAction(input: unknown): Promise<ActionResult> {
  const userId = await requireUserId();
  const parsed = onboardingSchema.safeParse(input);
  if (!parsed.success) return zodError(parsed.error);

  const d = parsed.data;
  const programKey = (input as { programKey?: string })?.programKey ?? "ppl4";

  const birthDate = d.birthDate ? new Date(d.birthDate) : null;

  await prisma.userProfile.upsert({
    where: { userId },
    create: {
      userId,
      firstName: d.firstName,
      sex: d.sex ?? null,
      birthDate,
      heightCm: d.heightCm,
      startWeightKg: d.currentWeightKg,
      targetWeightKg: d.targetWeightKg ?? null,
      level: d.level,
      mainGoal: d.mainGoal,
      activityLevel: d.activityLevel,
      sessionsPerWeek: d.sessionsPerWeek,
      sessionMinutes: d.sessionMinutes,
      equipment: d.equipment.join(","),
      availableDays: d.availableDays.join(","),
    },
    update: {
      firstName: d.firstName,
      sex: d.sex ?? null,
      birthDate,
      heightCm: d.heightCm,
      targetWeightKg: d.targetWeightKg ?? null,
      level: d.level,
      mainGoal: d.mainGoal,
      activityLevel: d.activityLevel,
      sessionsPerWeek: d.sessionsPerWeek,
      sessionMinutes: d.sessionMinutes,
      equipment: d.equipment.join(","),
      availableDays: d.availableDays.join(","),
    },
  });

  await prisma.userSettings.upsert({
    where: { userId },
    create: { userId },
    update: {},
  });

  await prisma.user.update({
    where: { id: userId },
    data: { name: d.firstName, onboardedAt: new Date() },
  });

  // Premier point de poids — la courbe démarre dès le premier jour.
  await prisma.bodyWeight.upsert({
    where: { userId_date: { userId, date: startOfDay() } },
    create: { userId, date: startOfDay(), weightKg: d.currentWeightKg },
    update: { weightKg: d.currentWeightKg },
  });

  // Objectif nutritionnel suggéré, modifiable à tout moment.
  const macros = suggestMacros({
    weightKg: d.currentWeightKg,
    heightCm: d.heightCm,
    age: age(birthDate),
    sex: d.sex,
    activityLevel: d.activityLevel as ActivityLevel,
    mainGoal: d.mainGoal as MainGoal,
    sessionsPerWeek: d.sessionsPerWeek,
  });

  await prisma.nutritionGoal.updateMany({ where: { userId, isActive: true }, data: { isActive: false } });
  await prisma.nutritionGoal.create({
    data: {
      userId,
      kcal: macros.kcal,
      protein: macros.protein,
      carbs: macros.carbs,
      fat: macros.fat,
      fiber: macros.fiber,
      waterMl: Math.round(d.currentWeightKg * 35),
      source: "mifflin_st_jeor",
      isActive: true,
    },
  });

  // Objectif de poids explicite (§26)
  if (d.targetWeightKg && Math.abs(d.targetWeightKg - d.currentWeightKg) > 0.5) {
    const gaining = d.targetWeightKg > d.currentWeightKg;
    await prisma.goal.create({
      data: {
        userId,
        type: "poids",
        title: gaining ? `Atteindre ${d.targetWeightKg} kg` : `Descendre à ${d.targetWeightKg} kg`,
        startValue: d.currentWeightKg,
        targetValue: d.targetWeightKg,
        unit: "kg",
        targetDate: null,
      },
    });
  }

  if (d.createDemoProgram) {
    const program = await createStarterProgram(userId, programKey, true);
    await schedulePlannedWorkouts(userId, program.id, d.availableDays, 4);
  }

  revalidatePath("/", "layout");
  redirect("/");
}
