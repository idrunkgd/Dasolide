import { requireUser } from "@/lib/auth";
import { getWeightData } from "@/server/queries/body";
import { PageHeader } from "@/components/layout/page-header";
import { WeightTracker } from "@/components/progression/weight-tracker";
import { dateKey } from "@/lib/utils";

export const dynamic = "force-dynamic";

/** §18 — Suivi du poids corporel. */
export default async function WeightPage() {
  const user = await requireUser();
  const unit = (user.settings?.weightUnit ?? "kg") as "kg" | "lb";

  // 10 ans : l'intégralité de l'historique, le filtre de période est côté client.
  const { rows } = await getWeightData(user.id, 3650);

  const entries = rows
    .map((r) => ({
      id: r.id,
      date: dateKey(r.date),
      weightKg: r.weightKg,
      bodyFatPct: r.bodyFatPct,
      note: r.note,
    }))
    .sort((a, b) => b.date.localeCompare(a.date));

  return (
    <>
      <PageHeader
        title="Poids"
        subtitle="Pèse-toi le matin, à jeun, après les toilettes"
        back="/progression"
      />
      <WeightTracker entries={entries} unit={unit} />
    </>
  );
}
