"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, Search, Sparkles, Trophy } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/field";
import { Badge, EmptyState } from "@/components/ui/misc";
import { CATEGORIES, PR_TYPES } from "@/lib/constants";
import {
  cn,
  formatDate,
  formatNumber,
  formatNumber1,
  formatVolume,
  formatWeightValue,
  kgToLb,
  normalizeSearch,
} from "@/lib/utils";

export type RecordRow = {
  id: string;
  exerciseId: string;
  exerciseName: string;
  category: string;
  type: string;
  value: number;
  previousValue: number | null;
  weightKg: number | null;
  reps: number | null;
  achievedAt: string;
};

/** Records personnels (§12) : meilleur record par exercice et par type. */
export function RecordsView({ records, unit }: { records: RecordRow[]; unit: "kg" | "lb" }) {
  const [type, setType] = useState<string>("max_weight");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const needle = normalizeSearch(query);
    return records
      .filter((r) => (type === "" ? true : r.type === type))
      .filter((r) => (needle ? normalizeSearch(r.exerciseName).includes(needle) : true))
      .sort((a, b) => new Date(b.achievedAt).getTime() - new Date(a.achievedAt).getTime());
  }, [records, type, query]);

  const monthStart = useMemo(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).getTime();
  }, []);

  const ofTheMonth = filtered.filter((r) => new Date(r.achievedAt).getTime() >= monthStart);

  const groups = useMemo(() => {
    const map = new Map<string, RecordRow[]>();
    for (const r of filtered) {
      const arr = map.get(r.category);
      if (arr) arr.push(r);
      else map.set(r.category, [r]);
    }
    const order = Object.keys(CATEGORIES);
    for (const list of map.values()) list.sort((a, b) => a.exerciseName.localeCompare(b.exerciseName, "fr"));
    return [...map.entries()].sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0]));
  }, [filtered]);

  return (
    <div className="px-4 pb-8 pt-4">
      <div className="relative mb-3">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher un exercice…"
          className="pl-11"
          type="search"
          aria-label="Rechercher un exercice"
        />
      </div>

      <div className="no-scrollbar -mx-1 mb-4 flex gap-1.5 overflow-x-auto px-1 pb-1">
        <TypeChip active={type === ""} onClick={() => setType("")}>
          Tous les types
        </TypeChip>
        {Object.entries(PR_TYPES).map(([key, label]) => (
          <TypeChip key={key} active={type === key} onClick={() => setType(key)}>
            {label}
          </TypeChip>
        ))}
      </div>

      {ofTheMonth.length > 0 ? (
        <section className="mb-5">
          <div className="mb-2 flex items-center gap-2 px-1">
            <Sparkles className="h-4 w-4 text-accent" />
            <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-accent">
              Records du mois ({ofTheMonth.length})
            </h2>
          </div>
          <div className="space-y-2">
            {ofTheMonth.map((r) => (
              <RecordCard key={`m-${r.id}`} record={r} unit={unit} highlight />
            ))}
          </div>
        </section>
      ) : null}

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Trophy className="h-6 w-6" />}
          title="Aucun record"
          description="Termine une séance : les records sont détectés automatiquement à la clôture."
        />
      ) : (
        <div className="space-y-5">
          {groups.map(([category, items]) => (
            <section key={category}>
              <div className="mb-2 flex items-baseline justify-between px-1">
                <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-subtle">
                  {CATEGORIES[category as keyof typeof CATEGORIES] ?? category}
                </h2>
                <span className="tabular text-xs text-subtle">{items.length}</span>
              </div>
              <div className="space-y-2">
                {items.map((r) => (
                  <RecordCard key={r.id} record={r} unit={unit} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function RecordCard({
  record,
  unit,
  highlight,
}: {
  record: RecordRow;
  unit: "kg" | "lb";
  highlight?: boolean;
}) {
  const progress =
    record.previousValue != null && record.previousValue > 0
      ? ((record.value - record.previousValue) / record.previousValue) * 100
      : null;

  return (
    <Link href={`/exercices/${record.exerciseId}`}>
      <Card className={cn("p-3.5", highlight && "border-accent-border bg-accent-soft")}>
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[0.95rem] font-medium">{record.exerciseName}</p>
            <p className="text-xs text-subtle">
              {PR_TYPES[record.type as keyof typeof PR_TYPES] ?? record.type} ·{" "}
              {formatDate(record.achievedAt)}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="tabular text-lg font-semibold leading-none">
              {formatRecordValue(record, unit)}
            </p>
            {record.previousValue != null ? (
              <p className="tabular mt-1 text-xs text-subtle">
                avant {formatRecordValue({ ...record, value: record.previousValue }, unit)}
              </p>
            ) : (
              <p className="mt-1 text-xs text-subtle">premier record</p>
            )}
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-subtle" aria-hidden />
        </div>

        {progress != null && progress > 0 ? (
          <div className="mt-2.5">
            <Badge tone="success">+{formatNumber1(progress)} % de progression</Badge>
          </div>
        ) : null}
      </Card>
    </Link>
  );
}

function formatRecordValue(record: RecordRow, unit: "kg" | "lb"): string {
  switch (record.type) {
    case "max_reps":
      return `${formatNumber(record.value)} reps`;
    case "max_volume_set":
    case "max_volume_session":
      return unit === "lb"
        ? `${formatNumber(Math.round(kgToLb(record.value)))} lb`
        : formatVolume(record.value);
    default:
      return `${formatWeightValue(record.value, unit)} ${unit}`;
  }
}

function TypeChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "min-h-[2.75rem] shrink-0 whitespace-nowrap rounded-2xl px-4 text-sm font-medium transition-colors",
        active ? "bg-accent text-accent-contrast" : "bg-surface-2 text-muted hover:text-text"
      )}
    >
      {children}
    </button>
  );
}
