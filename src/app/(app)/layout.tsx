import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { MainNav } from "@/components/layout/bottom-nav";
import { ServiceWorkerRegistrar } from "@/components/layout/service-worker";
import { ReminderScheduler } from "@/components/layout/reminder-scheduler";
import { prisma } from "@/lib/db";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.onboardedAt) redirect("/onboarding");

  const reminders = await prisma.reminder.findMany({
    where: { userId: user.id, enabled: true },
    select: { id: true, type: true, time: true, days: true, message: true },
  });

  return (
    <div className="lg:pl-60">
      <ServiceWorkerRegistrar />
      <ReminderScheduler reminders={reminders} />
      <div className="mx-auto flex min-h-dvh max-w-2xl flex-col">
        <main className="flex-1 pb-[calc(var(--nav-height)+var(--safe-bottom)+0.5rem)] lg:pb-8">
          {children}
        </main>
      </div>
      <MainNav />
    </div>
  );
}
