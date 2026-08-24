"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus, CheckCircle2, Plus, Timer, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/misc";
import { formatDurationHuman } from "@/lib/utils";
import {
  deleteProgramAction,
  saveProgramAction,
  setActiveProgramAction,
} from "@/server/actions/program";
import { ProgramMetaCard } from "./program-meta-card";
import { SaveBar } from "./save-bar";
import { TemplateEditor, duplicateTemplateLocally } from "./template-editor";
import {
  emptyTemplate,
  estimateSeconds,
  fingerprint,
  toProgramPayload,
  totalSets,
  type EditorProgram,
  type EditorTemplate,
} from "./types";

/**
 * Éditeur de programme.
 *
 * L'enregistrement est explicite : tant qu'on n'a pas appuyé sur « Enregistrer »,
 * rien ne part au serveur, et une bannière rappelle qu'il reste des
 * modifications en attente.
 */
export function ProgramEditor({
  initial,
  isActive = false,
}: {
  initial: EditorProgram;
  isActive?: boolean;
}) {
  const [program, setProgram] = useState<EditorProgram>(initial);
  const [savedPrint, setSavedPrint] = useState(() => fingerprint(initial));
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  const dirty = fingerprint(program) !== savedPrint;
  const isNew = !program.id;

  const stats = useMemo(() => {
    const exercises = program.templates.reduce((a, t) => a + t.exercises.length, 0);
    const sets = program.templates.reduce((a, t) => a + totalSets(t.exercises), 0);
    const seconds = program.templates.reduce((a, t) => a + estimateSeconds(t.exercises), 0);
    return { exercises, sets, seconds };
  }, [program]);

  // Un rechargement de page perdrait le travail en cours : on prévient.
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  function patch(patchValue: Partial<EditorProgram>) {
    setProgram((p) => ({ ...p, ...patchValue }));
  }

  function patchTemplate(key: string, patchValue: Partial<EditorTemplate>) {
    setProgram((p) => ({
      ...p,
      templates: p.templates.map((t) => (t.key === key ? { ...t, ...patchValue } : t)),
    }));
  }

  function moveTemplate(key: string, direction: -1 | 1) {
    setProgram((p) => {
      const index = p.templates.findIndex((t) => t.key === key);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= p.templates.length) return p;
      const templates = [...p.templates];
      [templates[index], templates[target]] = [templates[target], templates[index]];
      return { ...p, templates };
    });
  }

  function save() {
    if (!program.name.trim()) {
      toast.show("Donne un nom à ton programme.", "error");
      return;
    }
    startTransition(async () => {
      const res = await saveProgramAction(toProgramPayload(program));
      if (!res.ok) {
        toast.show(res.error, "error");
        return;
      }
      const data = res.data!;
      if (isNew) {
        // On rejoint l'URL du programme : l'éditeur repart des identifiants
        // réels (journées, exercices) rendus par le serveur.
        toast.show("Programme créé");
        router.replace(`/programmes/${data.id}`);
        return;
      }
      // On récupère les identifiants réels : l'éditeur reste utilisable après
      // l'ajout d'une journée, sans rechargement.
      const next: EditorProgram = {
        ...program,
        id: data.id,
        templates: program.templates.map((t, i) => ({ ...t, id: data.templateIds[i] ?? t.id })),
      };
      setProgram(next);
      setSavedPrint(fingerprint(next));
      toast.show("Programme enregistré");
      router.refresh();
    });
  }

  function activate() {
    if (!program.id) return;
    const id = program.id;
    startTransition(async () => {
      const res = await setActiveProgramAction(id);
      toast.show(res.ok ? "Programme activé et planifié" : res.error, res.ok ? "ok" : "error");
      if (res.ok) router.refresh();
    });
  }

  function remove() {
    if (!program.id) return;
    const id = program.id;
    startTransition(async () => {
      const res = await deleteProgramAction(id);
      if (res.ok) {
        toast.show("Programme supprimé");
        router.push("/programmes");
        router.refresh();
      } else {
        toast.show(res.error, "error");
      }
    });
  }

  return (
    <div className="px-4 pb-40 pt-4">
      <ProgramMetaCard program={program} onChange={patch} />

      <SectionTitle
        action={
          <span className="tabular flex items-center gap-2 text-xs text-subtle">
            <span>
              {stats.exercises} exercice{stats.exercises > 1 ? "s" : ""}
            </span>
            <span>·</span>
            <span>
              {stats.sets} série{stats.sets > 1 ? "s" : ""}
            </span>
            <span>·</span>
            <span className="flex items-center gap-1">
              <Timer className="h-3.5 w-3.5" />≈ {formatDurationHuman(stats.seconds)}
            </span>
          </span>
        }
      >
        Journées
      </SectionTitle>

      {program.templates.map((template, index) => (
        <TemplateEditor
          key={template.key}
          template={template}
          index={index}
          count={program.templates.length}
          canStart={!dirty && !isNew}
          onChange={(p) => patchTemplate(template.key, p)}
          onDuplicate={() =>
            setProgram((p) => ({
              ...p,
              templates: [
                ...p.templates.slice(0, index + 1),
                duplicateTemplateLocally(template),
                ...p.templates.slice(index + 1),
              ],
            }))
          }
          onRemove={() =>
            setProgram((p) => ({
              ...p,
              templates: p.templates.filter((t) => t.key !== template.key),
            }))
          }
          onMove={(direction) => moveTemplate(template.key, direction)}
        />
      ))}

      <Button
        type="button"
        variant="secondary"
        size="lg"
        fullWidth
        onClick={() =>
          setProgram((p) => ({ ...p, templates: [...p.templates, emptyTemplate(p.templates.length)] }))
        }
      >
        <Plus className="h-4 w-4" />
        Ajouter une journée
      </Button>

      {!isNew ? (
        <div className="mt-8 space-y-2">
          {!isActive ? (
            <Button
              type="button"
              variant="outline"
              size="lg"
              fullWidth
              onClick={activate}
              disabled={pending || dirty}
            >
              <CalendarPlus className="h-4 w-4" />
              Activer et planifier 4 semaines
            </Button>
          ) : (
            <p className="flex items-center justify-center gap-1.5 py-2 text-sm text-muted">
              <CheckCircle2 className="h-4 w-4 text-accent" />
              Programme actif
            </p>
          )}
          <Button
            type="button"
            variant="ghost"
            size="lg"
            fullWidth
            onClick={remove}
            disabled={pending}
          >
            <Trash2 className="h-4 w-4 text-danger" />
            Supprimer ce programme
          </Button>
        </div>
      ) : null}

      <SaveBar dirty={dirty} isNew={isNew} pending={pending} onSave={save} />

      {toast.node}
    </div>
  );
}
