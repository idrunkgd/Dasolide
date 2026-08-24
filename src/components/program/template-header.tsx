"use client";

import { ChevronDown, ChevronUp, Copy, Dumbbell, Timer, Trash2 } from "lucide-react";
import { Input, Select } from "@/components/ui/field";
import { DAY_LABELS } from "@/lib/constants";
import { formatDurationHuman } from "@/lib/utils";
import { estimateSeconds, totalSets, type EditorTemplate } from "./types";

/** En-tête d'une journée : nom, jour conseillé, actions et totaux en direct. */
export function TemplateHeader({
  template,
  index,
  count,
  onChange,
  onDuplicate,
  onRemove,
  onMove,
}: {
  template: EditorTemplate;
  index: number;
  count: number;
  onChange: (patch: Partial<EditorTemplate>) => void;
  onDuplicate: () => void;
  onRemove: () => void;
  onMove: (direction: -1 | 1) => void;
}) {
  const sets = totalSets(template.exercises);
  const seconds = estimateSeconds(template.exercises);

  return (
    <div className="border-b border-border p-3.5">
      <div className="flex items-center gap-2">
        <Input
          value={template.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder={`Journée ${index + 1}`}
          maxLength={60}
          aria-label={`Nom de la journée ${index + 1}`}
          className="h-11 flex-1 font-medium"
        />
        <button
          type="button"
          onClick={() => onMove(-1)}
          disabled={index === 0}
          aria-label="Monter cette journée"
          className="flex h-11 w-9 items-center justify-center rounded-xl text-subtle hover:bg-surface-2 hover:text-text disabled:opacity-30"
        >
          <ChevronUp className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => onMove(1)}
          disabled={index === count - 1}
          aria-label="Descendre cette journée"
          className="flex h-11 w-9 items-center justify-center rounded-xl text-subtle hover:bg-surface-2 hover:text-text disabled:opacity-30"
        >
          <ChevronDown className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-2 flex items-center gap-2">
        <Select
          value={template.dayOfWeek ?? ""}
          onChange={(e) =>
            onChange({ dayOfWeek: e.target.value === "" ? null : Number(e.target.value) })
          }
          aria-label="Jour de la semaine conseillé"
          className="h-11 flex-1 text-sm"
        >
          <option value="">Jour libre</option>
          {DAY_LABELS.map((label, i) => (
            <option key={label} value={i + 1}>
              {label}
            </option>
          ))}
        </Select>
        <button
          type="button"
          onClick={onDuplicate}
          aria-label="Dupliquer cette journée"
          className="flex h-11 w-11 items-center justify-center rounded-xl bg-surface-2 text-muted hover:text-text"
        >
          <Copy className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onRemove}
          disabled={count <= 1}
          aria-label="Supprimer cette journée"
          className="flex h-11 w-11 items-center justify-center rounded-xl bg-surface-2 text-muted hover:text-danger disabled:opacity-30"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div className="tabular mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-subtle">
        <span className="flex items-center gap-1">
          <Dumbbell className="h-3.5 w-3.5" />
          {template.exercises.length} exercice{template.exercises.length > 1 ? "s" : ""}
        </span>
        <span>
          {sets} série{sets > 1 ? "s" : ""}
        </span>
        <span className="flex items-center gap-1">
          <Timer className="h-3.5 w-3.5" />≈ {formatDurationHuman(seconds)}
        </span>
      </div>
    </div>
  );
}
