"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { createSession, destroySession, hashPassword, verifyPassword } from "@/lib/auth";
import { loginSchema, registerSchema, zodError, type ActionResult } from "@/lib/validation";

export async function registerAction(_prev: unknown, formData: FormData): Promise<ActionResult> {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) return zodError(parsed.error);

  const { name, email, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { ok: false, error: "Un compte existe déjà avec cette adresse email." };
  }

  const user = await prisma.user.create({
    data: {
      email,
      name,
      passwordHash: await hashPassword(password),
      settings: { create: {} },
    },
  });

  await createSession({ userId: user.id, email: user.email, role: user.role });
  redirect("/onboarding");
}

export async function loginAction(_prev: unknown, formData: FormData): Promise<ActionResult> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return zodError(parsed.error);

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  // Message volontairement identique dans les deux cas : pas d'énumération de comptes.
  const invalid: ActionResult = { ok: false, error: "Email ou mot de passe incorrect." };
  if (!user?.passwordHash) return invalid;

  const valid = await verifyPassword(parsed.data.password, user.passwordHash);
  if (!valid) return invalid;

  await prisma.user.update({ where: { id: user.id }, data: { lastSeenAt: new Date() } });
  await createSession({ userId: user.id, email: user.email, role: user.role });

  redirect(user.onboardedAt ? "/" : "/onboarding");
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/login");
}

/**
 * Réinitialisation de mot de passe.
 * En V1 aucun email n'est envoyé : le lien est retourné à l'écran, ce qui
 * permet de tester le parcours complet. Brancher un fournisseur d'email
 * (Resend, SES…) revient à remplacer le `return` par un envoi.
 */
const resetRequestSchema = z.object({ email: z.string().email() });

export async function requestPasswordResetAction(
  _prev: unknown,
  formData: FormData
): Promise<ActionResult<{ token?: string }>> {
  const parsed = resetRequestSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) return zodError(parsed.error);

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
  if (!user) {
    // Réponse identique pour ne pas révéler l'existence du compte.
    return { ok: true, data: {} };
  }

  const token = crypto.randomUUID();
  await prisma.account.upsert({
    where: { provider_providerAccountId: { provider: "password-reset", providerAccountId: user.id } },
    create: {
      userId: user.id,
      type: "email",
      provider: "password-reset",
      providerAccountId: user.id,
      accessToken: token,
      expiresAt: Math.floor(Date.now() / 1000) + 3600,
    },
    update: { accessToken: token, expiresAt: Math.floor(Date.now() / 1000) + 3600 },
  });

  return { ok: true, data: { token } };
}

const resetSchema = z
  .object({
    token: z.string().min(10),
    password: z.string().min(8, "8 caractères minimum"),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirm"],
  });

export async function resetPasswordAction(_prev: unknown, formData: FormData): Promise<ActionResult> {
  const parsed = resetSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) return zodError(parsed.error);

  const account = await prisma.account.findFirst({
    where: { provider: "password-reset", accessToken: parsed.data.token },
  });
  if (!account || (account.expiresAt ?? 0) < Math.floor(Date.now() / 1000)) {
    return { ok: false, error: "Lien expiré ou invalide. Refaites une demande." };
  }

  await prisma.user.update({
    where: { id: account.userId },
    data: { passwordHash: await hashPassword(parsed.data.password) },
  });
  await prisma.account.delete({ where: { id: account.id } });

  redirect("/login?reset=1");
}
