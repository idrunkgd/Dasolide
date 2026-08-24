"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Search, Star } from "lucide-react";
import { Input } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { EmptyState, SegmentedControl, Skeleton } from "@/components/ui/misc";
import { FOOD_CATEGORIES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { useFoodSearch } from "./use-food-search";
import { FOOD_TABS, foodTitle, type FoodTab, type PickableFood } from "./types";

/**
 * Bloc de recherche d'aliment réutilisable : onglets, filtres par catégorie,
 * liste des résultats. Utilisé aussi bien en plein écran (page /recherche)
 * que dans une feuille modale (constructeur de repas ou de recette).
 */
export function FoodBrowser({
  onPick,
  autoFocus = false,
  createHref,
  className,
}: {
  onPick: (food: PickableFood) => void;
  autoFocus?: boolean;
  createHref?: string;
  className?: string;
}) {
  const [tab, setTab] = useState<FoodTab>("tous");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const { foods, loading, error } = useFoodSearch({ tab, query, category });

  return (
    <div className={className}>
      <div className="relative mb-3">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher un aliment…"
          className="pl-11"
          autoFocus={autoFocus}
          type="search"
          aria-label="Rechercher un aliment"
        />
      </div>

      <SegmentedControl className="mb-3" value={tab} onChange={setTab} options={FOOD_TABS} size="sm" />

      <div className="no-scrollbar -mx-1 mb-3 flex gap-1.5 overflow-x-auto px-1 pb-1">
        <FilterChip active={category === ""} onClick={() => setCategory("")}>
          Toutes
        </FilterChip>
        {Object.entries(FOOD_CATEGORIES).map(([key, label]) => (
          <FilterChip key={key} active={category === key} onClick={() => setCategory(key)}>
            {label}
          </FilterChip>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2" aria-busy="true">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-[4.25rem] w-full" />
          ))}
        </div>
      ) : error ? (
        <EmptyState icon={<Search className="h-6 w-6" />} title="Recherche indisponible" description={error} />
      ) : foods.length === 0 ? (
        <EmptyState
          icon={<Search className="h-6 w-6" />}
          title="Aucun aliment trouvé"
          description={
            tab === "favoris"
              ? "Tu n'as pas encore de favori. Ouvre une fiche aliment pour en ajouter un."
              : tab === "recents"
                ? "Aucun aliment encodé récemment."
                : tab === "mes"
                  ? "Tu n'as pas encore créé d'aliment personnalisé."
                  : "Essaie un autre mot-clé, ou crée ton propre aliment."
          }
          action={
            createHref ? (
              <Link href={createHref}>
                <Button variant="secondary" size="sm">
                  <Plus className="h-4 w-4" />
                  Créer un aliment
                </Button>
              </Link>
            ) : null
          }
        />
      ) : (
        <ul className="space-y-2 pb-2">
          {foods.map((food) => (
            <li key={food.id}>
              <FoodRow food={food} onClick={() => onPick(food)} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function FoodRow({ food, onClick }: { food: PickableFood; onClick: () => void }) {
  const portion =
    food.servingGrams && food.servingGrams > 0
      ? `${food.servingName || "1 portion"} · ${Math.round(food.servingGrams)} g`
      : FOOD_CATEGORIES[food.category as keyof typeof FOOD_CATEGORIES] ?? "Autre";

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex min-h-[3.75rem] w-full items-center gap-3 rounded-2xl border border-border bg-surface-2 px-3.5 py-3 text-left",
        "transition-colors hover:border-border-strong active:scale-[0.99]"
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-[0.95rem] font-medium">{foodTitle(food)}</p>
        <p className="truncate text-xs text-subtle">{portion}</p>
      </div>
      <div className="shrink-0 text-right">
        <p className="tabular text-sm font-semibold">{Math.round(food.kcal100)}</p>
        <p className="text-[0.65rem] uppercase tracking-wide text-subtle">kcal/100 g</p>
      </div>
      {food.isFavorite ? <Star className="h-4 w-4 shrink-0 fill-accent text-accent" aria-label="Favori" /> : null}
    </button>
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
      type="button"
      onClick={onClick}
      className={cn(
        "min-h-[2.25rem] shrink-0 whitespace-nowrap rounded-xl px-3 py-1.5 text-xs font-medium transition-colors",
        active ? "bg-accent text-accent-contrast" : "bg-surface-2 text-muted hover:text-text"
      )}
    >
      {children}
    </button>
  );
}
