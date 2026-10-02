// /dashboard/mentorship — Mentorship management module.
// Mentorship Coordinator + executives with mentorship.view see the list;
// mentorship.manage can create/edit/cancel assignments and log sessions.

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { resolveUser } from "@/lib/rbac/server";
import { db } from "@/lib/db";
import {
  MentorshipManager,
  type AssignmentItem,
  type SessionItem,
  type LeaderOption,
} from "@/components/dashboard/mentorship-manager";
import { Card, CardContent } from "@/components/ui/card";
import { Users2, ShieldAlert } from "lucide-react";
import { redirect } from "next/navigation";

export const metadata = { title: "Mentorship" };

export default async function MentorshipPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");
  const user = await resolveUser(session.user.id);
  if (!user) redirect("/login");

  const canView =
    user.permissions.has("mentorship.view") ||
    user.permissions.has("mentorship.manage") ||
    user.permissions.has("admin.system");
  if (!canView) {
    return (
      <div className="space-y-6">
        <PageHeader />
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="p-6 flex items-start gap-3">
            <ShieldAlert className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div className="text-sm space-y-1">
              <div className="font-medium">Access restricted</div>
              <p className="text-muted-foreground">
                You do not have permission to view mentorship records. Contact the
                Mentorship Coordinator, President, or Super Admin if you believe this is an error.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const canManage =
    user.permissions.has("mentorship.manage") || user.permissions.has("admin.system");

  // Pre-fetch assignments (with mentor + mentee profiles + session counts).
  const assignments = await db.mentorshipAssignment.findMany({
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    take: 200,
    include: {
      mentor: {
        select: {
          id: true,
          email: true,
          profile: { select: { fullName: true, preferredName: true, avatarUrl: true } },
        },
      },
      mentee: {
        select: {
          id: true,
          email: true,
          profile: { select: { fullName: true, preferredName: true, avatarUrl: true } },
        },
      },
      _count: { select: { sessions: true } },
    },
  });

  const initialAssignments: AssignmentItem[] = assignments.map((a) => {
    const brief = (u: typeof a.mentor) => ({
      id: u.id,
      email: u.email,
      name: u.profile?.preferredName || u.profile?.fullName || u.email,
      avatarUrl: u.profile?.avatarUrl ?? null,
    });
    return {
      id: a.id,
      mentorId: a.mentorId,
      menteeId: a.menteeId,
      programId: a.programId,
      status: a.status as AssignmentItem["status"],
      notes: a.notes,
      createdAt: a.createdAt.toISOString(),
      updatedAt: a.updatedAt.toISOString(),
      mentor: brief(a.mentor),
      mentee: brief(a.mentee),
      sessionCount: a._count.sessions,
    };
  });

  // Pre-fetch all sessions (flat list for the Sessions tab).
  const sessions = await db.mentorshipSession.findMany({
    orderBy: { heldAt: "desc" },
    take: 300,
    include: {
      mentor: {
        select: {
          id: true,
          email: true,
          profile: { select: { fullName: true, preferredName: true, avatarUrl: true } },
        },
      },
      mentee: {
        select: {
          id: true,
          email: true,
          profile: { select: { fullName: true, preferredName: true, avatarUrl: true } },
        },
      },
      assignment: { select: { id: true, status: true } },
    },
  });

  const initialSessions: SessionItem[] = sessions.map((s) => ({
    id: s.id,
    assignmentId: s.assignmentId,
    mentorId: s.mentorId,
    menteeId: s.menteeId,
    title: s.title,
    notes: s.notes,
    heldAt: s.heldAt.toISOString(),
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
    mentor: {
      id: s.mentor.id,
      email: s.mentor.email,
      name: s.mentor.profile?.preferredName || s.mentor.profile?.fullName || s.mentor.email,
      avatarUrl: s.mentor.profile?.avatarUrl ?? null,
    },
    mentee: s.mentee
      ? {
          id: s.mentee.id,
          email: s.mentee.email,
          name: s.mentee.profile?.preferredName || s.mentee.profile?.fullName || s.mentee.email,
          avatarUrl: s.mentee.profile?.avatarUrl ?? null,
        }
      : null,
    assignment: s.assignment
      ? { id: s.assignment.id, status: s.assignment.status }
      : null,
  }));

  // Pre-fetch list of active leaders (for mentor/mentee dropdowns).
  const leadersRaw = await db.user.findMany({
    where: {
      status: "active",
      userRoles: { some: { role: { key: "LEADER" } } },
    },
    include: { profile: true },
    orderBy: { email: "asc" },
    take: 200,
  });

  const leaders: LeaderOption[] = leadersRaw.map((u) => ({
    id: u.id,
    email: u.email,
    name: u.profile?.preferredName || u.profile?.fullName || u.email,
  }));

  return (
    <div className="space-y-6">
      <PageHeader />
      <MentorshipManager
        initialAssignments={initialAssignments}
        initialSessions={initialSessions}
        leaders={leaders}
        canManage={canManage}
      />
    </div>
  );
}

function PageHeader() {
  return (
    <div>
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground mb-1">
        <Users2 className="h-3.5 w-3.5" />
        <span>Mentorship</span>
      </div>
      <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Mentorship</h1>
      <p className="mt-1 text-sm text-muted-foreground max-w-2xl">
        Pair chapter leaders as mentors and mentees, track mentoring sessions, and monitor
        the health of every active pairing.
      </p>
    </div>
  );
}
