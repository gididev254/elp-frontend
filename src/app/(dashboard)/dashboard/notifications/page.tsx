// /dashboard/notifications — list the current user's notifications.
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { resolveUser } from "@/lib/rbac/server";
import { db } from "@/lib/db";
import { NotificationsList } from "@/components/dashboard/notifications-list";
import { Card, CardContent } from "@/components/ui/card";
import { Bell } from "lucide-react";

export const metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  const user = await resolveUser(session.user.id);
  if (!user) return null;

  const notifications = await db.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const serialised = notifications.map((n) => ({
    id: n.id,
    type: n.type,
    title: n.title,
    body: n.body,
    link: n.link,
    read: n.read,
    createdAt: n.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground mb-1">
          <Bell className="h-3.5 w-3.5" />
          <span>Notifications</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Notifications</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          In-app notifications about events, announcements and account activity.
        </p>
      </div>

      <NotificationsList initial={serialised} />
    </div>
  );
}
