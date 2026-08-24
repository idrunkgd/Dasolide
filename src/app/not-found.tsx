import Link from "next/link";
import { Wordmark } from "@/components/brand";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <Wordmark className="mb-10" />
      <p className="tabular text-5xl font-bold text-accent">404</p>
      <h1 className="mt-3 text-xl font-bold">Page introuvable</h1>
      <p className="mt-2 max-w-xs text-sm text-muted">
        Ce contenu n&apos;existe pas ou ne t&apos;appartient pas.
      </p>
      <Link href="/" className="mt-7">
        <Button size="lg">Retour à l&apos;accueil</Button>
      </Link>
    </div>
  );
}
