"use client";

import { useActionState } from "react";
import { registerAction } from "@/server/actions/auth";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";

export function RegisterForm() {
  const [state, action, pending] = useActionState(registerAction, null);
  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined;

  return (
    <form action={action} className="space-y-4">
      {state && !state.ok && !state.fieldErrors ? (
        <p className="rounded-2xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          {state.error}
        </p>
      ) : null}

      <Field label="Prénom" error={fieldErrors?.name?.[0]}>
        <Input name="name" autoComplete="given-name" placeholder="Alex" required autoFocus />
      </Field>

      <Field label="Email" error={fieldErrors?.email?.[0]}>
        <Input name="email" type="email" autoComplete="email" inputMode="email" placeholder="toi@exemple.com" required />
      </Field>

      <Field label="Mot de passe" error={fieldErrors?.password?.[0]} hint="8 caractères minimum">
        <Input name="password" type="password" autoComplete="new-password" placeholder="••••••••" required />
      </Field>

      <Field label="Confirmer le mot de passe" error={fieldErrors?.confirm?.[0]}>
        <Input name="confirm" type="password" autoComplete="new-password" placeholder="••••••••" required />
      </Field>

      <Button type="submit" size="lg" fullWidth loading={pending}>
        Créer mon compte
      </Button>
    </form>
  );
}
