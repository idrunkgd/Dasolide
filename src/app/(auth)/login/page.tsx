import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "./login-form";
import { Wordmark } from "@/components/brand";

export const metadata: Metadata = { title: "Connexion" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ reset?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="animate-fade-up">
      <Wordmark className="mb-8 justify-center" />

      <h1 className="text-center text-2xl font-bold">Content de te revoir</h1>
      <p className="mt-1.5 text-center text-sm text-muted">Reprends là où tu t&apos;es arrêté.</p>

      {params.reset ? (
        <p className="mt-5 rounded-2xl border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">
          Mot de passe modifié. Tu peux te connecter.
        </p>
      ) : null}

      <div className="mt-7">
        <LoginForm />
      </div>

      <p className="mt-6 text-center text-sm text-muted">
        Pas encore de compte ?{" "}
        <Link href="/inscription" className="font-medium text-accent hover:underline">
          Créer un compte
        </Link>
      </p>

      <div className="mt-8 rounded-2xl border border-border bg-surface/60 px-4 py-3 text-center text-xs text-subtle">
        Compte de démonstration —{" "}
        <span className="text-muted">demo@muscu.app</span> /{" "}
        <span className="text-muted">demo1234</span>
      </div>
    </div>
  );
}
