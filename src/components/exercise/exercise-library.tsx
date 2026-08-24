"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, Dumbbell, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/misc";
import { CATEGORIES, DIFFICULTIES, EQUIPMENT } from "@/lib/constants";
import { cn, normalizeSearch } from "@/lib/utils";
import { EMPTY_FILTERS, LibraryFilters, type Filters } from "./library-filters";
import { matchesQuery, sortByRelevance, type LibraryExercise } from "./types";

const BATCH = 40;

/**
 * Bibliothèque complète (§6).
 *
 * Les 173 exercices sont envoyés une seule fois par le serveur : la recherche
 * et les filtres sont donc instantanés, sans aller-retour réseau. L'affichage
 * est limité à un lot de 40 lignes, étendu par le bouton « Voir plus », pour
 * que la liste reste fluide sur mobile.
 */
export function ExerciseLibrary({ exercises }: { exercises: LibraryExercise[] }) {
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [limit, setLimit] = useState(BATCH);

  const filtered = useMemo(() => {
    const needle = normalizeSearch(filters.query);
    const list = exercises.filter((e) => {
      if (filters.tab === "favoris" && !e.isFavorite) return false;
      if (filters.tab === "mes" && !e.isCustom) return false;
      if (filters.category && e.category !== filters.category) return false;
      if (filters.equipment && e.equipment !== filters.equipment) return false;
      if (filters.difficulty && e.difficulty !== filters.difficulty) return false;
      return matchesQuery(e, needle);
    });
    if (needle) return sortByRelevance(list, needle);
    // Sans recherche, on classe par catégorie : les lots de « Voir plus »
    // complètent alors les groupes les uns après les autres.
    const order = Object.keys(CATEGORIES);
    return [...list].sort(
      (a, b) =>
        order.indexOf(a.category) - order.indexOf(b.category) || a.name.localeCompare(b.name, "fr")
    );
  }, [exercises, filters]);

  const visible = filtered.slice(0, limit);

  const groups = useMemo(() => {
    const map = new Map<string, LibraryExercise[]>();
    for (const e of visible) {
      const arr = map.get(e.category);
      if (arr) arr.push(e);
      else map.set(e.category, [e]);
    }
    const order = Object.keys(CATEGORIES);
    return [...map.entries()].sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0]));
  }, [visible]);

  const totalByCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of filtered) map.set(e.category, (map.get(e.category) ?? 0) + 1);
    return map;
  }, [filtered]);

  function update(next: Filters) {
    setFilters(next);
    setLimit(BATCH);
  }

  return (
    <div className="px-4 pb-8 pt-4">
      <LibraryFilters
        filters={filters}
        onChange={update}
        showAdvanced={showAdvanced}
        onToggleAdvanced={() => setShowAdvanced((v) => !v)}
      />

      <p className="tabular mb-3 px-1 text-xs text-subtle">
        {filtered.length} exercice{filtered.length > 1 ? "s" : ""}
        {filtered.length !== exercises.length ? ` sur ${exercises.length}` : ""}
      </p>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Dumbbell className="h-6 w-6" />}
          title="Aucun exercice trouvé"
          description={
            filters.tab === "favoris"
              ? "Ouvre la fiche d'un exercice et touche l'étoile pour l'ajouter ici."
              : filters.tab === "mes"
                ? "Tu n'as pas encore créé d'exercice personnalisé."
                : "Essaie un autre mot-clé ou réinitialise les filtres."
          }
          action={
            <Link href="/exercices/nouveau">
              <Button variant="secondary" size="sm">
                Créer un exercice
              </Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-5">
          {groups.map(([category, items]) => (
            <section key={category}>
              <div className="mb-2 flex items-baseline justify-between px-1">
                <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-subtle">
                  {CATEGORIES[category as keyof typeof CATEGORIES] ?? category}
                </h2>
                <span className="tabular text-xs text-subtle">
                  {items.length < (totalByCategory.get(category) ?? 0)
                    ? `${items.length} / ${totalByCategory.get(category)}`
                    : items.length}
                </span>
              </div>
              <ul className="space-y-2">
                {items.map((exercise) => (
                  <li key={exercise.id}>
                    <ExerciseRow exercise={exercise} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      {limit < filtered.length ? (
        <Button
          variant="secondary"
          fullWidth
          size="lg"
          className="mt-5"
          onClick={() => setLimit((l) => l + BATCH)}
        >
          Voir plus ({filtered.length - limit} restants)
        </Button>
      ) : null}
    </div>
  );
}

function ExerciseRow({ exercise }: { exercise: LibraryExercise }) {
  return (
    <Link
      href={`/exercices/${exercise.id}`}
      className={cn(
        "flex min-h-[3.75rem] items-center gap-3 rounded-2xl border border-border bg-surface-2 px-3.5 py-3",
        "transition-colors hover:border-border-strong active:scale-[0.99]"
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-[0.95rem] font-medium">{exercise.name}</p>
        <p className="truncate text-xs text-subtle">
          {exercise.primaryMuscle} ·{" "}
          {EQUIPMENT[exercise.equipment as keyof typeof EQUIPMENT] ?? exercise.equipment} ·{" "}
          {DIFFICULTIES[exercise.difficulty as keyof typeof DIFFICULTIES] ?? exercise.difficulty}
        </p>
      </div>
      {exercise.isCustom ? (
        <span className="shrink-0 rounded-lg bg-surface-3 px-2 py-1 text-[0.65rem] font-medium text-muted">
          Perso
        </span>
      ) : null}
      {exercise.isFavorite ? (
        <Star className="h-4 w-4 shrink-0 fill-accent text-accent" aria-label="Favori" />
      ) : null}
      <ChevronRight className="h-4 w-4 shrink-0 text-subtle" aria-hidden />
    </Link>
  );
}
