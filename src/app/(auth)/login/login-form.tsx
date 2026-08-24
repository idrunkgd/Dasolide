"use client";

import { useActionState } from "react";
import Link from "next/link";
import { loginAction } from "@/server/actions/auth";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, null);
  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined;

  return (
    <form action={action} className="space-y-4">
      {state && !state.ok && !state.fieldErrors ? (
        <p className="rounded-2xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          {state.error}
        </p>
      ) : null}

      <Field label="Email" error={fieldErrors?.email?.[0]}>
        <Input
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="toi@exemple.com"
          required
          autoFocus
        />
      </Field>

      <Field label="Mot de passe" error={fieldErrors?.password?.[0]}>
        <Input name="password" type="password" autoComplete="current-password" placeholder="••••••••" required />
      </Field>

      <Button type="submit" size="lg" fullWidth loading={pending}>
        Se connecter
      </Button>

      <p className="text-center">
        <Link href="/mot-de-passe-oublie" className="text-sm text-subtle hover:text-muted">
          Mot de passe oublié ?
        </Link>
      </p>
    </form>
  );
}
