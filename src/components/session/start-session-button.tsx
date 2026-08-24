"use client";

import { useTransition } from "react";
import { Play } from "lucide-react";
import { startSessionAction } from "@/server/actions/session";
import { Button, type ButtonProps } from "@/components/ui/button";

/**
 * Démarrer une séance passe par une action explicite (et non par un lien) :
 * un lien serait préchargé par Next.js et créerait des séances fantômes.
 */
export function StartSessionButton({
  templateId,
  label = "Démarrer la séance",
  icon = true,
  ...props
}: {
  templateId?: string | null;
  label?: string;
  icon?: boolean;
} & Omit<ButtonProps, "onClick" | "children">) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      {...props}
      loading={pending}
      onClick={() => startTransition(() => startSessionAction(templateId ?? null))}
    >
      {icon && !pending ? <Play className="h-5 w-5" fill="currentColor" /> : null}
      {label}
    </Button>
  );
}
