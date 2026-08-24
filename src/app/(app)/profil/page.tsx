import type { Metadata } from "next";
import Link from "next/link";
import {
  Bell,
  ChevronRight,
  Dumbbell,
  Flame,
  Settings,
  Shield,
  Target,
  Trophy,
} from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, SectionTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/misc";
import { LogoutButton } from "@/components/profile/logout-button";
import { LEVELS, MAIN_GOALS } from "@/lib/constants";
import { formatDate, formatNumber, formatVolume, formatWeight, initials } from "@/lib/utils";

export const metadata: Metadata = { title: "Profil" };
export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await requireUser();
  const unit = (user.settings?.weightUnit ?? "kg") as "kg" | "lb";

  const [aggregate, setsCount, recordsCount, latestWeight, activeGoals] = await Promise.all([
    prisma.workoutSession.aggregate({
      where: { userId: user.id, status: "completed" },
      _count: { id: true },
      _sum: { totalVolumeKg: true, totalReps: true, durationSeconds: true },
    }),
    prisma.workoutSet.count({
      where: { workoutExercise: { session: { userId: user.id, status: "completed" } }, type: { not: "W" } },
    }),
    prisma.personalRecord.count({ where: { userId: user.id } }),
    prisma.bodyWeight.findFirst({ where: { userId: user.id }, orderBy: { date: "desc" } }),
    prisma.goal.count({ where: { userId: user.id, status: "active" } }),
  ]);

  const profile = user.profile;

  return (
    <div className="px-4 pt-6">
      {/* Identité */}
      <div className="mb-6 flex items-center gap-4">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl bg-accent-soft text-xl font-bold text-accent">
          {initials(profile?.firstName ?? user.name)}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-2xl font-bold">{profile?.firstName ?? user.name ?? "Athlète"}</h1>
          <p className="truncate text-sm text-muted">{user.email}</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {profile ? (
              <>
                <Badge tone="accent">{MAIN_GOALS[profile.mainGoal as keyof typeof MAIN_GOALS]?.label}</Badge>
                <Badge>{LEVELS[profile.level as keyof typeof LEVELS]?.label}</Badge>
              </>
            ) : null}
            {user.role === "ADMIN" ? <Badge tone="warning">Admin</Badge> : null}
          </div>
        </div>
      </div>

      {/* Chiffres du profil (§35) */}
      <SectionTitle>Depuis le début</SectionTitle>
      <div className="mb-5 grid grid-cols-2 gap-3">
        <BigStat icon={<Dumbbell className="h-4 w-4" />} label="Séances" value={formatNumber(aggregate._count.id)} />
        <BigStat icon={<Flame className="h-4 w-4" />} label="Séries" value={formatNumber(setsCount)} />
        <BigStat
          icon={<Dumbbell className="h-4 w-4" />}
          label="Soulevé"
          value={formatVolume(aggregate._sum.totalVolumeKg ?? 0)}
        />
        <BigStat icon={<Trophy className="h-4 w-4" />} label="Records" value={formatNumber(recordsCount)} />
      </div>

      {/* Corps */}
      <SectionTitle>Mon profil</SectionTitle>
      <Card className="mb-5 p-0">
        <Row label="Poids actuel" value={latestWeight ? formatWeight(latestWeight.weightKg, unit) : "—"} />
        <Row label="Taille" value={profile?.heightCm ? `${profile.heightCm} cm` : "—"} />
        <Row
          label="Objectif de poids"
          value={profile?.targetWeightKg ? formatWeight(profile.targetWeightKg, unit) : "—"}
        />
        <Row label="Séances par semaine" value={profile ? `${profile.sessionsPerWeek}` : "—"} />
        <Row label="Durée moyenne" value={profile ? `${profile.sessionMinutes} min` : "—"} />
        <Row label="Membre depuis" value={formatDate(user.createdAt)} last />
      </Card>

      {/* Navigation */}
      <SectionTitle>Réglages</SectionTitle>
      <Card className="mb-5 p-0">
        <NavRow href="/parametres" icon={<Settings className="h-4 w-4" />} label="Paramètres" />
        <NavRow href="/notifications" icon={<Bell className="h-4 w-4" />} label="Rappels et notifications" />
        <NavRow
          href="/progression/objectifs"
          icon={<Target className="h-4 w-4" />}
          label="Mes objectifs"
          hint={activeGoals > 0 ? `${activeGoals} en cours` : undefined}
        />
        {user.role === "ADMIN" ? (
          <NavRow href="/admin" icon={<Shield className="h-4 w-4" />} label="Administration" last />
        ) : null}
      </Card>

      <LogoutButton />

      <p className="mb-4 mt-6 text-center text-xs text-subtle">
        Muscu · Application de suivi musculation et nutrition
      </p>
    </div>
  );
}

function BigStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="card p-3.5">
      <div className="flex items-center gap-1.5 text-[0.7rem] font-medium uppercase tracking-wider text-subtle">
        {icon}
        {label}
      </div>
      <p className="tabular mt-1.5 text-xl font-semibold leading-none">{value}</p>
    </div>
  );
}

function Row({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <div
      className={`flex items-center justify-between gap-3 px-4 py-3.5 ${last ? "" : "border-b border-border"}`}
    >
      <span className="text-sm text-muted">{label}</span>
      <span className="tabular text-[0.95rem] font-medium">{value}</span>
    </div>
  );
}

function NavRow({
  href,
  icon,
  label,
  hint,
  last,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  hint?: string;
  last?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-surface-2 ${last ? "" : "border-b border-border"}`}
    >
      <span className="text-muted">{icon}</span>
      <span className="flex-1 text-[0.95rem]">{label}</span>
      {hint ? <span className="text-xs text-subtle">{hint}</span> : null}
      <ChevronRight className="h-4 w-4 text-subtle" />
    </Link>
  );
}
