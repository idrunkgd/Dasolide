import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, Apple, Dumbbell, Users } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/layout/page-header";
import { Card, SectionTitle } from "@/components/ui/card";
import { formatDate, formatNumber } from "@/lib/utils";
import { CATEGORIES } from "@/lib/constants";

export const metadata: Metadata = { title: "Administration" };
export const dynamic = "force-dynamic";

/**
 * Interface d'administration (§55).
 *
 * Volontairement limitée à des compteurs agrégés et aux bibliothèques
 * partagées : aucune donnée personnelle d'utilisateur n'est consultable ici,
 * et les photos de progression ne sont jamais exposées.
 */
export default async function AdminPage() {
  await requireAdmin();

  const [
    userCount,
    onboardedCount,
    activeCount,
    sessionCount,
    exerciseCount,
    customExerciseCount,
    foodCount,
    customFoodCount,
    muscleGroups,
    byCategory,
    recentErrors,
    newUsers,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { onboardedAt: { not: null } } }),
    prisma.user.count({
      where: { lastSeenAt: { gte: new Date(Date.now() - 30 * 86400000) } },
    }),
    prisma.workoutSession.count({ where: { status: "completed" } }),
    prisma.exercise.count({ where: { isCustom: false } }),
    prisma.exercise.count({ where: { isCustom: true } }),
    prisma.food.count({ where: { isCustom: false } }),
    prisma.food.count({ where: { isCustom: true } }),
    prisma.muscleGroup.findMany({
      orderBy: { sortOrder: "asc" },
      include: { _count: { select: { primaryFor: true, secondaryFor: true } } },
    }),
    prisma.exercise.groupBy({
      by: ["category"],
      where: { isCustom: false },
      _count: { category: true },
    }),
    prisma.appError.findMany({ orderBy: { createdAt: "desc" }, take: 20 }),
    prisma.user.count({ where: { createdAt: { gte: new Date(Date.now() - 7 * 86400000) } } }),
  ]);

  return (
    <div>
      <PageHeader title="Administration" subtitle="Vue technique de la plateforme" back="/profil" />

      <div className="px-4 pt-4">
        <p className="mb-4 rounded-2xl border border-border bg-surface-2 px-4 py-3 text-xs text-subtle">
          Cette page ne donne accès à aucune donnée personnelle : ni séances, ni mesures, ni photos
          d&apos;un utilisateur. Uniquement des compteurs agrégés et les bibliothèques partagées.
        </p>

        <SectionTitle>Utilisateurs</SectionTitle>
        <div className="mb-5 grid grid-cols-2 gap-3">
          <Stat icon={<Users className="h-4 w-4" />} label="Comptes" value={formatNumber(userCount)} />
          <Stat label="Onboarding terminé" value={formatNumber(onboardedCount)} />
          <Stat label="Actifs 30 jours" value={formatNumber(activeCount)} />
          <Stat label="Inscrits 7 jours" value={formatNumber(newUsers)} />
        </div>

        <SectionTitle>Contenu</SectionTitle>
        <div className="mb-5 grid grid-cols-2 gap-3">
          <Stat
            icon={<Dumbbell className="h-4 w-4" />}
            label="Exercices"
            value={formatNumber(exerciseCount)}
            sub={`${customExerciseCount} personnalisés`}
          />
          <Stat
            icon={<Apple className="h-4 w-4" />}
            label="Aliments"
            value={formatNumber(foodCount)}
            sub={`${customFoodCount} personnalisés`}
          />
          <Stat label="Séances enregistrées" value={formatNumber(sessionCount)} />
          <Stat label="Groupes musculaires" value={formatNumber(muscleGroups.length)} />
        </div>

        <SectionTitle>Exercices par catégorie</SectionTitle>
        <Card className="mb-5 p-0">
          <ul>
            {byCategory
              .sort((a, b) => b._count.category - a._count.category)
              .map((c) => (
                <li
                  key={c.category}
                  className="flex items-center justify-between gap-3 border-b border-border px-4 py-2.5 last:border-0"
                >
                  <span className="text-sm">
                    {CATEGORIES[c.category as keyof typeof CATEGORIES] ?? c.category}
                  </span>
                  <Link
                    href={`/exercices?category=${c.category}`}
                    className="tabular text-sm text-accent"
                  >
                    {c._count.category}
                  </Link>
                </li>
              ))}
          </ul>
        </Card>

        <SectionTitle>Groupes musculaires</SectionTitle>
        <Card className="mb-5 p-0">
          <ul>
            {muscleGroups.map((m) => (
              <li
                key={m.id}
                className="flex items-center gap-3 border-b border-border px-4 py-2.5 last:border-0"
              >
                <span
                  className="h-3 w-3 shrink-0 rounded-full"
                  style={{ background: m.color }}
                  aria-hidden
                />
                <span className="min-w-0 flex-1 truncate text-sm">{m.name}</span>
                <span className="tabular shrink-0 text-xs text-subtle">
                  {m._count.primaryFor} principal · {m._count.secondaryFor} secondaire
                </span>
              </li>
            ))}
          </ul>
        </Card>

        <SectionTitle>Erreurs applicatives</SectionTitle>
        <Card className="mb-6">
          {recentErrors.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted">Aucune erreur enregistrée.</p>
          ) : (
            <ul className="space-y-3">
              {recentErrors.map((e) => (
                <li key={e.id} className="border-b border-border pb-3 last:border-0 last:pb-0">
                  <p className="flex items-start gap-2 text-sm">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                    <span className="min-w-0 break-words">{e.message}</span>
                  </p>
                  <p className="tabular mt-1 pl-6 text-xs text-subtle">
                    {formatDate(e.createdAt)}
                    {e.path ? ` · ${e.path}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  sub,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="card p-3.5">
      <div className="flex items-center gap-1.5 text-[0.7rem] font-medium uppercase tracking-wider text-subtle">
        {icon}
        {label}
      </div>
      <p className="tabular mt-1.5 text-xl font-semibold leading-none">{value}</p>
      {sub ? <p className="mt-1.5 text-xs text-muted">{sub}</p> : null}
    </div>
  );
}
