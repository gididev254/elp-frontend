// /dashboard/leaders/[id] — Leader detail page (server component).
// Fetches a single leader by ID and shows their full profile, attendance
// history, mentorship assignments, and event registrations.
// RBAC: cohort-scoped (Year-1 Reps can only view leaders in their cohort).
// If the user has no leaders.view* permission they can only see themselves.

import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { resolveUser, getLeaderScopeFilter } from "@/lib/rbac/server";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { ROLE_LABELS } from "@/components/dashboard/nav-config";
import { format } from "date-fns";
import {
  ArrowLeft,
  Mail,
  Phone,
  GraduationCap,
  CalendarCheck,
  CalendarDays,
  Users2,
  UserCog,
  Pencil,
  ShieldAlert,
  CalendarClock,
  Compass,
} from "lucide-react";

type Params = { id: string };

export const metadata = { title: "Leader profile" };

export default async function LeaderDetailPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect(`/login?callbackUrl=/dashboard/leaders`);
  const currentUser = await resolveUser(session.user.id);
  if (!currentUser) redirect("/login");

  const { id } = await params;
  const scope = getLeaderScopeFilter(currentUser);

  // Self-view fallback: leaders without leaders.view* can only see themselves.
  const hasLeadersView =
    currentUser.permissions.has("leaders.view") ||
    currentUser.permissions.has("leaders.view.male_y1") ||
    currentUser.permissions.has("leaders.view.female_y1") ||
    currentUser.permissions.has("leaders.view.female_y1_readonly") ||
    currentUser.permissions.has("admin.system");

  if (!hasLeadersView && id !== currentUser.id) {
    notFound();
  }

  const leader = await db.user.findUnique({
    where: { id },
    include: {
      profile: true,
      userRoles: { include: { role: true } },
      attendance: {
        include: {
          event: {
            select: { id: true, title: true, slug: true, startAt: true, status: true },
          },
        },
        orderBy: { event: { startAt: "desc" } },
        take: 24,
      },
      registrations: {
        include: {
          event: {
            select: { id: true, title: true, slug: true, startAt: true, status: true },
          },
        },
        orderBy: { event: { startAt: "desc" } },
        take: 24,
      },
      mentorshipSessionsMentee: {
        include: {
          mentor: {
            include: { profile: { select: { fullName: true, avatarUrl: true } } },
          },
        },
        orderBy: { heldAt: "desc" },
        take: 12,
      },
      mentorshipSessions: {
        include: {
          mentee: {
            include: { profile: { select: { fullName: true, avatarUrl: true } } },
          },
        },
        orderBy: { heldAt: "desc" },
        take: 12,
      },
      mentorshipAssignmentsMentor: {
        include: {
          mentee: {
            include: { profile: { select: { fullName: true, avatarUrl: true } } },
          },
        },
        take: 12,
      },
      mentorshipAssignmentsMentee: {
        include: {
          mentor: {
            include: { profile: { select: { fullName: true, avatarUrl: true } } },
          },
        },
        take: 12,
      },
    },
  });

  if (!leader || leader.status === "deactivated") {
    notFound();
  }

  // Cohort scope check: Year-1 Reps can only view leaders in their cohort.
  if (scope.restrictToCohort && leader.id !== currentUser.id) {
    if (scope.gender && leader.profile?.gender !== scope.gender) notFound();
    if (scope.yearOfStudy && leader.profile?.yearOfStudy !== scope.yearOfStudy)
      notFound();
  }

  const profile = leader.profile;
  const fullName = profile?.fullName ?? "Unknown";
  const initials = fullName
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const roles = leader.userRoles.map((ur) => ur.role);
  const isExecutive = roles.some((r) => r.key !== "LEADER");
  const canManage =
    currentUser.permissions.has("admin.users") ||
    currentUser.permissions.has("admin.system");

  // Build mentor/mentee assignments for display.
  const mentorAssignments = leader.mentorshipAssignmentsMentor.filter(
    (a) => a.status === "active",
  );
  const menteeAssignments = leader.mentorshipAssignmentsMentee.filter(
    (a) => a.status === "active",
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <Link
            href="/dashboard/leaders"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-1"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Leaders
          </Link>
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground mb-1">
            <Users2 className="h-3.5 w-3.5" />
            <span>Chapter Leader</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{fullName}</h1>
        </div>
        {canManage && (
          <Button asChild variant="outline">
            <Link href="/dashboard/admin">
              <Pencil className="h-4 w-4 mr-1.5" />
              Edit in Admin Panel
            </Link>
          </Button>
        )}
      </div>

      {/* Scoped view banner */}
      {scope.restrictToCohort && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-4 flex items-start gap-3">
            <ShieldAlert className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div className="text-sm space-y-1">
              <div className="font-medium">Cohort-scoped view</div>
              <p className="text-muted-foreground">
                You are viewing this leader as part of your cohort responsibility.
                Cross-cohort visibility requires executive authorisation.
                {scope.readOnly && " You have read-only access."}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left column: profile card */}
        <div className="space-y-6">
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="flex flex-col items-center text-center">
                <Avatar className="h-24 w-24 border-2 border-border mb-3">
                  <AvatarImage src={profile?.avatarUrl ?? undefined} alt={fullName} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xl font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <h2 className="text-xl font-bold">{fullName}</h2>
                {profile?.preferredName && profile.preferredName !== fullName && (
                  <p className="text-sm text-muted-foreground">
                    &ldquo;{profile.preferredName}&rdquo;
                  </p>
                )}
                <div className="mt-2 flex flex-wrap justify-center gap-1.5">
                  {isExecutive ? (
                    roles
                      .filter((r) => r.key !== "LEADER")
                      .map((r) => (
                        <Badge
                          key={r.key}
                          variant="default"
                          className="text-[10px] uppercase tracking-wide"
                        >
                          {ROLE_LABELS[r.key] ?? r.name}
                        </Badge>
                      ))
                  ) : (
                    <Badge
                      variant="secondary"
                      className="text-[10px] uppercase tracking-wide"
                    >
                      Leader
                    </Badge>
                  )}
                </div>
                <div className="mt-2">
                  <Badge
                    variant={leader.status === "active" ? "default" : "outline"}
                    className="text-[10px] uppercase tracking-wide"
                  >
                    {leader.status}
                  </Badge>
                </div>
              </div>

              <Separator />

              <div className="space-y-2.5 text-sm">
                <div className="flex items-start gap-2.5">
                  <Mail className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                  <div className="min-w-0">
                    <div className="text-xs text-muted-foreground">Email</div>
                    <a
                      href={`mailto:${leader.email}`}
                      className="font-medium hover:underline break-all"
                    >
                      {leader.email}
                    </a>
                  </div>
                </div>
                {profile?.phone && (
                  <div className="flex items-start gap-2.5">
                    <Phone className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs text-muted-foreground">Phone</div>
                      <span className="font-medium">{profile.phone}</span>
                    </div>
                  </div>
                )}
                {profile?.school && (
                  <div className="flex items-start gap-2.5">
                    <GraduationCap className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs text-muted-foreground">School</div>
                      <div className="font-medium">{profile.school}</div>
                      {profile.program && (
                        <div className="text-xs text-muted-foreground">
                          {profile.program}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <Separator />

              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="rounded-md border border-border p-2">
                  <div className="text-muted-foreground">Gender</div>
                  <div className="font-medium capitalize mt-0.5">
                    {profile?.gender ?? "—"}
                  </div>
                </div>
                <div className="rounded-md border border-border p-2">
                  <div className="text-muted-foreground">Year</div>
                  <div className="font-medium mt-0.5">
                    {profile?.yearOfStudy ? `Year ${profile.yearOfStudy}` : "—"}
                  </div>
                </div>
                <div className="rounded-md border border-border p-2">
                  <div className="text-muted-foreground">Reg. No.</div>
                  <div className="font-medium mt-0.5 text-xs">
                    {profile?.registrationNumber ?? "—"}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {profile?.bio && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Bio</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed whitespace-pre-line">
                  {profile.bio}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right column: activity */}
        <div className="lg:col-span-2 space-y-6">
          {/* Quick stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <StatCard
              icon={<CalendarCheck className="h-4 w-4" />}
              label="Attendance"
              value={leader.attendance.length}
            />
            <StatCard
              icon={<CalendarDays className="h-4 w-4" />}
              label="Registrations"
              value={leader.registrations.length}
            />
            <StatCard
              icon={<Users2 className="h-4 w-4" />}
              label="Mentor / Mentee"
              value={`${mentorAssignments.length} / ${menteeAssignments.length}`}
            />
          </div>

          {/* Mentorship */}
          {(mentorAssignments.length > 0 || menteeAssignments.length > 0) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Users2 className="h-4 w-4 text-primary" />
                  Mentorship Assignments
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {mentorAssignments.length > 0 && (
                  <div>
                    <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
                      Mentoring
                    </div>
                    <ul className="space-y-1.5">
                      {mentorAssignments.map((a) => (
                        <li
                          key={a.id}
                          className="flex items-center justify-between gap-2 text-sm py-1.5 border-b border-border last:border-0"
                        >
                          <span className="font-medium truncate">
                            {a.mentee?.profile?.fullName ?? "Unknown"}
                          </span>
                          <Badge variant="outline" className="text-[10px]">
                            {a.status}
                          </Badge>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {menteeAssignments.length > 0 && (
                  <div>
                    <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
                      Mentored by
                    </div>
                    <ul className="space-y-1.5">
                      {menteeAssignments.map((a) => (
                        <li
                          key={a.id}
                          className="flex items-center justify-between gap-2 text-sm py-1.5 border-b border-border last:border-0"
                        >
                          <span className="font-medium truncate">
                            {a.mentor?.profile?.fullName ?? "Unknown"}
                          </span>
                          <Badge variant="outline" className="text-[10px]">
                            {a.status}
                          </Badge>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Event registrations */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-primary" />
                Event Registrations
                <Badge variant="secondary" className="ml-auto text-[10px]">
                  {leader.registrations.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {leader.registrations.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">
                  No event registrations yet.
                </p>
              ) : (
                <ul className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {leader.registrations.map((r) => (
                    <li key={r.id}>
                      <Link
                        href={`/dashboard/events/${r.event.id}`}
                        className="flex items-center justify-between gap-2 py-2 border-b border-border last:border-0 hover:bg-secondary/40 -mx-2 px-2 rounded-sm"
                      >
                        <div className="min-w-0">
                          <div className="font-medium text-sm truncate">
                            {r.event.title}
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                            <CalendarClock className="h-3 w-3" />
                            {format(new Date(r.event.startAt), "d MMM yyyy, h:mm a")}
                          </div>
                        </div>
                        <Badge
                          variant={
                            r.status === "attended"
                              ? "default"
                              : r.status === "cancelled"
                                ? "destructive"
                                : "outline"
                          }
                          className="text-[10px] capitalize"
                        >
                          {r.status}
                        </Badge>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Attendance history */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <CalendarCheck className="h-4 w-4 text-primary" />
                Attendance History
                <Badge variant="secondary" className="ml-auto text-[10px]">
                  {leader.attendance.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {leader.attendance.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">
                  No attendance records yet.
                </p>
              ) : (
                <ul className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {leader.attendance.map((a) => (
                    <li key={a.id}>
                      <Link
                        href={`/dashboard/events/${a.event.id}`}
                        className="flex items-center justify-between gap-2 py-2 border-b border-border last:border-0 hover:bg-secondary/40 -mx-2 px-2 rounded-sm"
                      >
                        <div className="min-w-0">
                          <div className="font-medium text-sm truncate">
                            {a.event.title}
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                            <CalendarClock className="h-3 w-3" />
                            {format(new Date(a.event.startAt), "d MMM yyyy")}
                          </div>
                        </div>
                        <AttendanceBadge status={a.status} />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Profile footer / system info */}
          <Card className="bg-secondary/30">
            <CardContent className="p-4 text-xs text-muted-foreground space-y-1">
              <div className="flex items-center gap-1.5">
                <Compass className="h-3.5 w-3.5" />
                Joined{" "}
                {format(leader.profile?.joinedAt ?? leader.createdAt, "d MMM yyyy")}
              </div>
              {canManage && (
                <div className="flex items-center gap-1.5">
                  <UserCog className="h-3.5 w-3.5" />
                  Manage this leader&rsquo;s account in the Administration panel.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-primary mb-1">
          {icon}
          <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
            {label}
          </span>
        </div>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}

function AttendanceBadge({ status }: { status: string }) {
  const variant: "default" | "secondary" | "outline" | "destructive" =
    status === "present"
      ? "default"
      : status === "absent"
        ? "destructive"
        : status === "excused"
          ? "outline"
          : "secondary";
  return (
    <Badge variant={variant} className="text-[10px] capitalize">
      {status}
    </Badge>
  );
}
