import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { prisma } from "./db";

/**
 * Authentification par cookie de session signé (JWT HS256, httpOnly, SameSite=Lax).
 *
 * Le modèle `Account` du schéma est prêt pour Google / Apple : il suffira
 * d'ajouter une route /api/auth/[provider] qui crée ou retrouve l'utilisateur
 * puis appelle `createSession(userId)`. Rien d'autre ne change.
 */

const COOKIE_NAME = "muscu_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 jours

function secretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      "AUTH_SECRET manquant ou trop court. Copiez .env.example vers .env et générez une valeur avec `openssl rand -base64 32`."
    );
  }
  return new TextEncoder().encode(secret);
}

export type SessionPayload = { userId: string; email: string; role: string };

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSession(payload: SessionPayload): Promise<void> {
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(secretKey());

  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

/** Lit le cookie et vérifie la signature. Retourne null si absent/invalide. */
export const getSession = cache(async (): Promise<SessionPayload | null> => {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (typeof payload.userId !== "string") return null;
    return {
      userId: payload.userId,
      email: String(payload.email ?? ""),
      role: String(payload.role ?? "USER"),
    };
  } catch {
    return null;
  }
});

/**
 * Utilisateur courant complet (profil + réglages).
 * `cache()` garantit une seule requête par rendu, quel que soit le nombre
 * de composants qui l'appellent.
 */
export const getCurrentUser = cache(async () => {
  const session = await getSession();
  if (!session) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: { profile: true, settings: true },
  });
  return user;
});

/** À utiliser dans toute page/action protégée. Redirige si non connecté. */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** Identifiant seul — suffisant pour la majorité des server actions. */
export async function requireUserId(): Promise<string> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session.userId;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "ADMIN") redirect("/");
  return user;
}

export const SESSION_COOKIE_NAME = COOKIE_NAME;
