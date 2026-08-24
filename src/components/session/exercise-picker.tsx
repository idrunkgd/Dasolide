"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, Star } from "lucide-react";
import { Sheet, Skeleton, EmptyState, SegmentedControl } from "@/components/ui/misc";
import { Input } from "@/components/ui/field";
import { findAlternativesAction } from "@/server/actions/session";
import { CATEGORIES, EQUIPMENT } from "@/lib/constants";
import { cn } from "@/lib/utils";

export type PickableExercise = {
  id: string;
  name: string;
  category: string;
  equipment: string;
  trackingType: string;
  primaryMuscle: string;
  isFavorite?: boolean;
};

/**
 * Sélecteur d'exercice.
 *
 * En mode « remplacer », les alternatives sollicitant les mêmes muscles sont
 * proposées d'emblée : c'est le cas d'usage réel quand une machine est
 * occupée (§49).
 */
export function ExercisePicker({
  mode,
  currentExerciseId,
  onClose,
  onPick,
}: {
  mode: "add" | "replace";
  currentExerciseId: string | null;
  onClose: () => void;
  onPick: (exercise: PickableExercise) => void;
}) {
  const [tab, setTab] = useState<"alternatives" | "recherche">(
    mode === "replace" ? "alternatives" : "recherche"
  );
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("");
  const [results, setResults] = useState<PickableExercise[]>([]);
  const [alternatives, setAlternatives] = useState<PickableExercise[]>([]);
  const [loading, setLoading] = useState(true);

  // Alternatives (mode remplacement)
  useEffect(() => {
    if (mode !== "replace" || !currentExerciseId) return;
    let cancelled = false;
    findAlternativesAction(currentExerciseId).then((list) => {
      if (cancelled) return;
      setAlternatives(
        list.map((a) => ({
          id: a.id,
          name: a.name,
          category: a.category,
          equipment: a.equipment,
          trackingType: a.trackingType,
          primaryMuscle: a.primaryMuscle.name,
        }))
      );
    });
    return () => {
      cancelled = true;
    };
  }, [mode, currentExerciseId]);

  // Recherche
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const timer = window.setTimeout(async () => {
      const params = new URLSearchParams();
      if (query) params.set("q", query);
      if (category) params.set("category", category);
      params.set("take", "80");
      try {
        const res = await fetch(`/api/exercices?${params}`);
        const data = await res.json();
        if (!cancelled) setResults(data.exercises ?? []);
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 220);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query, category]);

  const list = tab === "alternatives" ? alternatives : results;

  const grouped = useMemo(() => {
    const favorites = list.filter((e) => e.isFavorite);
    const others = list.filter((e) => !e.isFavorite);
    return { favorites, others };
  }, [list]);

  return (
    <Sheet
      open
      onClose={onClose}
      fullHeight
      title={mode === "replace" ? "Remplacer l'exercice" : "Ajouter un exercice"}
    >
      {mode === "replace" ? (
        <SegmentedControl
          className="mb-4"
          value={tab}
          onChange={setTab}
          options={[
            { value: "alternatives", label: "Mêmes muscles" },
            { value: "recherche", label: "Tous" },
          ]}
        />
      ) : null}

      {tab === "recherche" ? (
        <>
          <div className="relative mb-3">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher un exercice…"
              className="pl-11"
              autoFocus
            />
          </div>

          <div className="no-scrollbar -mx-1 mb-3 flex gap-1.5 overflow-x-auto px-1 pb-1">
            <FilterChip active={category === ""} onClick={() => setCategory("")}>
              Tous
            </FilterChip>
            {Object.entries(CATEGORIES).map(([key, label]) => (
              <FilterChip key={key} active={category === key} onClick={() => setCategory(key)}>
                {label}
              </FilterChip>
            ))}
          </div>
        </>
      ) : null}

      {loading && tab === "recherche" ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <EmptyState
          icon={<Search className="h-6 w-6" />}
          title="Aucun exercice trouvé"
          description="Essaie un autre mot-clé ou change de catégorie."
        />
      ) : (
        <div className="space-y-2 pb-4">
          {grouped.favorites.length > 0 ? (
            <p className="px-1 pt-1 text-xs uppercase tracking-wider text-subtle">Favoris</p>
          ) : null}
          {[...grouped.favorites, ...grouped.others].map((e) => (
            <button
              key={e.id}
              onClick={() => onPick(e)}
              disabled={e.id === currentExerciseId}
              className={cn(
                "flex w-full items-center gap-3 rounded-2xl border border-border bg-surface-2 px-3.5 py-3 text-left transition-colors",
                "hover:border-border-strong active:scale-[0.99] disabled:opacity-40"
              )}
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-[0.95rem] font-medium">{e.name}</p>
                <p className="truncate text-xs text-subtle">
                  {e.primaryMuscle} · {EQUIPMENT[e.equipment as keyof typeof EQUIPMENT] ?? e.equipment}
                </p>
              </div>
              {e.isFavorite ? <Star className="h-4 w-4 shrink-0 fill-accent text-accent" /> : null}
            </button>
          ))}
        </div>
      )}
    </Sheet>
  );
}

function FilterChip({
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
      onClick={onClick}
      className={cn(
        "shrink-0 whitespace-nowrap rounded-xl px-3 py-1.5 text-xs font-medium transition-colors",
        active ? "bg-accent text-accent-contrast" : "bg-surface-2 text-muted"
      )}
    >
      {children}
    </button>
  );
}
