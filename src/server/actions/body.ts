"use server";

import { revalidatePath } from "next/cache";
import fs from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/auth";
import {
  bodyWeightSchema,
  measurementSchema,
  photoSchema,
  goalSchema,
  zodError,
  type ActionResult,
} from "@/lib/validation";
import { startOfDay } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Poids
// ---------------------------------------------------------------------------

export async function saveWeightAction(input: unknown): Promise<ActionResult> {
  const userId = await requireUserId();
  const parsed = bodyWeightSchema.safeParse(input);
  if (!parsed.success) return zodError(parsed.error);

  const date = startOfDay(parsed.data.date);
  await prisma.bodyWeight.upsert({
    where: { userId_date: { userId, date } },
    create: {
      userId,
      date,
      weightKg: parsed.data.weightKg,
      bodyFatPct: parsed.data.bodyFatPct ?? null,
      note: parsed.data.note ?? null,
    },
    update: {
      weightKg: parsed.data.weightKg,
      bodyFatPct: parsed.data.bodyFatPct ?? null,
      note: parsed.data.note ?? null,
    },
  });

  await refreshWeightGoals(userId, parsed.data.weightKg);

  revalidatePath("/");
  revalidatePath("/progression");
  revalidatePath("/progression/poids");
  return { ok: true };
}

export async function deleteWeightAction(id: string): Promise<ActionResult> {
  const userId = await requireUserId();
  await prisma.bodyWeight.deleteMany({ where: { id, userId } });
  revalidatePath("/progression/poids");
  return { ok: true };
}

/** Met à jour l'état des objectifs de poids (§26). */
async function refreshWeightGoals(userId: string, currentWeight: number) {
  const goals = await prisma.goal.findMany({ where: { userId, type: "poids", status: "active" } });
  for (const g of goals) {
    const losing = g.targetValue < g.startValue;
    const reached = losing ? currentWeight <= g.targetValue : currentWeight >= g.targetValue;
    if (reached) {
      await prisma.goal.update({
        where: { id: g.id },
        data: { status: "atteint", achievedAt: new Date() },
      });
    }
  }
}

// ---------------------------------------------------------------------------
// Mensurations
// ---------------------------------------------------------------------------

export async function saveMeasurementAction(input: unknown): Promise<ActionResult> {
  const userId = await requireUserId();
  const parsed = measurementSchema.safeParse(input);
  if (!parsed.success) return zodError(parsed.error);

  const { date, ...values } = parsed.data;
  const day = startOfDay(date);

  const data = Object.fromEntries(
    Object.entries(values).map(([k, v]) => [k, v === undefined || v === "" ? null : v])
  );

  await prisma.bodyMeasurement.upsert({
    where: { userId_date: { userId, date: day } },
    create: { userId, date: day, ...data },
    update: data,
  });

  revalidatePath("/progression/mensurations");
  return { ok: true };
}

export async function deleteMeasurementAction(id: string): Promise<ActionResult> {
  const userId = await requireUserId();
  await prisma.bodyMeasurement.deleteMany({ where: { id, userId } });
  revalidatePath("/progression/mensurations");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Photos de progression
// ---------------------------------------------------------------------------

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

export async function savePhotoAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const userId = await requireUserId();
  const parsed = photoSchema.safeParse(input);
  if (!parsed.success) return zodError(parsed.error);

  const match = /^data:(image\/(png|jpeg|jpg|webp));base64,(.+)$/.exec(parsed.data.dataUrl);
  if (!match) return { ok: false, error: "Format d'image non supporté (PNG, JPEG ou WebP)." };

  const ext = match[2] === "jpeg" ? "jpg" : match[2];
  const buffer = Buffer.from(match[3], "base64");
  if (buffer.byteLength > 6 * 1024 * 1024) {
    return { ok: false, error: "Image trop lourde (6 Mo maximum)." };
  }

  // Chaque utilisateur a son propre dossier : aucune photo n'est devinable
  // depuis un autre compte.
  const dir = path.join(UPLOAD_DIR, userId);
  await fs.mkdir(dir, { recursive: true });
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  await fs.writeFile(path.join(dir, filename), buffer);

  const photo = await prisma.progressPhoto.create({
    data: {
      userId,
      date: startOfDay(parsed.data.date),
      pose: parsed.data.pose,
      url: `/uploads/${userId}/${filename}`,
      weightKg: parsed.data.weightKg ?? null,
      comment: parsed.data.comment ?? null,
    },
  });

  revalidatePath("/progression/photos");
  return { ok: true, data: { id: photo.id } };
}

export async function deletePhotoAction(id: string): Promise<ActionResult> {
  const userId = await requireUserId();
  const photo = await prisma.progressPhoto.findFirst({ where: { id, userId } });
  if (!photo) return { ok: false, error: "Photo introuvable." };

  await prisma.progressPhoto.delete({ where: { id } });
  // Suppression réelle du fichier (§54)
  try {
    await fs.unlink(path.join(process.cwd(), "public", photo.url.replace(/^\//, "")));
  } catch {
    /* fichier déjà absent */
  }

  revalidatePath("/progression/photos");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Objectifs
// ---------------------------------------------------------------------------

export async function saveGoalAction(input: unknown): Promise<ActionResult> {
  const userId = await requireUserId();
  const parsed = goalSchema.safeParse(input);
  if (!parsed.success) return zodError(parsed.error);

  const d = parsed.data;
  const data = {
    type: d.type,
    title: d.title,
    exerciseId: d.exerciseId || null,
    measureKey: d.measureKey || null,
    startValue: d.startValue,
    targetValue: d.targetValue,
    unit: d.unit,
    targetDate: d.targetDate ? startOfDay(d.targetDate) : null,
  };

  if (d.id) {
    await prisma.goal.updateMany({ where: { id: d.id, userId }, data });
  } else {
    await prisma.goal.create({ data: { ...data, userId } });
  }

  revalidatePath("/progression/objectifs");
  return { ok: true };
}

export async function deleteGoalAction(id: string): Promise<ActionResult> {
  const userId = await requireUserId();
  await prisma.goal.deleteMany({ where: { id, userId } });
  revalidatePath("/progression/objectifs");
  return { ok: true };
}

export async function toggleGoalStatusAction(id: string, status: string): Promise<ActionResult> {
  const userId = await requireUserId();
  await prisma.goal.updateMany({
    where: { id, userId },
    data: { status, achievedAt: status === "atteint" ? new Date() : null },
  });
  revalidatePath("/progression/objectifs");
  return { ok: true };
}
