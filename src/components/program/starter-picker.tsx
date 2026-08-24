"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/misc";
import { createFromStarterAction } from "@/server/actions/program";

export type StarterOption = {
  key: string;
  name: string;
  description: string;
  sessionsPerWeek: number;
  days: string[];
};

/** « Partir d'un modèle » : un appui crée le programme et planifie 4 semaines. */
export function StarterPicker({ options }: { options: StarterOption[] }) {
  const [pending, startTransition] = useTransition();
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const router = useRouter();
  const toast = useToast();

  function create(key: string) {
    setBusyKey(key);
    startTransition(async () => {
      const res = await createFromStarterAction(key);
      if (res.ok && res.data) {
        toast.show("Programme créé et activé");
        router.push(`/programmes/${res.data.id}`);
        router.refresh();
      } else {
        toast.show(res.ok ? "Programme créé" : res.error, res.ok ? "ok" : "error");
        setBusyKey(null);
      }
    });
  }

  return (
    <div className="space-y-2.5">
      {options.map((option) => (
        <div key={option.key} className="card p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-[0.95rem] font-semibold">
                <Sparkles className="h-4 w-4 shrink-0 text-accent" />
                <span className="truncate">{option.name}</span>
              </p>
              <p className="mt-1 text-sm text-muted">{option.description}</p>
              <p className="tabular mt-2 text-xs text-subtle">
                {option.sessionsPerWeek} séances / semaine · {option.days.join(" · ")}
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="secondary"
            fullWidth
            className="mt-3"
            loading={pending && busyKey === option.key}
            disabled={pending}
            onClick={() => create(option.key)}
          >
            Utiliser ce modèle
          </Button>
        </div>
      ))}
      {toast.node}
    </div>
  );
}
