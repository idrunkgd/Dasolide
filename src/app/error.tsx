"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { logClientErrorAction } from "@/server/actions/log";
import { Button } from "@/components/ui/button";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Consigné pour être consultable dans /admin (§55).
    void logClientErrorAction(error.message, error.stack ?? null, window.location.pathname);
  }, [error]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-danger/15 text-danger">
        <AlertTriangle className="h-7 w-7" />
      </div>
      <h1 className="text-xl font-bold">Une erreur est survenue</h1>
      <p className="mt-2 max-w-sm text-sm text-muted">
        Rien n&apos;est perdu : tes données sont enregistrées. Tu peux réessayer ou revenir à
        l&apos;accueil.
      </p>
      {process.env.NODE_ENV === "development" ? (
        <pre className="mt-4 max-w-full overflow-x-auto rounded-2xl bg-surface-2 p-3 text-left text-xs text-subtle">
          {error.message}
        </pre>
      ) : null}
      <div className="mt-7 flex gap-2">
        <Button onClick={reset} size="lg">
          Réessayer
        </Button>
        <Link href="/">
          <Button variant="secondary" size="lg">
            Accueil
          </Button>
        </Link>
      </div>
    </div>
  );
}
