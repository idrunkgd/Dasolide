import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { OnboardingFlow } from "./onboarding-flow";
import { STARTER_PROGRAMS } from "@/server/starter-program";

export const metadata: Metadata = { title: "Bienvenue" };

export default async function OnboardingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.onboardedAt) redirect("/");

  return (
    <OnboardingFlow
      defaultName={user.name ?? ""}
      programs={STARTER_PROGRAMS.map((p) => ({
        key: p.key,
        name: p.name,
        description: p.description,
        sessionsPerWeek: p.sessionsPerWeek,
        days: p.templates.map((t) => t.name),
      }))}
    />
  );
}
