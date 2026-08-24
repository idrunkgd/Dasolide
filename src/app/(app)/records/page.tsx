import { requireUser } from "@/lib/auth";
import { getBestRecords } from "@/server/records";
import { PageHeader } from "@/components/layout/page-header";
import { RecordsView, type RecordRow } from "@/components/exercise/records-view";

export const dynamic = "force-dynamic";

/** Records personnels (§12). */
export default async function RecordsPage() {
  const user = await requireUser();
  const unit = (user.settings?.weightUnit ?? "kg") as "kg" | "lb";

  const records = await getBestRecords(user.id);

  const rows: RecordRow[] = records.map((r) => ({
    id: r.id,
    exerciseId: r.exerciseId,
    exerciseName: r.exercise.name,
    category: r.exercise.category,
    type: r.type,
    value: r.value,
    previousValue: r.previousValue,
    weightKg: r.weightKg,
    reps: r.reps,
    achievedAt: r.achievedAt.toISOString(),
  }));

  return (
    <>
      <PageHeader
        title="Records personnels"
        subtitle={`${rows.length} record${rows.length > 1 ? "s" : ""} détecté${rows.length > 1 ? "s" : ""} automatiquement`}
        back="/"
      />
      <RecordsView records={rows} unit={unit} />
    </>
  );
}
