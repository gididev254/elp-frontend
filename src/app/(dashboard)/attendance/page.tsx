// /attendance — Attendance Recording module.
// Server component: gates access via attendance.view / attendance.manage / scoped
// variants, fetches the list of events the user may record attendance for
// (published + completed), and passes them along with the user's cohort scope
// info to the AttendanceManager client component.

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { resolveUser, getLeaderScopeFilter } from "@/lib/rbac/server";
import { db } from "@/lib/db";
import {
  AttendanceManager,
  type AttendanceEventItem,
  type AttendanceScope,
} from "@/components/dashboard/attendance-manager";
import { Card, CardContent } from "@/components/ui/card";
import { CalendarCheck, ShieldAlert } from "lucide-react";
import { redirect } from "next/navigation";

export const metadata = { title: "Attendance" };

export default async function AttendancePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");
  const user = await resolveUser(session.user.id);
  if (!user) redirect("/login");

  const canView =
    user.permissions.has("attendance.view") ||
    user.permissions.has("attendance.manage") ||
    user.permissions.has("attendance.manage.male_y1") ||
    user.permissions.has("attendance.manage.female_y1") ||
    user.permissions.has("attendance.view.female_y1") ||
    user.permissions.has("admin.system");

  const scope = getLeaderScopeFilter(user);

  if (!canView) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto w-full p-4 md:p-6 lg:p-8">
        <PageHeader />
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="p-6 flex items-start gap-3">
            <ShieldAlert className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div className="text-sm space-y-1">
              <div className="font-medium">Access restricted</div>
              <p className="text-muted-foreground">
                You do not have permission to view or record attendance. Only the
                Organizing Secretary, Secretary General, President, Vice President,
                and Year 1 Representatives can access attendance records. Contact the
                executive if you believe this is an error.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Fetch events that can be marked: published + ongoing + completed.
  const events = await db.event.findMany({
    where: { status: { in: ["published", "ongoing", "completed"] } },
    orderBy: { startAt: "desc" },
    take: 100,
    include: { _count: { select: { attendance: true, registrations: true } } },
  });

  // If scope is restricted to a cohort, only show events whose registrations (or
  // the cohort at large) intersect that cohort. We do this conservatively: keep
  // all events visible (so the rep can see history), but the cohort filter is
  // enforced at the API layer when fetching attendance/leaders.
  const initialEvents: AttendanceEventItem[] = events.map((e) => ({
    id: e.id,
    title: e.title,
    startAt: e.startAt.toISOString(),
    venue: e.venue,
    status: e.status,
    attendanceCount: e._count.attendance,
    registrationCount: e._count.registrations,
  }));

  const attendanceScope: AttendanceScope = {
    restrictToCohort: scope.restrictToCohort,
    readOnly: scope.readOnly,
    gender: scope.gender ?? null,
    yearOfStudy: scope.yearOfStudy ?? null,
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full p-4 md:p-6 lg:p-8">
      <PageHeader />

      {scope.restrictToCohort && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-4 flex items-start gap-3">
            <ShieldAlert className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div className="text-sm space-y-1">
              <div className="font-medium">
                Cohort-scoped access —{" "}
                {scope.gender === "male" ? "Male" : scope.gender === "female" ? "Female" : ""}
                {scope.yearOfStudy ? ` Year ${scope.yearOfStudy}` : ""} leaders only
              </div>
              <p className="text-muted-foreground">
                {scope.readOnly
                  ? "You have read-only access to attendance for your cohort. Marking attendance is disabled."
                  : "You can record attendance only for leaders in your cohort. Other leaders are hidden."}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <AttendanceManager events={initialEvents} scope={attendanceScope} />
    </div>
  );
}

function PageHeader() {
  return (
    <div>
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground mb-1">
        <CalendarCheck className="h-3.5 w-3.5" />
        <span>Attendance Recording</span>
      </div>
      <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Attendance</h1>
      <p className="mt-1 text-sm text-muted-foreground max-w-2xl">
        Record and review attendance at chapter events. The Organizing Secretary records
        attendance chapter-wide; Year 1 Representatives record for their cohort only.
      </p>
    </div>
  );
}
