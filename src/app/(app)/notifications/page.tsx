import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/layout/page-header";
import { RemindersView } from "@/components/profile/reminders-view";

export const metadata: Metadata = { title: "Rappels" };
export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const user = await requireUser();

  const reminders = await prisma.reminder.findMany({
    where: { userId: user.id },
    orderBy: [{ enabled: "desc" }, { time: "asc" }],
  });

  return (
    <div>
      <PageHeader title="Rappels" subtitle="Notifications locales" back="/profil" />
      <RemindersView
        reminders={reminders.map((r) => ({
          id: r.id,
          type: r.type,
          time: r.time,
          days: r.days.split(",").filter(Boolean).map(Number),
          message: r.message,
          enabled: r.enabled,
        }))}
      />
    </div>
  );
}
