"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CopyPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Sheet, useToast } from "@/components/ui/misc";
import { copyDayAction } from "@/server/actions/nutrition";
import { addDays, dateKey, formatDateLong, parseDateKey } from "@/lib/utils";
import { cn } from "@/lib/utils";

/**
 * « Copier une journée » — la fonction la plus utilisée quand on mange
 * sensiblement la même chose d'un jour à l'autre (§23).
 */
export function CopyDayButton({ day }: { day: string }) {
  const [open, setOpen] = useState(false);
  const target = parseDateKey(day);
  const [source, setSource] = useState(dateKey(addDays(target, -1)));
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  const shortcuts = [
    { label: "Hier", value: dateKey(addDays(target, -1)) },
    { label: "Avant-hier", value: dateKey(addDays(target, -2)) },
    { label: "Il y a 7 jours", value: dateKey(addDays(target, -7)) },
  ];

  function copy() {
    startTransition(async () => {
      const res = await copyDayAction(source, day);
      if (res.ok) {
        setOpen(false);
        toast.show(`${res.data?.count ?? 0} lignes copiées`);
        router.refresh();
      } else {
        toast.show(res.error, "error");
      }
    });
  }

  return (
    <>
      <Button variant="secondary" fullWidth size="lg" onClick={() => setOpen(true)}>
        <CopyPlus className="h-4 w-4" />
        Copier une journée
      </Button>

      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title="Copier une journée"
        footer={
          <Button size="lg" fullWidth loading={pending} onClick={copy}>
            Copier vers cette journée
          </Button>
        }
      >
        <p className="-mt-1 mb-4 text-sm text-muted">
          Les lignes de la journée choisie seront ajoutées au{" "}
          <span className="capitalize text-text">{formatDateLong(target)}</span>.
        </p>

        <div className="mb-4 flex flex-wrap gap-2">
          {shortcuts.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => setSource(s.value)}
              className={cn(
                "min-h-[2.75rem] rounded-2xl border px-3.5 py-2 text-sm font-medium transition-colors",
                source === s.value
                  ? "border-accent-border bg-accent-soft text-text"
                  : "border-border bg-surface-2 text-muted hover:border-border-strong"
              )}
            >
              {s.label}
            </button>
          ))}
        </div>

        <Field label="Journée à copier">
          <Input type="date" value={source} onChange={(e) => setSource(e.target.value)} max={dateKey(new Date())} />
        </Field>
      </Sheet>

      {toast.node}
    </>
  );
}
