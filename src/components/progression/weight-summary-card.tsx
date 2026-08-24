import Link from "next/link";
import { TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { formatDate, formatSigned, formatWeight } from "@/lib/utils";
import type { WeightUnit } from "./units";

/** Synthèse du poids affichée sur le hub Progression. */
export function WeightSummaryCard({
  unit,
  latestKg,
  latestDate,
  trendPerWeek,
  change7,
  change30,
}: {
  unit: WeightUnit;
  latestKg: number | null;
  latestDate: Date | null;
  trendPerWeek: number;
  change7: number | null;
  change30: number | null;
}) {
  return (
    <Card className="mb-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="tabular text-3xl font-bold leading-none">
            {latestKg != null ? formatWeight(latestKg, unit) : "—"}
          </p>
          <p className="mt-1.5 text-xs text-subtle">
            {latestDate ? `Dernière pesée le ${formatDate(latestDate)}` : "Aucune pesée encore"}
          </p>
        </div>
        {trendPerWeek ? (
          <Badge tone={trendPerWeek < 0 ? "success" : "warning"}>
            <TrendingUp className="h-3 w-3" />
            {formatSigned(unit === "lb" ? trendPerWeek * 2.20462 : trendPerWeek)} {unit}/sem.
          </Badge>
        ) : null}
      </div>

      {latestKg != null ? (
        <>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <ChangeTile label="Sur 7 jours" value={change7} unit={unit} />
            <ChangeTile label="Sur 30 jours" value={change30} unit={unit} />
          </div>
          <p className="mt-3 text-xs text-subtle">
            Variations lues sur la moyenne glissante 7 jours, pas sur les pesées brutes.
          </p>
        </>
      ) : (
        <Link href="/progression/poids" className="mt-4 block">
          <Button fullWidth size="lg">
            Encoder mon poids
          </Button>
        </Link>
      )}
    </Card>
  );
}

function ChangeTile({ label, value, unit }: { label: string; value: number | null; unit: WeightUnit }) {
  const display = value == null ? null : unit === "lb" ? value * 2.20462 : value;
  const tone =
    display == null ? "text-muted" : display < 0 ? "text-success" : display > 0 ? "text-warning" : "text-muted";
  return (
    <div className="rounded-2xl bg-surface-2 p-3">
      <p className="text-[0.7rem] font-medium uppercase tracking-wider text-subtle">{label}</p>
      <p className={`tabular mt-1 text-lg font-semibold ${tone}`}>
        {display == null ? "—" : `${formatSigned(display)} ${unit}`}
      </p>
    </div>
  );
}
