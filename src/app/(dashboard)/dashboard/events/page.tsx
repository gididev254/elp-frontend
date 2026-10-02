// /dashboard/events — Events management module.
// Executives with events.view see the list; events.manage can create/edit/publish/archive.
// Any authenticated leader can self-register for published events.

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { resolveUser } from "@/lib/rbac/server";
import { db } from "@/lib/db";
import { EventsManager, type EventItem } from "@/components/dashboard/events-manager";
import { Card, CardContent } from "@/components/ui/card";
import { CalendarDays, ShieldAlert } from "lucide-react";
import { redirect } from "next/navigation";

export const metadata = { title: "Events" };

export default async function EventsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");
  const user = await resolveUser(session.user.id);
  if (!user) redirect("/login");

  const canView =
    user.permissions.has("events.view") ||
    user.permissions.has("events.manage") ||
    user.permissions.has("admin.system");
  if (!canView) {
    return (
      <div className="space-y-6">
        <PageHeader />
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="p-6 flex items-start gap-3">
            <ShieldAlert className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div className="text-sm space-y-1">
              <div className="font-medium">No access</div>
              <p className="text-muted-foreground">
                You do not have permission to view chapter events. Contact the President or Organizing Secretary if you believe this is an error.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const canManage =
    user.permissions.has("events.manage") || user.permissions.has("admin.system");

  const events = await db.event.findMany({
    orderBy: { startAt: "desc" },
    take: 60,
    include: {
      _count: { select: { registrations: true } },
      program: { select: { id: true, title: true, slug: true } },
      registrations: {
        where: { userId: user.id, status: "registered" },
        select: { id: true },
      },
    },
  });

  const initialEvents: EventItem[] = events.map((e) => ({
    id: e.id,
    title: e.title,
    slug: e.slug,
    summary: e.summary,
    description: e.description,
    category: e.category,
    coverUrl: e.coverUrl,
    venue: e.venue,
    location: e.location,
    startAt: e.startAt.toISOString(),
    endAt: e.endAt?.toISOString() ?? null,
    status: e.status as EventItem["status"],
    publishedAt: e.publishedAt?.toISOString() ?? null,
    capacity: e.capacity,
    programId: e.programId,
    program: e.program,
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
    registrationCount: e._count.registrations,
    isRegistered: e.registrations.length > 0,
  }));

  return (
    <div className="space-y-6">
      <PageHeader />
      <EventsManager
        initialEvents={initialEvents}
        canManage={canManage}
        currentUserId={user.id}
      />
    </div>
  );
}

function PageHeader() {
  return (
    <div>
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground mb-1">
        <CalendarDays className="h-3.5 w-3.5" />
        <span>Chapter Events</span>
      </div>
      <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Events</h1>
      <p className="mt-1 text-sm text-muted-foreground max-w-2xl">
        Plan workshops, seminars, outreach drives, socials, meetings, and ceremonies. Leaders can self-register once an event is published.
      </p>
    </div>
  );
}
