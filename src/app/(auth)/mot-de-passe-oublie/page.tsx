import type { Metadata } from "next";
import Link from "next/link";
import { ForgotForm } from "./forgot-form";
import { Wordmark } from "@/components/brand";

export const metadata: Metadata = { title: "Mot de passe oublié" };

export default function ForgotPage() {
  return (
    <div className="animate-fade-up">
      <Wordmark className="mb-8 justify-center" />
      <h1 className="text-center text-2xl font-bold">Mot de passe oublié</h1>
      <p className="mt-1.5 text-center text-sm text-muted">
        Indique ton email : nous générons un lien de réinitialisation.
      </p>

      <div className="mt-7">
        <ForgotForm />
      </div>

      <p className="mt-6 text-center text-sm text-muted">
        <Link href="/login" className="font-medium text-accent hover:underline">
          Retour à la connexion
        </Link>
      </p>
    </div>
  );
}
