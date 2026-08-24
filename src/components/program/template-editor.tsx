"use client";

import { useState } from "react";
import {
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { restrictToParentElement, restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Dumbbell, Plus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/misc";
import { StartSessionButton } from "@/components/session/start-session-button";
import { SortableExerciseRow } from "./sortable-exercise-row";
import { ExerciseSettingsSheet } from "./exercise-settings-sheet";
import { ExerciseSearchSheet } from "./exercise-search-sheet";
import { TemplateHeader } from "./template-header";
import { emptyExercise, makeKey, type EditorExercise, type EditorTemplate } from "./types";

/** Une journée du programme : en-tête, liste réordonnable, résumé en direct. */
export function TemplateEditor({
  template,
  index,
  count,
  canStart,
  onChange,
  onDuplicate,
  onRemove,
  onMove,
}: {
  template: EditorTemplate;
  index: number;
  count: number;
  /** La journée existe en base et rien n'est en attente d'enregistrement. */
  canStart: boolean;
  onChange: (patch: Partial<EditorTemplate>) => void;
  onDuplicate: () => void;
  onRemove: () => void;
  onMove: (direction: -1 | 1) => void;
}) {
  const [picking, setPicking] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 4 } }),
    // Délai court : le glissement démarre à l'appui long, le défilement reste
    // possible d'un simple balayage.
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const editing = template.exercises.find((e) => e.key === editingKey) ?? null;

  function patchExercise(key: string, patch: Partial<EditorExercise>) {
    onChange({
      exercises: template.exercises.map((e) => (e.key === key ? { ...e, ...patch } : e)),
    });
  }

  function removeExercise(key: string) {
    onChange({ exercises: template.exercises.filter((e) => e.key !== key) });
  }

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = template.exercises.findIndex((e) => e.key === active.id);
    const to = template.exercises.findIndex((e) => e.key === over.id);
    if (from < 0 || to < 0) return;
    onChange({ exercises: arrayMove(template.exercises, from, to) });
  }

  return (
    <Card className="mb-4 p-0">
      <TemplateHeader
        template={template}
        index={index}
        count={count}
        onChange={onChange}
        onDuplicate={onDuplicate}
        onRemove={onRemove}
        onMove={onMove}
      />

      <div className="p-3.5">
        {template.exercises.length === 0 ? (
          <EmptyState
            className="py-6"
            icon={<Dumbbell className="h-5 w-5" />}
            title="Journée vide"
            description="Ajoute les exercices de cette séance."
          />
        ) : (
          <DndContext
            // Identifiant explicite : sans lui, dnd-kit numérote ses libellés
            // d'accessibilité avec un compteur global et le rendu serveur ne
            // correspond plus à celui du client (erreur d'hydratation).
            id={`journee-${template.key}`}
            sensors={sensors}
            collisionDetection={closestCenter}
            modifiers={[restrictToVerticalAxis, restrictToParentElement]}
            onDragEnd={onDragEnd}
          >
            <SortableContext
              items={template.exercises.map((e) => e.key)}
              strategy={verticalListSortingStrategy}
            >
              <ul className="space-y-2">
                {template.exercises.map((exercise, i) => (
                  <SortableExerciseRow
                    key={exercise.key}
                    exercise={exercise}
                    index={i}
                    sameGroupAsPrevious={
                      i > 0 &&
                      exercise.supersetGroup != null &&
                      template.exercises[i - 1].supersetGroup === exercise.supersetGroup
                    }
                    onOpen={() => setEditingKey(exercise.key)}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        )}

        <Button
          type="button"
          variant="secondary"
          fullWidth
          className="mt-3"
          onClick={() => setPicking(true)}
        >
          <Plus className="h-4 w-4" />
          Ajouter un exercice
        </Button>

        {canStart && template.id ? (
          <StartSessionButton
            templateId={template.id}
            label="Démarrer cette journée"
            variant="outline"
            fullWidth
            className="mt-2"
          />
        ) : null}
      </div>

      {editing ? (
        <ExerciseSettingsSheet
          exercise={editing}
          onChange={(patch) => patchExercise(editing.key, patch)}
          onRemove={() => removeExercise(editing.key)}
          onClose={() => setEditingKey(null)}
        />
      ) : null}

      {picking ? (
        <ExerciseSearchSheet
          title={`Ajouter à « ${template.name || `Journée ${index + 1}`} »`}
          addedIds={template.exercises.map((e) => e.exerciseId)}
          onAdd={(found) =>
            onChange({
              exercises: [
                ...template.exercises,
                emptyExercise({
                  id: found.id,
                  name: found.name,
                  primaryMuscle: found.primaryMuscle,
                  equipment: found.equipment,
                }),
              ],
            })
          }
          onClose={() => setPicking(false)}
        />
      ) : null}
    </Card>
  );
}

/** Copie locale d'une journée — les clés sont régénérées pour rester uniques. */
export function duplicateTemplateLocally(template: EditorTemplate): EditorTemplate {
  return {
    ...template,
    key: makeKey("day"),
    id: undefined,
    name: `${template.name} (copie)`.slice(0, 60),
    dayOfWeek: null,
    exercises: template.exercises.map((e) => ({ ...e, key: makeKey("ex") })),
  };
}
