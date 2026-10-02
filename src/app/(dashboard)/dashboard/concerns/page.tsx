// /dashboard/concerns — Year-1 Reps submit concerns to the executive; execs view & manage them.

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { resolveUser, getLeaderScopeFilter } from "@/lib/rbac/server";
import { db } from "@/lib/db";
import { ConcernsPanel } from "@/components/dashboard/concerns-panel";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

export const metadata = { title: "Year 1 Concerns" };

export default async function ConcernsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  const user = await resolveUser(session.user.id);
  if (!user) return null;

  const scope = getLeaderScopeFilter(user);
  const canManage = user.permissions.has("concerns.manage") || user.permissions.has("admin.system");

  // Cohort of the current rep (for filtering submitted concerns)
  const repCohort = scope.gender === "male" ? "male_y1" : scope.gender === "female" ? "female_y1" : null;

  const where = canManage
    ? {} // execs see all concerns
    : { submittedById: user.id }; // reps see their own submissions

  const concerns = await db.concern.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { submittedBy: { include: { profile: true } }, assignedTo: { include: { profile: true } } },
  });

  const serialised = concerns.map((c) => ({
    id: c.id,
    title: c.title,
    body: c.body,
    cohort: c.cohort,
    status: c.status,
    submittedBy: {
      id: c.submittedBy.id,
      name: c.submittedBy.profile?.fullName ?? c.submittedBy.email,
    },
    assignedTo: c.assignedTo
      ? { id: c.assignedTo.id, name: c.assignedTo.profile?.fullName ?? c.assignedTo.email }
      : null,
    createdAt: c.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground mb-1">
          <AlertCircle className="h-3.5 w-3.5" />
          <span>Year 1 Representation</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Concerns & Feedback</h1>
        <p className="mt-1 text-sm text-muted-foreground max-w-2xl">
          {canManage
            ? "Concerns submitted by Year 1 Representatives on behalf of their cohort. Acknowledge, assign and resolve them."
            : "Submit concerns, reports or feedback on behalf of the leaders you represent. The executive will review and respond."}
        </p>
      </div>

      <ConcernsPanel
        initialConcerns={serialised}
        canManage={canManage}
        defaultCohort={repCohort}
      />
    </div>
  );
}
