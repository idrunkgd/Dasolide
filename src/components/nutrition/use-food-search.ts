"use client";

import { useEffect, useState } from "react";
import type { FoodTab, PickableFood } from "./types";

const TAB_PARAM: Record<FoodTab, string | null> = {
  tous: null,
  favoris: "favorites",
  recents: "recent",
  mes: "custom",
};

/**
 * Interroge /api/aliments avec un léger délai anti-rebond : on ne déclenche pas
 * une requête à chaque frappe.
 */
export function useFoodSearch({
  tab,
  query,
  category,
  take = 80,
}: {
  tab: FoodTab;
  query: string;
  category: string;
  take?: number;
}) {
  const [foods, setFoods] = useState<PickableFood[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const timer = window.setTimeout(async () => {
      const params = new URLSearchParams();
      if (query.trim()) params.set("q", query.trim());
      if (category) params.set("category", category);
      const flag = TAB_PARAM[tab];
      if (flag) params.set(flag, "1");
      params.set("take", String(take));

      try {
        const res = await fetch(`/api/aliments?${params.toString()}`);
        if (!res.ok) throw new Error("Requête refusée");
        const data = (await res.json()) as { foods?: PickableFood[] };
        if (!cancelled) {
          setFoods(data.foods ?? []);
          setError(null);
        }
      } catch {
        if (!cancelled) {
          setFoods([]);
          setError("La recherche a échoué. Vérifie ta connexion.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 220);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [tab, query, category, take]);

  return { foods, loading, error };
}
