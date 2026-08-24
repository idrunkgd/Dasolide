"use client";

import { useActionState } from "react";
import { resetPasswordAction } from "@/server/actions/auth";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";

export function ResetForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(resetPasswordAction, null);
  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined;

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      {state && !state.ok && !state.fieldErrors ? (
        <p className="rounded-2xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          {state.error}
        </p>
      ) : null}
      <Field label="Nouveau mot de passe" error={fieldErrors?.password?.[0]}>
        <Input name="password" type="password" autoComplete="new-password" required autoFocus />
      </Field>
      <Field label="Confirmer" error={fieldErrors?.confirm?.[0]}>
        <Input name="confirm" type="password" autoComplete="new-password" required />
      </Field>
      <Button type="submit" size="lg" fullWidth loading={pending}>
        Enregistrer
      </Button>
    </form>
  );
}
