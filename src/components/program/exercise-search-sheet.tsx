"use client";

import { useEffect, useState } from "react";
import { Plus, Search, Star } from "lucide-react";
import { EmptyState, Sheet, Skeleton } from "@/components/ui/misc";
import { Input } from "@/components/ui/field";
import { CATEGORIES, EQUIPMENT } from "@/lib/constants";
import { cn } from "@/lib/utils";

export type FoundExercise = {
  id: string;
  name: string;
  category: string;
  equipment: string;
  primaryMuscle: string;
  isFavorite?: boolean;
};

/**
 * Feuille de recherche d'exercices pour le constructeur de programme.
 *
 * Elle reste ouverte après un ajout : on construit une journée en enchaînant
 * les exercices, pas en rouvrant la feuille six fois.
 */
export function ExerciseSearchSheet({
  title = "Ajouter un exercice",
  addedIds,
  onAdd,
  onClose,
}: {
  title?: string;
  addedIds: string[];
  onAdd: (exercise: FoundExercise) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [results, setResults] = useState<FoundExercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [justAdded, setJustAdded] = useState<string | null>(null);

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

  const added = new Set(addedIds);
  const sorted = [...results].sort((a, b) => Number(b.isFavorite) - Number(a.isFavorite));

  function pick(exercise: FoundExercise) {
    onAdd(exercise);
    setJustAdded(exercise.id);
    window.setTimeout(() => setJustAdded((cur) => (cur === exercise.id ? null : cur)), 900);
  }

  return (
    <Sheet open onClose={onClose} fullHeight title={title}>
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
        <Chip active={category === ""} onClick={() => setCategory("")}>
          Tous
        </Chip>
        {Object.entries(CATEGORIES).map(([key, label]) => (
          <Chip key={key} active={category === key} onClick={() => setCategory(key)}>
            {label}
          </Chip>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <EmptyState
          icon={<Search className="h-6 w-6" />}
          title="Aucun exercice trouvé"
          description="Essaie un autre mot-clé ou change de catégorie."
        />
      ) : (
        <div className="space-y-2 pb-4">
          {sorted.map((e) => (
            <button
              key={e.id}
              type="button"
              onClick={() => pick(e)}
              className={cn(
                "flex min-h-[3.25rem] w-full items-center gap-3 rounded-2xl border bg-surface-2 px-3.5 py-3 text-left transition-colors",
                "hover:border-border-strong active:scale-[0.99]",
                justAdded === e.id ? "border-accent-border bg-accent-soft" : "border-border"
              )}
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-[0.95rem] font-medium">{e.name}</p>
                <p className="truncate text-xs text-subtle">
                  {e.primaryMuscle} · {EQUIPMENT[e.equipment as keyof typeof EQUIPMENT] ?? e.equipment}
                  {added.has(e.id) ? " · déjà dans la journée" : ""}
                </p>
              </div>
              {e.isFavorite ? <Star className="h-4 w-4 shrink-0 fill-accent text-accent" /> : null}
              <span
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl",
                  justAdded === e.id ? "bg-accent text-accent-contrast" : "bg-surface-3 text-muted"
                )}
                aria-hidden
              >
                <Plus className="h-4 w-4" />
              </span>
            </button>
          ))}
        </div>
      )}
    </Sheet>
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
        "shrink-0 whitespace-nowrap rounded-xl px-3 py-2 text-xs font-medium transition-colors",
        active ? "bg-accent text-accent-contrast" : "bg-surface-2 text-muted"
      )}
    >
      {children}
    </button>
  );
}
