import type { Metadata } from "next";
import Link from "next/link";
import { CloudOff } from "lucide-react";
import { Wordmark } from "@/components/brand";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Hors ligne" };

export default function OfflinePage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <Wordmark className="mb-10" />
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-surface-2 text-muted">
        <CloudOff className="h-7 w-7" />
      </div>
      <h1 className="text-xl font-bold">Pas de connexion</h1>
      <p className="mt-2 max-w-xs text-sm text-muted">
        Cette page n&apos;est pas disponible hors ligne. Une séance déjà démarrée continue de
        fonctionner : tes séries sont enregistrées sur l&apos;appareil et seront synchronisées au
        retour du réseau.
      </p>
      <Link href="/" className="mt-7">
        <Button size="lg">Réessayer</Button>
      </Link>
    </div>
  );
}
