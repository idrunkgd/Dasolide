import type { Suggestion } from "@/lib/progression";
import type { SetType } from "@/lib/constants";

export type SessionSetState = {
  id: string;
  setNumber: number;
  type: SetType;
  weightKg: number | null;
  reps: number | null;
  rpe: number | null;
  rir: number | null;
  durationSec: number | null;
  distanceM: number | null;
  avgHr: number | null;
  calories: number | null;
  completed: boolean;
  notes: string | null;
};

export type LastPerformance = {
  date: string;
  sets: {
    type: string;
    weightKg: number | null;
    reps: number | null;
    rpe: number | null;
    durationSec: number | null;
    distanceM: number | null;
  }[];
};

export type SessionExerciseState = {
  id: string;
  exerciseId: string;
  name: string;
  category: string;
  equipment: string;
  trackingType: string;
  primaryMuscle: string;
  sortOrder: number;
  restSeconds: number;
  supersetGroup: string | null;
  notes: string | null;
  permanentNote: string | null;
  targetRepsMin: number | null;
  targetRepsMax: number | null;
  targetRpe: number | null;
  increment: number;
  suggestion: Suggestion | null;
  lastPerformance: LastPerformance | null;
  sets: SessionSetState[];
};

export type SessionSettings = {
  weightUnit: "kg" | "lb";
  defaultRestSeconds: number;
  autoStartRestTimer: boolean;
  restTimerVibrate: boolean;
  restTimerSound: boolean;
  keepScreenAwake: boolean;
  showRpe: boolean;
  showRir: boolean;
};
