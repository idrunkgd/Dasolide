import type { Metadata } from "next";
import Link from "next/link";
import { RegisterForm } from "./register-form";
import { Wordmark } from "@/components/brand";

export const metadata: Metadata = { title: "Créer un compte" };

export default function RegisterPage() {
  return (
    <div className="animate-fade-up">
      <Wordmark className="mb-8 justify-center" />

      <h1 className="text-center text-2xl font-bold">Crée ton compte</h1>
      <p className="mt-1.5 text-center text-sm text-muted">
        Deux minutes pour configurer, des années de progression suivies.
      </p>

      <div className="mt-7">
        <RegisterForm />
      </div>

      <p className="mt-6 text-center text-sm text-muted">
        Déjà inscrit ?{" "}
        <Link href="/login" className="font-medium text-accent hover:underline">
          Se connecter
        </Link>
      </p>
    </div>
  );
}
