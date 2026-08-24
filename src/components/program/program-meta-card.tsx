"use client";

import { Card } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { PROGRAM_TYPES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { EditorProgram } from "./types";

/** Palette volontairement courte : la couleur sert à repérer le programme dans le planning. */
export const PROGRAM_COLORS = [
  { value: "#a3e635", label: "Lime" },
  { value: "#fb923c", label: "Orange" },
  { value: "#a78bfa", label: "Violet" },
  { value: "#22d3ee", label: "Cyan" },
  { value: "#fb7185", label: "Rose" },
  { value: "#60a5fa", label: "Bleu" },
];

export function ProgramMetaCard({
  program,
  onChange,
}: {
  program: EditorProgram;
  onChange: (patch: Partial<EditorProgram>) => void;
}) {
  return (
    <Card className="mb-5 space-y-4">
      <Field label="Nom du programme">
        <Input
          value={program.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="Push / Pull / Legs"
          maxLength={80}
          required
        />
      </Field>

      <Field label="Description (facultatif)">
        <Textarea
          value={program.description}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder="4 séances par semaine, chaque muscle sollicité deux fois."
          maxLength={1000}
          rows={2}
          className="min-h-16"
        />
      </Field>

      <Field label="Type de programme">
        <Select value={program.type} onChange={(e) => onChange({ type: e.target.value })}>
          {Object.entries(PROGRAM_TYPES).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </Select>
      </Field>

      <div>
        <p className="mb-1.5 block text-sm font-medium text-muted">Couleur</p>
        <div className="flex flex-wrap gap-2">
          {PROGRAM_COLORS.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => onChange({ color: c.value })}
              aria-label={c.label}
              aria-pressed={program.color === c.value}
              className={cn(
                "h-11 w-11 rounded-2xl transition-transform active:scale-95",
                program.color === c.value
                  ? "ring-2 ring-text ring-offset-2 ring-offset-surface"
                  : "opacity-70"
              )}
              style={{ backgroundColor: c.value }}
            />
          ))}
        </div>
      </div>
    </Card>
  );
}
