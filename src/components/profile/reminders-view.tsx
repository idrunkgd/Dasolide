"use client";

import { useEffect, useState, useTransition } from "react";
import { Bell, BellOff, Plus, Trash2 } from "lucide-react";
import {
  deleteReminderAction,
  saveReminderAction,
  toggleReminderAction,
} from "@/server/actions/settings";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { EmptyState, Sheet, useToast } from "@/components/ui/misc";
import { DAY_LABELS, DAY_SHORT, REMINDER_TYPES, type ReminderType } from "@/lib/constants";
import { cn } from "@/lib/utils";

type Reminder = {
  id: string;
  type: string;
  time: string;
  days: number[];
  message: string | null;
  enabled: boolean;
};

export function RemindersView({ reminders }: { reminders: Reminder[] }) {
  const toast = useToast();
  const [editing, setEditing] = useState<Reminder | null>(null);
  const [creating, setCreating] = useState(false);
  // Lu après le montage : `Notification` n'existe pas côté serveur, le lire
  // pendant le rendu provoquerait une divergence d'hydratation.
  const [permission, setPermission] = useState<NotificationPermission | "unsupported" | null>(null);

  useEffect(() => {
    setPermission(typeof Notification === "undefined" ? "unsupported" : Notification.permission);
  }, []);
  const [pending, startTransition] = useTransition();

  async function askPermission() {
    if (typeof Notification === "undefined") return;
    const result = await Notification.requestPermission();
    setPermission(result);
    if (result === "granted") toast.show("Notifications autorisées");
  }

  const open = creating || editing !== null;

  return (
    <div className="px-4 pt-4">
      {/* Autorisation navigateur */}
      {permission !== null && permission !== "granted" ? (
        <Card className="mb-5 border-warning/30 bg-warning/5">
          <div className="flex items-start gap-3">
            <BellOff className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
            <div className="min-w-0 flex-1">
              <p className="font-medium">
                {permission === "unsupported"
                  ? "Notifications non supportées"
                  : "Notifications non autorisées"}
              </p>
              <p className="mt-1 text-sm text-muted">
                {permission === "unsupported"
                  ? "Ce navigateur ne permet pas les notifications. Les rappels resteront visibles dans cette page."
                  : "Les rappels ne s'afficheront pas tant que le navigateur n'a pas donné son autorisation."}
              </p>
              {permission === "default" ? (
                <Button size="sm" className="mt-3" onClick={askPermission}>
                  Autoriser les notifications
                </Button>
              ) : null}
            </div>
          </div>
        </Card>
      ) : null}

      <p className="mb-4 px-1 text-xs text-subtle">
        Les rappels se déclenchent quand l&apos;application est ouverte ou installée sur ton
        téléphone. Ils ne nécessitent aucun serveur de notification.
      </p>

      {reminders.length === 0 ? (
        <EmptyState
          icon={<Bell className="h-6 w-6" />}
          title="Aucun rappel"
          description="Crée un rappel pour ton entraînement, ta pesée du matin ou ton alimentation du soir."
          action={<Button onClick={() => setCreating(true)}>Créer un rappel</Button>}
        />
      ) : (
        <div className="space-y-2">
          {reminders.map((r) => (
            <Card key={r.id} className="p-4">
              <div className="flex items-start gap-3">
                <button
                  onClick={() =>
                    startTransition(async () => {
                      await toggleReminderAction(r.id, !r.enabled);
                    })
                  }
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl transition-colors",
                    r.enabled ? "bg-accent-soft text-accent" : "bg-surface-2 text-subtle"
                  )}
                  aria-label={r.enabled ? "Désactiver" : "Activer"}
                >
                  {r.enabled ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
                </button>

                <button onClick={() => setEditing(r)} className="min-w-0 flex-1 text-left">
                  <p className={cn("font-medium", !r.enabled && "text-subtle")}>
                    {REMINDER_TYPES[r.type as ReminderType]?.label ?? r.type}
                  </p>
                  <p className="tabular text-sm text-muted">
                    {r.time} ·{" "}
                    {r.days.length === 7
                      ? "tous les jours"
                      : r.days.map((d) => DAY_SHORT[d - 1]).join(" ")}
                  </p>
                  {r.message ? (
                    <p className="mt-1 truncate text-xs text-subtle">{r.message}</p>
                  ) : null}
                </button>

                <button
                  onClick={() =>
                    startTransition(async () => {
                      await deleteReminderAction(r.id);
                      toast.show("Rappel supprimé");
                    })
                  }
                  className="rounded-xl p-2 text-subtle transition-colors hover:text-danger"
                  aria-label="Supprimer"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {reminders.length > 0 ? (
        <Button variant="secondary" fullWidth size="lg" className="mt-4" onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" />
          Nouveau rappel
        </Button>
      ) : null}

      {open ? (
        <ReminderSheet
          reminder={editing}
          pending={pending}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSave={(data) =>
            startTransition(async () => {
              const res = await saveReminderAction(data);
              if (res.ok) {
                toast.show("Rappel enregistré");
                setCreating(false);
                setEditing(null);
              } else {
                toast.show(res.error, "error");
              }
            })
          }
        />
      ) : null}

      {toast.node}
    </div>
  );
}

function ReminderSheet({
  reminder,
  pending,
  onClose,
  onSave,
}: {
  reminder: Reminder | null;
  pending: boolean;
  onClose: () => void;
  onSave: (data: unknown) => void;
}) {
  const [type, setType] = useState<ReminderType>((reminder?.type as ReminderType) ?? "entrainement");
  const [time, setTime] = useState(reminder?.time ?? REMINDER_TYPES.entrainement.defaultTime);
  const [days, setDays] = useState<number[]>(reminder?.days ?? [1, 2, 3, 4, 5]);
  const [message, setMessage] = useState(
    reminder?.message ?? REMINDER_TYPES.entrainement.defaultMessage
  );

  function changeType(next: ReminderType) {
    setType(next);
    if (!reminder) {
      setTime(REMINDER_TYPES[next].defaultTime);
      setMessage(REMINDER_TYPES[next].defaultMessage);
    }
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title={reminder ? "Modifier le rappel" : "Nouveau rappel"}
      footer={
        <Button
          fullWidth
          size="lg"
          loading={pending}
          disabled={days.length === 0}
          onClick={() =>
            onSave({
              id: reminder?.id,
              type,
              time,
              days,
              message: message.trim() || null,
              enabled: reminder?.enabled ?? true,
            })
          }
        >
          Enregistrer
        </Button>
      }
    >
      <div className="space-y-4">
        <Field label="Type de rappel">
          <Select value={type} onChange={(e) => changeType(e.target.value as ReminderType)}>
            {Object.entries(REMINDER_TYPES).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Heure">
          <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        </Field>

        <Field label="Jours">
          <div className="grid grid-cols-7 gap-1.5">
            {DAY_SHORT.map((d, i) => {
              const day = i + 1;
              const active = days.includes(day);
              return (
                <button
                  key={day}
                  type="button"
                  aria-label={DAY_LABELS[i]}
                  aria-pressed={active}
                  onClick={() =>
                    setDays(
                      active ? days.filter((x) => x !== day) : [...days, day].sort((a, b) => a - b)
                    )
                  }
                  className={cn(
                    "h-12 rounded-2xl border text-sm font-semibold transition-all active:scale-95",
                    active
                      ? "border-accent-border bg-accent-soft text-accent"
                      : "border-border bg-surface-2 text-subtle"
                  )}
                >
                  {d}
                </button>
              );
            })}
          </div>
        </Field>

        <Field label="Message">
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={2}
            maxLength={200}
          />
        </Field>
      </div>
    </Sheet>
  );
}
