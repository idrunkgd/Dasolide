"use server";

import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

/**
 * Consigne une erreur applicative pour la page d'administration (§55).
 * Volontairement silencieuse : une erreur de journalisation ne doit jamais
 * masquer l'erreur d'origine.
 */
export async function logClientErrorAction(
  message: string,
  stack: string | null,
  path: string | null
): Promise<void> {
  try {
    const session = await getSession();
    await prisma.appError.create({
      data: {
        message: message.slice(0, 500),
        stack: stack?.slice(0, 4000) ?? null,
        path: path?.slice(0, 200) ?? null,
        userId: session?.userId ?? null,
      },
    });
  } catch {
    /* journalisation best-effort */
  }
}
