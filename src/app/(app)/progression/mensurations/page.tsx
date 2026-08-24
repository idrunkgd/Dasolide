import { requireUser } from "@/lib/auth";
import { getMeasurements } from "@/server/queries/body";
import { PageHeader } from "@/components/layout/page-header";
import { MeasurementsPanel } from "@/components/progression/measurements-panel";
import { MEASUREMENT_FIELDS, type MeasurementKey } from "@/lib/constants";
import { dateKey } from "@/lib/utils";
import type { MeasurementEntry } from "@/components/progression/measurement-form";

export const dynamic = "force-dynamic";

/** §19 — Mensurations corporelles. */
export default async function MeasurementsPage() {
  const user = await requireUser();
  const unit = (user.settings?.lengthUnit ?? "cm") as "cm" | "in";

  const rows = await getMeasurements(user.id, 3650);

  const entries: MeasurementEntry[] = rows
    .map((r) => {
      const values: Partial<Record<MeasurementKey, number | null>> = {};
      for (const f of MEASUREMENT_FIELDS) {
        values[f.key] = (r as Record<string, unknown>)[f.key] as number | null;
      }
      return {
        id: r.id,
        date: dateKey(r.date),
        bodyFatPct: r.bodyFatPct,
        note: r.note,
        values,
      };
    })
    .sort((a, b) => b.date.localeCompare(a.date));

  return (
    <>
      <PageHeader
        title="Mensurations"
        subtitle="Toutes les mesures sont facultatives"
        back="/progression"
      />
      <MeasurementsPanel entries={entries} unit={unit} />
    </>
  );
}
