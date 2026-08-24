import { requireUser } from "@/lib/auth";
import { getPhotos } from "@/server/queries/body";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/layout/page-header";
import { PhotosPanel } from "@/components/progression/photos-panel";
import { dateKey } from "@/lib/utils";

export const dynamic = "force-dynamic";

/** §20 — Photos de progression. */
export default async function PhotosPage() {
  const user = await requireUser();
  const unit = (user.settings?.weightUnit ?? "kg") as "kg" | "lb";

  const [rows, lastWeight] = await Promise.all([
    getPhotos(user.id),
    prisma.bodyWeight.findFirst({ where: { userId: user.id }, orderBy: { date: "desc" } }),
  ]);

  const photos = rows.map((p) => ({
    id: p.id,
    date: dateKey(p.date),
    pose: p.pose,
    url: p.url,
    weightKg: p.weightKg,
    comment: p.comment,
  }));

  return (
    <>
      <PageHeader
        title="Photos"
        subtitle="Le miroir le plus fiable de ta progression"
        back="/progression"
      />
      <PhotosPanel photos={photos} unit={unit} lastWeightKg={lastWeight?.weightKg ?? null} />
    </>
  );
}
