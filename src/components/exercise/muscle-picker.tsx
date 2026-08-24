"use client";

import { Field, Select } from "@/components/ui/field";
import { cn } from "@/lib/utils";
import type { MuscleOption } from "./types";

/** Muscle principal (liste) + muscles secondaires (multi-sélection). */
export function MusclePicker({
  muscles,
  primarySlug,
  secondarySlugs,
  onPrimaryChange,
  onToggleSecondary,
  error,
}: {
  muscles: MuscleOption[];
  primarySlug: string;
  secondarySlugs: string[];
  onPrimaryChange: (slug: string) => void;
  onToggleSecondary: (slug: string) => void;
  error?: string;
}) {
  return (
    <>
      <Field label="Muscle principal" error={error}>
        <Select value={primarySlug} onChange={(e) => onPrimaryChange(e.target.value)}>
          {muscles.map((m) => (
            <option key={m.slug} value={m.slug}>
              {m.name}
            </option>
          ))}
        </Select>
      </Field>

      <div>
        <p className="mb-1.5 block text-sm font-medium text-muted">Muscles secondaires</p>
        <div className="flex flex-wrap gap-2">
          {muscles
            .filter((m) => m.slug !== primarySlug)
            .map((m) => {
              const active = secondarySlugs.includes(m.slug);
              return (
                <button
                  key={m.slug}
                  type="button"
                  onClick={() => onToggleSecondary(m.slug)}
                  aria-pressed={active}
                  className={cn(
                    "flex min-h-[2.75rem] items-center gap-2 rounded-2xl border px-3 text-sm transition-colors",
                    active
                      ? "border-accent-border bg-accent-soft text-text"
                      : "border-border bg-surface-2 text-muted"
                  )}
                >
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: m.color }}
                    aria-hidden
                  />
                  {m.name}
                </button>
              );
            })}
        </div>
      </div>
    </>
  );
}
