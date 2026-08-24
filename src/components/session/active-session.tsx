"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  CloudOff,
  Link2,
  MoreVertical,
  Plus,
  Repeat,
  StickyNote,
  Trash2,
  X,
} from "lucide-react";
import { syncSessionAction, cancelSessionAction } from "@/server/actions/session";
import { Button } from "@/components/ui/button";
import { Sheet, useToast } from "@/components/ui/misc";
import { RestTimer } from "@/components/session/rest-timer";
import { SetRow } from "@/components/session/set-row";
import { ExercisePicker } from "@/components/session/exercise-picker";
import { FinishSheet } from "@/components/session/finish-sheet";
import { ExerciseNoteSheet } from "@/components/session/exercise-note-sheet";
import type { SessionExerciseState, SessionSetState, SessionSettings } from "./types";
import { clearLocalSession, loadLocalSession, pruneLocalSessions, saveLocalSession } from "@/lib/session-storage";
import { APP_TIMEZONE, cn, formatDuration, formatWeightValue } from "@/lib/utils";
import { setVolume } from "@/lib/calc";

const SYNC_INTERVAL_MS = 8000;

export function ActiveSession({
  sessionId,
  name,
  startedAt,
  initialDuration,
  initialExercises,
  settings,
}: {
  sessionId: string;
  name: string;
  startedAt: string;
  initialDuration: number;
  initialExercises: SessionExerciseState[];
  settings: SessionSettings;
}) {
  const router = useRouter();
  const toast = useToast();

  // --- État principal -------------------------------------------------------
  const [exercises, setExercises] = useState<SessionExerciseState[]>(initialExercises);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [elapsed, setElapsed] = useState(initialDuration);
  const [restKey, setRestKey] = useState(0);
  const [restSeconds, setRestSeconds] = useState<number | null>(null);
  const [dirty, setDirty] = useState(false);
  const [online, setOnline] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [pickerMode, setPickerMode] = useState<"add" | "replace" | null>(null);
  const [noteOpen, setNoteOpen] = useState(false);
  const [finishOpen, setFinishOpen] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [, startTransition] = useTransition();

  const startedAtMs = useMemo(() => new Date(startedAt).getTime(), [startedAt]);
  const current = exercises[currentIndex] ?? null;

  // --- Reprise depuis le stockage local ------------------------------------
  useEffect(() => {
    pruneLocalSessions();
    const local = loadLocalSession(sessionId);
    if (local?.dirty && local.exercises.length > 0) {
      setExercises(local.exercises);
      setCurrentIndex(Math.min(local.currentIndex, local.exercises.length - 1));
      setDirty(true);
      toast.show("Séance restaurée depuis cet appareil");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  // --- Chronomètre ----------------------------------------------------------
  useEffect(() => {
    const tick = () => setElapsed(Math.floor((Date.now() - startedAtMs) / 1000));
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [startedAtMs]);

  // --- État réseau ----------------------------------------------------------
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  // --- Écran allumé ---------------------------------------------------------
  useEffect(() => {
    if (!settings.keepScreenAwake) return;
    let lock: WakeLockSentinel | null = null;
    const request = async () => {
      try {
        lock = await navigator.wakeLock?.request("screen");
      } catch {
        /* non supporté : sans effet */
      }
    };
    void request();
    const onVisible = () => {
      if (document.visibilityState === "visible") void request();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      void lock?.release().catch(() => undefined);
    };
  }, [settings.keepScreenAwake]);

  // --- Persistance locale à chaque changement ------------------------------
  const persistLocal = useCallback(
    (next: SessionExerciseState[], index = currentIndex, isDirty = true) => {
      saveLocalSession({
        sessionId,
        exercises: next,
        durationSeconds: Math.floor((Date.now() - startedAtMs) / 1000),
        currentIndex: index,
        updatedAt: Date.now(),
        dirty: isDirty,
      });
    },
    [sessionId, startedAtMs, currentIndex]
  );

  const update = useCallback(
    (updater: (prev: SessionExerciseState[]) => SessionExerciseState[]) => {
      setExercises((prev) => {
        const next = updater(prev);
        persistLocal(next);
        return next;
      });
      setDirty(true);
    },
    [persistLocal]
  );

  // --- Synchronisation serveur ---------------------------------------------
  const exercisesRef = useRef(exercises);
  exercisesRef.current = exercises;
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;
  const syncingRef = useRef(false);

  const sync = useCallback(async () => {
    if (syncingRef.current || !dirtyRef.current) return;
    if (typeof navigator !== "undefined" && !navigator.onLine) return;

    syncingRef.current = true;
    const snapshot = exercisesRef.current;
    try {
      const result = await syncSessionAction({
        sessionId,
        durationSeconds: Math.floor((Date.now() - startedAtMs) / 1000),
        exercises: snapshot.map((e) => ({
          id: e.id,
          exerciseId: e.exerciseId,
          sortOrder: e.sortOrder,
          notes: e.notes,
          restSeconds: e.restSeconds,
          supersetGroup: e.supersetGroup,
          sets: e.sets.map((s) => ({
            setNumber: s.setNumber,
            type: s.type,
            weightKg: s.weightKg,
            reps: s.reps,
            rpe: s.rpe,
            rir: s.rir,
            durationSec: s.durationSec,
            distanceM: s.distanceM,
            avgHr: s.avgHr,
            calories: s.calories,
            completed: s.completed,
            notes: s.notes,
          })),
        })),
      });

      if (result.ok) {
        const idMap = result.data?.ids ?? {};
        if (Object.keys(idMap).length > 0) {
          setExercises((prev) => prev.map((e) => (idMap[e.id] ? { ...e, id: idMap[e.id] } : e)));
        }
        setDirty(false);
        persistLocal(exercisesRef.current, currentIndex, false);
      }
    } catch {
      /* hors ligne : on retentera au prochain cycle */
    } finally {
      syncingRef.current = false;
    }
  }, [sessionId, startedAtMs, persistLocal, currentIndex]);

  useEffect(() => {
    const timer = window.setInterval(() => void sync(), SYNC_INTERVAL_MS);
    const onVisible = () => {
      if (document.visibilityState === "hidden") void sync();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", () => void sync());
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [sync]);

  // --- Actions sur les séries ----------------------------------------------
  function patchSet(exIndex: number, setId: string, patch: Partial<SessionSetState>) {
    update((prev) =>
      prev.map((e, i) =>
        i !== exIndex
          ? e
          : { ...e, sets: e.sets.map((s) => (s.id === setId ? { ...s, ...patch } : s)) }
      )
    );
  }

  function toggleSetCompleted(exIndex: number, setId: string) {
    const ex = exercises[exIndex];
    const set = ex?.sets.find((s) => s.id === setId);
    if (!ex || !set) return;

    const willComplete = !set.completed;

    // Une série validée doit avoir une valeur : on reprend la suggestion.
    const patch: Partial<SessionSetState> = { completed: willComplete };
    if (willComplete) {
      if (ex.trackingType === "weight_reps" && set.reps == null) {
        patch.reps = ex.targetRepsMax ?? ex.targetRepsMin ?? 10;
      }
      if (ex.trackingType === "reps_only" && set.reps == null) {
        patch.reps = ex.targetRepsMax ?? 10;
      }
    }
    patchSet(exIndex, setId, patch);

    if (willComplete && settings.autoStartRestTimer && set.type !== "W") {
      startRest(ex.restSeconds);
    }
    if (willComplete && settings.restTimerVibrate) {
      try {
        navigator.vibrate?.(35);
      } catch {
        /* non supporté */
      }
    }
  }

  function startRest(seconds: number) {
    setRestSeconds(seconds);
    setRestKey((k) => k + 1);
  }

  function addSet(exIndex: number) {
    update((prev) =>
      prev.map((e, i) => {
        if (i !== exIndex) return e;
        const last = e.sets.filter((s) => s.type !== "W").at(-1) ?? e.sets.at(-1);
        return {
          ...e,
          sets: [
            ...e.sets,
            {
              id: `tmp_${Math.random().toString(36).slice(2, 10)}`,
              setNumber: e.sets.length + 1,
              type: "N",
              weightKg: last?.weightKg ?? null,
              reps: null,
              rpe: null,
              rir: null,
              durationSec: null,
              distanceM: null,
              avgHr: null,
              calories: null,
              completed: false,
              notes: null,
            },
          ],
        };
      })
    );
  }

  function removeSet(exIndex: number, setId: string) {
    update((prev) =>
      prev.map((e, i) => {
        if (i !== exIndex) return e;
        const sets = e.sets.filter((s) => s.id !== setId).map((s, idx) => ({ ...s, setNumber: idx + 1 }));
        return { ...e, sets };
      })
    );
  }

  function removeExercise(exIndex: number) {
    update((prev) => prev.filter((_, i) => i !== exIndex).map((e, i) => ({ ...e, sortOrder: i })));
    setCurrentIndex((i) => Math.max(0, Math.min(i, exercises.length - 2)));
    setMenuOpen(false);
  }

  function handlePicked(picked: {
    id: string;
    name: string;
    category: string;
    equipment: string;
    trackingType: string;
    primaryMuscle: string;
  }) {
    if (pickerMode === "replace" && current) {
      update((prev) =>
        prev.map((e, i) =>
          i !== currentIndex
            ? e
            : {
                ...e,
                exerciseId: picked.id,
                name: picked.name,
                category: picked.category,
                equipment: picked.equipment,
                trackingType: picked.trackingType,
                primaryMuscle: picked.primaryMuscle,
                permanentNote: null,
                lastPerformance: null,
                suggestion: null,
                sets: e.sets.map((s) => ({ ...s, completed: false, weightKg: null, reps: null })),
              }
        )
      );
      toast.show(`Remplacé par ${picked.name}`);
    } else {
      update((prev) => [
        ...prev,
        {
          id: `tmp_${Math.random().toString(36).slice(2, 10)}`,
          exerciseId: picked.id,
          name: picked.name,
          category: picked.category,
          equipment: picked.equipment,
          trackingType: picked.trackingType,
          primaryMuscle: picked.primaryMuscle,
          sortOrder: prev.length,
          restSeconds: settings.defaultRestSeconds,
          supersetGroup: null,
          notes: null,
          permanentNote: null,
          targetRepsMin: 8,
          targetRepsMax: 12,
          targetRpe: null,
          increment: 2.5,
          suggestion: null,
          lastPerformance: null,
          sets: Array.from({ length: 3 }, (_, idx) => ({
            id: `tmp_${Math.random().toString(36).slice(2, 10)}`,
            setNumber: idx + 1,
            type: "N" as const,
            weightKg: null,
            reps: null,
            rpe: null,
            rir: null,
            durationSec: null,
            distanceM: null,
            avgHr: null,
            calories: null,
            completed: false,
            notes: null,
          })),
        },
      ]);
      setCurrentIndex(exercises.length);
      toast.show(`${picked.name} ajouté`);
    }
    setPickerMode(null);
    setMenuOpen(false);
  }

  function cancelSession() {
    startTransition(async () => {
      await cancelSessionAction(sessionId);
      clearLocalSession(sessionId);
      router.push("/");
    });
  }

  // --- Indicateurs ----------------------------------------------------------
  const totals = useMemo(() => {
    const all = exercises.flatMap((e) => e.sets);
    const done = all.filter((s) => s.completed);
    const working = done.filter((s) => s.type !== "W");
    return {
      done: done.length,
      total: all.length,
      volume: working.reduce((a, s) => a + setVolume(s), 0),
      sets: working.length,
      reps: working.reduce((a, s) => a + (s.reps ?? 0), 0),
    };
  }, [exercises]);

  const progress = totals.total > 0 ? totals.done / totals.total : 0;
  const nextExercise = exercises[currentIndex + 1] ?? null;

  // Enchaînement automatique des supersets (§10)
  const supersetPartners = useMemo(() => {
    if (!current?.supersetGroup) return [];
    return exercises.filter((e) => e.supersetGroup === current.supersetGroup && e.id !== current.id);
  }, [current, exercises]);

  if (!current) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-muted">Cette séance ne contient aucun exercice.</p>
        <Button onClick={() => setPickerMode("add")}>
          <Plus className="h-4 w-4" /> Ajouter un exercice
        </Button>
        <button onClick={cancelSession} className="text-sm text-subtle underline">
          Abandonner la séance
        </button>
        {pickerMode ? (
          <ExercisePicker
            mode="add"
            currentExerciseId={null}
            onClose={() => setPickerMode(null)}
            onPick={handlePicked}
          />
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      {/* ===================================================== En-tête fixe */}
      <header
        className="sticky top-0 z-30 border-b border-border bg-bg/95 backdrop-blur-xl"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="flex items-center gap-2 px-4 py-3">
          <button
            onClick={() => setConfirmCancel(true)}
            className="-ml-2 rounded-xl p-2 text-muted hover:bg-surface-2 hover:text-text"
            aria-label="Quitter la séance"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="min-w-0 flex-1 text-center">
            <p className="truncate text-sm font-semibold">{name}</p>
            <p className="tabular text-xs text-subtle">
              {formatDuration(elapsed)} · {totals.done}/{totals.total} séries
            </p>
          </div>

          {!online || dirty ? (
            <span
              className="rounded-lg p-2 text-subtle"
              title={online ? "Enregistrement en cours" : "Hors ligne — tout est gardé sur l'appareil"}
            >
              <CloudOff className={cn("h-4 w-4", !online && "text-warning")} />
            </span>
          ) : null}

          <button
            onClick={() => setMenuOpen(true)}
            className="-mr-2 rounded-xl p-2 text-muted hover:bg-surface-2 hover:text-text"
            aria-label="Options de la séance"
          >
            <MoreVertical className="h-5 w-5" />
          </button>
        </div>

        <div className="h-1 bg-surface-2">
          <div
            className="h-full bg-accent transition-[width] duration-500"
            style={{ width: `${progress * 100}%` }}
          />
        </div>

        {/* Navigation entre exercices */}
        <div className="no-scrollbar flex gap-1.5 overflow-x-auto px-4 py-2.5">
          {exercises.map((e, i) => {
            const done = e.sets.length > 0 && e.sets.every((s) => s.completed);
            return (
              <button
                key={e.id}
                onClick={() => setCurrentIndex(i)}
                className={cn(
                  "shrink-0 rounded-xl px-3 py-1.5 text-xs font-medium transition-colors",
                  i === currentIndex
                    ? "bg-accent text-accent-contrast"
                    : done
                      ? "bg-success/15 text-success"
                      : "bg-surface-2 text-muted"
                )}
              >
                {done && i !== currentIndex ? <Check className="mr-1 inline h-3 w-3" /> : null}
                {i + 1}. {e.name.length > 18 ? `${e.name.slice(0, 17)}…` : e.name}
              </button>
            );
          })}
        </div>
      </header>

      {/* ================================================== Exercice courant */}
      <main className="flex-1 px-4 pb-40 pt-4">
        <div key={current.id} className="animate-fade-in">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-2xl font-bold leading-tight">{current.name}</h1>
              <p className="mt-1 text-sm text-muted">
                {current.primaryMuscle}
                {current.targetRepsMin ? (
                  <>
                    {" · "}
                    <span className="tabular">
                      {current.sets.filter((s) => s.type !== "W").length} × {current.targetRepsMin}
                      {current.targetRepsMax && current.targetRepsMax !== current.targetRepsMin
                        ? `-${current.targetRepsMax}`
                        : ""}
                    </span>
                  </>
                ) : null}
              </p>
            </div>
            <button
              onClick={() => setNoteOpen(true)}
              className={cn(
                "shrink-0 rounded-xl p-2.5 transition-colors",
                current.permanentNote ? "bg-accent-soft text-accent" : "bg-surface-2 text-muted"
              )}
              aria-label="Note sur l'exercice"
            >
              <StickyNote className="h-4 w-4" />
            </button>
          </div>

          {current.supersetGroup ? (
            <div className="mt-3 flex items-center gap-2 rounded-2xl border border-accent-border bg-accent-soft px-3.5 py-2.5 text-sm">
              <Link2 className="h-4 w-4 shrink-0 text-accent" />
              <span className="min-w-0">
                Superset {current.supersetGroup}
                {supersetPartners.length > 0 ? (
                  <span className="text-muted"> avec {supersetPartners.map((p) => p.name).join(", ")}</span>
                ) : null}
              </span>
            </div>
          ) : null}

          {/* Note permanente (§33) */}
          {current.permanentNote ? (
            <p className="mt-3 rounded-2xl border border-border bg-surface-2 px-3.5 py-2.5 text-sm text-muted">
              {current.permanentNote}
            </p>
          ) : null}

          {/* Dernière performance (§8) */}
          {current.lastPerformance ? (
            <div className="mt-4 rounded-2xl border border-border bg-surface p-3.5">
              <p className="text-xs font-medium uppercase tracking-wider text-subtle">
                Dernière séance ·{" "}
                {new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", timeZone: APP_TIMEZONE }).format(
                  new Date(current.lastPerformance.date)
                )}
              </p>
              <div className="tabular mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                {current.lastPerformance.sets
                  .filter((s) => s.type !== "W")
                  .map((s, i) => (
                    <span key={i} className="text-muted">
                      {s.weightKg != null
                        ? `${formatWeightValue(s.weightKg, settings.weightUnit)} ${settings.weightUnit}`
                        : ""}
                      {s.weightKg != null && s.reps != null ? " × " : ""}
                      {s.reps != null ? `${s.reps}` : ""}
                      {s.durationSec != null ? `${s.durationSec}s` : ""}
                    </span>
                  ))}
              </div>
            </div>
          ) : null}

          {/* Suggestion de progression (§13) */}
          {current.suggestion && current.suggestion.action !== "premiere_fois" ? (
            <div className="mt-3 flex items-start gap-2.5 rounded-2xl border border-border bg-surface-2 px-3.5 py-2.5">
              <span
                className={cn(
                  "mt-0.5 shrink-0 rounded-lg px-1.5 py-0.5 text-[0.65rem] font-bold uppercase",
                  current.suggestion.action === "augmenter"
                    ? "bg-success/20 text-success"
                    : current.suggestion.action === "reduire"
                      ? "bg-warning/20 text-warning"
                      : "bg-surface-3 text-muted"
                )}
              >
                {current.suggestion.action === "augmenter"
                  ? "+"
                  : current.suggestion.action === "reduire"
                    ? "−"
                    : "="}
              </span>
              <div className="min-w-0 text-sm">
                <p>
                  Suggestion :{" "}
                  <span className="tabular font-semibold">
                    {formatWeightValue(current.suggestion.weightKg, settings.weightUnit)}{" "}
                    {settings.weightUnit}
                  </span>
                </p>
                <p className="mt-0.5 text-xs text-subtle">{current.suggestion.reason}</p>
              </div>
            </div>
          ) : null}

          {/* ------------------------------------------------------ Séries */}
          <div className="mt-5">
            <div className="mb-2 grid grid-cols-[2.25rem_1fr_1fr_auto] items-center gap-2 px-1 text-[0.7rem] font-medium uppercase tracking-wider text-subtle">
              <span>Série</span>
              <span>
                {current.trackingType === "duration"
                  ? "Durée"
                  : current.trackingType === "distance_duration"
                    ? "Distance"
                    : `Poids (${settings.weightUnit})`}
              </span>
              <span>{current.trackingType === "distance_duration" ? "Durée" : "Reps"}</span>
              <span className="w-11 text-center">OK</span>
            </div>

            <div className="space-y-2">
              {current.sets.map((set) => (
                <SetRow
                  key={set.id}
                  set={set}
                  exercise={current}
                  settings={settings}
                  onPatch={(patch) => patchSet(currentIndex, set.id, patch)}
                  onToggle={() => toggleSetCompleted(currentIndex, set.id)}
                  onRemove={() => removeSet(currentIndex, set.id)}
                />
              ))}
            </div>

            <div className="mt-3 flex gap-2">
              <Button variant="secondary" size="md" className="flex-1" onClick={() => addSet(currentIndex)}>
                <Plus className="h-4 w-4" />
                Ajouter une série
              </Button>
              <Button variant="secondary" size="md" onClick={() => setPickerMode("replace")}>
                <Repeat className="h-4 w-4" />
                Remplacer
              </Button>
            </div>
          </div>

          {/* Repos manuel */}
          <button
            onClick={() => startRest(current.restSeconds)}
            className="tabular mt-4 w-full rounded-2xl border border-border bg-surface-2 py-3 text-sm text-muted transition-colors hover:text-text"
          >
            Lancer le repos ({Math.floor(current.restSeconds / 60)}:
            {String(current.restSeconds % 60).padStart(2, "0")})
          </button>
        </div>
      </main>

      {/* ============================================= Barre d'action basse */}
      <div
        className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-2xl border-t border-border bg-bg-elevated/95 px-4 py-3 backdrop-blur-xl"
        style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
      >
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
            disabled={currentIndex === 0}
            className="rounded-2xl bg-surface-2 p-3 text-muted disabled:opacity-30"
            aria-label="Exercice précédent"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          {nextExercise ? (
            <button
              onClick={() => setCurrentIndex((i) => i + 1)}
              className="flex min-w-0 flex-1 items-center justify-between gap-2 rounded-2xl bg-surface-2 px-4 py-3 text-left"
            >
              <span className="min-w-0">
                <span className="block text-[0.65rem] uppercase tracking-wider text-subtle">Suivant</span>
                <span className="block truncate text-sm font-medium">{nextExercise.name}</span>
              </span>
              <ChevronRight className="h-5 w-5 shrink-0 text-subtle" />
            </button>
          ) : (
            <Button size="lg" className="flex-1" onClick={() => setFinishOpen(true)}>
              Terminer la séance
            </Button>
          )}

          {nextExercise ? (
            <Button size="lg" variant="secondary" onClick={() => setFinishOpen(true)}>
              Terminer
            </Button>
          ) : null}
        </div>
      </div>

      {/* ================================================== Timer de repos */}
      {restSeconds != null ? (
        <RestTimer
          key={restKey}
          seconds={restSeconds}
          vibrate={settings.restTimerVibrate}
          sound={settings.restTimerSound}
          onDone={() => setRestSeconds(null)}
          onSkip={() => setRestSeconds(null)}
        />
      ) : null}

      {/* ========================================================== Feuilles */}
      <Sheet open={menuOpen} onClose={() => setMenuOpen(false)} title="Options">
        <div className="space-y-1">
          <MenuItem
            icon={<Plus className="h-4 w-4" />}
            label="Ajouter un exercice"
            onClick={() => setPickerMode("add")}
          />
          <MenuItem
            icon={<Repeat className="h-4 w-4" />}
            label="Remplacer l'exercice courant"
            onClick={() => setPickerMode("replace")}
          />
          <MenuItem
            icon={<Link2 className="h-4 w-4" />}
            label={current.supersetGroup ? "Retirer du superset" : "Mettre en superset avec le suivant"}
            onClick={() => {
              const group = current.supersetGroup ? null : "A";
              update((prev) =>
                prev.map((e, i) =>
                  i === currentIndex || (group && i === currentIndex + 1)
                    ? { ...e, supersetGroup: group }
                    : e
                )
              );
              setMenuOpen(false);
            }}
          />
          <MenuItem
            icon={<Trash2 className="h-4 w-4" />}
            label="Retirer cet exercice"
            tone="danger"
            onClick={() => removeExercise(currentIndex)}
          />
        </div>

        <div className="mt-5 border-t border-border pt-4">
          <p className="text-xs uppercase tracking-wider text-subtle">Repos pour cet exercice</p>
          <div className="mt-2 flex gap-2">
            {[60, 90, 120, 180, 240].map((s) => (
              <button
                key={s}
                onClick={() =>
                  update((prev) =>
                    prev.map((e, i) => (i === currentIndex ? { ...e, restSeconds: s } : e))
                  )
                }
                className={cn(
                  "tabular flex-1 rounded-xl py-2 text-sm",
                  current.restSeconds === s ? "bg-accent text-accent-contrast" : "bg-surface-2 text-muted"
                )}
              >
                {s < 60 ? `${s}s` : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`}
              </button>
            ))}
          </div>
        </div>
      </Sheet>

      {pickerMode ? (
        <ExercisePicker
          mode={pickerMode}
          currentExerciseId={pickerMode === "replace" ? current.exerciseId : null}
          onClose={() => setPickerMode(null)}
          onPick={handlePicked}
        />
      ) : null}

      <ExerciseNoteSheet
        open={noteOpen}
        onClose={() => setNoteOpen(false)}
        exerciseId={current.exerciseId}
        exerciseName={current.name}
        initialNote={current.permanentNote}
        onSaved={(content) =>
          update((prev) =>
            prev.map((e, i) => (i === currentIndex ? { ...e, permanentNote: content || null } : e))
          )
        }
      />

      <FinishSheet
        open={finishOpen}
        onClose={() => setFinishOpen(false)}
        sessionId={sessionId}
        name={name}
        elapsed={elapsed}
        totals={totals}
        muscles={[...new Set(exercises.map((e) => e.category))]}
        beforeFinish={sync}
        onFinished={() => clearLocalSession(sessionId)}
        settings={settings}
      />

      <Sheet open={confirmCancel} onClose={() => setConfirmCancel(false)} title="Quitter la séance">
        <p className="text-sm text-muted">
          Ta progression est enregistrée automatiquement. Tu peux fermer et reprendre plus tard.
        </p>
        <div className="mt-5 space-y-2">
          <Button
            fullWidth
            size="lg"
            onClick={() => {
              void sync();
              router.push("/");
            }}
          >
            Mettre en pause et sortir
          </Button>
          <Button variant="secondary" fullWidth size="lg" onClick={() => setConfirmCancel(false)}>
            Continuer la séance
          </Button>
          <Button variant="ghost" fullWidth size="md" onClick={cancelSession} className="text-danger">
            Abandonner et supprimer
          </Button>
        </div>
      </Sheet>

      {toast.node}
    </div>
  );
}

function MenuItem({
  icon,
  label,
  onClick,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  tone?: "danger";
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-2xl px-3 py-3.5 text-left text-[0.95rem] transition-colors hover:bg-surface-2",
        tone === "danger" ? "text-danger" : "text-text"
      )}
    >
      <span className="text-muted">{icon}</span>
      {label}
    </button>
  );
}
