import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

/** Le mode séance occupe tout l'écran : pas de navigation basse, zéro distraction. */
export default async function SessionLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.onboardedAt) redirect("/onboarding");

  return <div className="mx-auto min-h-dvh max-w-2xl">{children}</div>;
}
