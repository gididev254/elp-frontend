// /dashboard/leaders — Leaders management module.
// Year-1 Reps see only their gender cohort (enforced at API/service layer).
// Read-only reps (Asst Female Y1) get a visual indicator and no edit actions.

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { resolveUser, getLeaderScopeFilter } from "@/lib/rbac/server";
import { db } from "@/lib/db";
import { LeadersBrowser } from "@/components/dashboard/leaders-browser";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Users } from "lucide-react";
import { ROLE_LABELS } from "@/components/dashboard/nav-config";

export const metadata = { title: "Leaders" };

export default async function LeadersPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  const user = await resolveUser(session.user.id);
  if (!user) return null;

  const scope = getLeaderScopeFilter(user);

  // Pre-fetch leaders server-side for first paint. The client component will
  // take over and refetch with filters/search.
  const where: Record<string, unknown> = {
    status: "active",
    userRoles: { some: { role: { key: "LEADER" } } },
  };
  if (scope.restrictToCohort) {
    where.profile = {
      ...(scope.gender ? { gender: scope.gender } : {}),
      ...(scope.yearOfStudy ? { yearOfStudy: scope.yearOfStudy } : {}),
    };
  }
  const initialLeaders = await db.user.findMany({
    where,
    include: { profile: true, userRoles: { include: { role: true } } },
    orderBy: { profile: { fullName: "asc" } },
    take: 24,
  });

  // Distinct schools for filter dropdown.
  const schoolOptions = await db.profile.findMany({
    where: { user: { status: "active" } },
    select: { school: true },
    distinct: ["school"],
  });

  const roleLabel = ROLE_LABELS[user.primaryRole ?? "LEADER"] ?? "Leader";

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground mb-1">
          <Users className="h-3.5 w-3.5" />
          <span>Chapter Leaders</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Leaders</h1>
        <p className="mt-1 text-sm text-muted-foreground max-w-2xl">
          {getRoleScopeDescription(user.primaryRole ?? "LEADER")}
        </p>
      </div>

      {scope.restrictToCohort && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div className="text-sm space-y-1">
              <div className="font-medium">
                Scoped visibility — {scope.gender === "male" ? "Male" : scope.gender === "female" ? "Female" : ""}{" "}
                {scope.yearOfStudy ? `Year ${scope.yearOfStudy} ` : ""}Leaders only
              </div>
              <p className="text-muted-foreground">
                As {roleLabel}, your access is intentionally restricted to leaders in your cohort.
                Cross-cohort visibility requires explicit authorisation by the executive.
                {scope.readOnly && " You have read-only access."}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <LeadersBrowser
        initialLeaders={initialLeaders.map((l) => ({
          id: l.id,
          email: l.email,
          status: l.status,
          fullName: l.profile?.fullName ?? "Unknown",
          preferredName: l.profile?.preferredName ?? null,
          gender: l.profile?.gender ?? null,
          yearOfStudy: l.profile?.yearOfStudy ?? null,
          school: l.profile?.school ?? null,
          program: l.profile?.program ?? null,
          phone: l.profile?.phone ?? null,
          bio: l.profile?.bio ?? null,
          avatarUrl: l.profile?.avatarUrl ?? null,
          isExecutive: l.userRoles.some((ur) => ur.role.key !== "LEADER"),
          executiveRole: l.userRoles.find((ur) => ur.role.key !== "LEADER")?.role ?? null,
          canManage: !scope.readOnly,
        }))}
        schools={schoolOptions.map((s) => s.school).filter(Boolean) as string[]}
        scopeReadOnly={scope.readOnly}
        scopeGender={scope.gender ?? null}
        scopeYear={scope.yearOfStudy ?? null}
      />
    </div>
  );
}

function getRoleScopeDescription(role: string): string {
  switch (role) {
    case "MALE_Y1_REPRESENTATIVE":
      return "You are viewing Male Year 1 Leaders only. Use this view to track their participation and submit concerns on their behalf.";
    case "FEMALE_Y1_REPRESENTATIVE":
      return "You are viewing Female Year 1 Leaders only. Use this view to track their participation and submit concerns on their behalf.";
    case "ASSISTANT_FEMALE_Y1_REPRESENTATIVE":
      return "You are viewing Female Year 1 Leaders in read-only mode. You cannot modify records.";
    case "TREASURER":
      return "You have limited visibility to leader records in a finance context.";
    case "MENTORSHIP_COORDINATOR":
      return "View leaders to coordinate mentorship pairing and track session progress.";
    case "ALUMNI_MANAGER":
      return "View leaders and identify potential alumni contacts.";
    case "PRESIDENT":
    case "VICE_PRESIDENT":
      return "Full chapter-wide visibility across all leaders. Approve or delegate sensitive changes.";
    case "SECRETARY_GENERAL":
      return "Manage chapter leader records, statuses, and official documentation.";
    case "ORGANIZING_SECRETARY":
      return "View leaders and coordinate event participation and attendance.";
    case "SUPER_ADMIN":
      return "Full system visibility. Manage accounts, roles, and approvals.";
    default:
      return "View your fellow chapter leaders.";
  }
}
