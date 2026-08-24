import "server-only";
import { prisma } from "@/lib/db";
import { addDays, startOfDay } from "@/lib/utils";
import { movingAverage, weightTrend } from "@/lib/calc";

export async function getWeightData(userId: string, days = 365) {
  const from = addDays(startOfDay(), -days);
  const rows = await prisma.bodyWeight.findMany({
    where: { userId, date: { gte: from } },
    orderBy: { date: "asc" },
  });

  const points = rows.map((r) => ({ date: r.date, weightKg: r.weightKg }));
  const avg7 = movingAverage(points, 7);
  const avg30 = movingAverage(points, 30);

  const latest = rows.at(-1) ?? null;
  const trendPerWeek = weightTrend(points, 30);

  const at = (daysAgo: number) => {
    const target = addDays(startOfDay(), -daysAgo).getTime();
    // point le plus proche antérieur ou égal
    let best: (typeof points)[number] | null = null;
    for (const p of points) {
      if (p.date.getTime() <= target) best = p;
      else break;
    }
    return best;
  };

  const smoothedNow = avg7.at(-1)?.value ?? latest?.weightKg ?? null;
  const ref7 = avg7.find((p) => p.date.getTime() >= addDays(startOfDay(), -7).getTime());
  const ref30 = avg7.find((p) => p.date.getTime() >= addDays(startOfDay(), -30).getTime());

  return {
    rows,
    points,
    avg7,
    avg30,
    latest,
    trendPerWeek,
    change7: smoothedNow != null && ref7 ? smoothedNow - ref7.value : null,
    change30: smoothedNow != null && ref30 ? smoothedNow - ref30.value : null,
    weightAt: at,
    smoothedNow,
  };
}

export async function getMeasurements(userId: string, days = 365) {
  return prisma.bodyMeasurement.findMany({
    where: { userId, date: { gte: addDays(startOfDay(), -days) } },
    orderBy: { date: "asc" },
  });
}

export async function getPhotos(userId: string) {
  return prisma.progressPhoto.findMany({ where: { userId }, orderBy: { date: "desc" } });
}
