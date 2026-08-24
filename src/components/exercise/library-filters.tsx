"use client";

import { Search, SlidersHorizontal, X } from "lucide-react";
import { Input } from "@/components/ui/field";
import { SegmentedControl } from "@/components/ui/misc";
import { CATEGORIES, DIFFICULTIES, EQUIPMENT } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { LIBRARY_TABS, type LibraryTab } from "./types";

export type Filters = {
  query: string;
  tab: LibraryTab;
  category: string;
  equipment: string;
  difficulty: string;
};

export const EMPTY_FILTERS: Filters = {
  query: "",
  tab: "tous",
  category: "",
  equipment: "",
  difficulty: "",
};

/** Barre de recherche + filtres de la bibliothèque (§6). */
export function LibraryFilters({
  filters,
  onChange,
  showAdvanced,
  onToggleAdvanced,
}: {
  filters: Filters;
  onChange: (next: Filters) => void;
  showAdvanced: boolean;
  onToggleAdvanced: () => void;
}) {
  const set = <K extends keyof Filters>(key: K, value: Filters[K]) =>
    onChange({ ...filters, [key]: value });

  const activeCount =
    (filters.category ? 1 : 0) + (filters.equipment ? 1 : 0) + (filters.difficulty ? 1 : 0);

  return (
    <div className="mb-4">
      <div className="mb-3 flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
          <Input
            value={filters.query}
            onChange={(e) => set("query", e.target.value)}
            placeholder="Rechercher un exercice…"
            className="pl-11"
            type="search"
            aria-label="Rechercher un exercice"
          />
        </div>
        <button
          type="button"
          onClick={onToggleAdvanced}
          aria-expanded={showAdvanced}
          aria-label="Filtres"
          className={cn(
            "relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border transition-colors",
            showAdvanced || activeCount > 0
              ? "border-accent-border bg-accent-soft text-accent"
              : "border-border bg-surface-2 text-muted"
          )}
        >
          <SlidersHorizontal className="h-5 w-5" />
          {activeCount > 0 ? (
            <span className="tabular absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-[0.65rem] font-bold text-accent-contrast">
              {activeCount}
            </span>
          ) : null}
        </button>
      </div>

      <SegmentedControl
        value={filters.tab}
        onChange={(v) => set("tab", v)}
        options={LIBRARY_TABS}
        size="sm"
      />

      {showAdvanced ? (
        <div className="mt-3 space-y-3 rounded-2xl border border-border bg-surface-2 p-3">
          <FilterRow
            label="Catégorie"
            options={CATEGORIES}
            value={filters.category}
            onChange={(v) => set("category", v)}
          />
          <FilterRow
            label="Équipement"
            options={EQUIPMENT}
            value={filters.equipment}
            onChange={(v) => set("equipment", v)}
          />
          <FilterRow
            label="Difficulté"
            options={DIFFICULTIES}
            value={filters.difficulty}
            onChange={(v) => set("difficulty", v)}
          />
          {activeCount > 0 ? (
            <button
              type="button"
              onClick={() => onChange({ ...filters, category: "", equipment: "", difficulty: "" })}
              className="flex min-h-[2.5rem] items-center gap-1.5 text-xs font-medium text-accent"
            >
              <X className="h-3.5 w-3.5" />
              Réinitialiser les filtres
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function FilterRow({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: Record<string, string>;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <p className="mb-1.5 px-0.5 text-[0.7rem] font-semibold uppercase tracking-wider text-subtle">
        {label}
      </p>
      <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
        <Chip active={value === ""} onClick={() => onChange("")}>
          Tous
        </Chip>
        {Object.entries(options).map(([key, optionLabel]) => (
          <Chip key={key} active={value === key} onClick={() => onChange(value === key ? "" : key)}>
            {optionLabel}
          </Chip>
        ))}
      </div>
    </div>
  );
}

function Chip({
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
        "min-h-[2.5rem] shrink-0 whitespace-nowrap rounded-xl px-3.5 text-xs font-medium transition-colors",
        active ? "bg-accent text-accent-contrast" : "bg-surface-3 text-muted hover:text-text"
      )}
    >
      {children}
    </button>
  );
}
