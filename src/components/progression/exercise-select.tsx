"use client";

import { useEffect, useState } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/field";

type Result = { id: string; name: string; primaryMuscle: string };

/** Choix d'un exercice pour un objectif de force — s'appuie sur /api/exercices. */
export function ExerciseSelect({
  value,
  valueName,
  onChange,
}: {
  value: string | null;
  valueName: string | null;
  onChange: (id: string | null, name: string | null) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (value) return;
    let cancelled = false;
    setLoading(true);
    const timer = window.setTimeout(async () => {
      try {
        const params = new URLSearchParams({ take: "20" });
        if (query) params.set("q", query);
        const res = await fetch(`/api/exercices?${params}`);
        const data = (await res.json()) as { exercises?: Result[] };
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
  }, [query, value]);

  if (value) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-accent-border bg-accent-soft px-4 py-3">
        <span className="min-w-0 flex-1 truncate text-sm font-medium">{valueName ?? "Exercice choisi"}</span>
        <button
          type="button"
          onClick={() => onChange(null, null)}
          aria-label="Changer d'exercice"
          className="flex h-9 w-9 items-center justify-center rounded-xl text-muted hover:text-text"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher un exercice…"
          className="pl-11"
        />
      </div>
      <div className="mt-2 max-h-48 space-y-1 overflow-y-auto">
        {loading && results.length === 0 ? (
          <p className="px-1 py-2 text-sm text-subtle">Recherche…</p>
        ) : results.length === 0 ? (
          <p className="px-1 py-2 text-sm text-subtle">Aucun exercice trouvé.</p>
        ) : (
          results.map((ex) => (
            <button
              key={ex.id}
              type="button"
              onClick={() => onChange(ex.id, ex.name)}
              className="flex min-h-11 w-full items-center rounded-xl bg-surface-2 px-3 py-2 text-left transition-colors hover:bg-surface-3"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm">{ex.name}</span>
                <span className="block truncate text-xs text-subtle">{ex.primaryMuscle}</span>
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
