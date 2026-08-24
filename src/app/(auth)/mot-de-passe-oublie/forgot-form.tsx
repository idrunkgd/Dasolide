"use client";

import { useActionState } from "react";
import Link from "next/link";
import { requestPasswordResetAction } from "@/server/actions/auth";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";

export function ForgotForm() {
  const [state, action, pending] = useActionState(requestPasswordResetAction, null);

  if (state?.ok) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-4 text-sm">
        <p className="text-muted">
          Si un compte existe pour cette adresse, un lien de réinitialisation a été généré.
        </p>
        {state.data?.token ? (
          <>
            <p className="mt-3 text-xs text-subtle">
              Aucun service d&apos;email n&apos;est configuré en développement : le lien s&apos;affiche
              directement ci-dessous.
            </p>
            <Link
              href={`/reinitialiser?token=${state.data.token}`}
              className="mt-3 block break-all rounded-xl bg-surface-2 px-3 py-2.5 font-medium text-accent hover:underline"
            >
              Réinitialiser mon mot de passe →
            </Link>
          </>
        ) : null}
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      {state && !state.ok ? (
        <p className="rounded-2xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          {state.error}
        </p>
      ) : null}
      <Field label="Email">
        <Input name="email" type="email" inputMode="email" placeholder="toi@exemple.com" required autoFocus />
      </Field>
      <Button type="submit" size="lg" fullWidth loading={pending}>
        Envoyer le lien
      </Button>
    </form>
  );
}
