// /dashboard/admin — Super Admin only.
// Approve/suspend/deactivate user accounts. Assign roles.

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { resolveUser } from "@/lib/rbac/server";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { AdminPanel } from "@/components/dashboard/admin-panel";
import { Card, CardContent } from "@/components/ui/card";
import { ShieldCheck, AlertCircle } from "lucide-react";
import { ROLE_LABELS } from "@/components/dashboard/nav-config";

export const metadata = { title: "Administration" };

export default async function AdminPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login?callbackUrl=/dashboard/admin");
  const user = await resolveUser(session.user.id);
  if (!user) redirect("/login");

  if (!user.permissions.has("admin.users")) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-10 text-center">
            <AlertCircle className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <h3 className="font-medium">Access restricted</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Administration is restricted to the Technical Administrator.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const [pendingUsers, allUsers, roles] = await Promise.all([
    db.user.findMany({
      where: { status: "pending" },
      include: { profile: true, userRoles: { include: { role: true } } },
      orderBy: { createdAt: "asc" },
    }),
    db.user.findMany({
      include: { profile: true, userRoles: { include: { role: true } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    db.role.findMany({ orderBy: { name: "asc" }, include: { permissions: true } }),
  ]);

  const serialisedPending = pendingUsers.map((u) => ({
    id: u.id,
    email: u.email,
    status: u.status,
    fullName: u.profile?.fullName ?? "Unknown",
    gender: u.profile?.gender ?? null,
    yearOfStudy: u.profile?.yearOfStudy ?? null,
    school: u.profile?.school ?? null,
    program: u.profile?.program ?? null,
    phone: u.profile?.phone ?? null,
    createdAt: u.createdAt.toISOString(),
    roleKeys: u.userRoles.map((ur) => ur.role.key),
  }));

  const serialisedUsers = allUsers.map((u) => {
    const nonLeaderRoles = u.userRoles.filter((ur) => ur.role.key !== "LEADER");
    return {
      id: u.id,
      email: u.email,
      status: u.status,
      fullName: u.profile?.fullName ?? "Unknown",
      avatarUrl: u.profile?.avatarUrl ?? null,
      primaryRole: nonLeaderRoles[0]?.role.key ?? "LEADER",
      primaryRoleName: nonLeaderRoles[0]?.role.name ?? "Leader",
      // All role keys (incl. LEADER + SUPER_ADMIN if present) so the admin
      // panel can render a role-count badge per row.
      roleKeys: u.userRoles.map((ur) => ur.role.key),
      createdAt: u.createdAt.toISOString(),
    };
  });

  const serialisedRoles = roles
    .filter((r) => r.key !== "LEADER" || r.key === "LEADER")
    .map((r) => ({
      id: r.id,
      key: r.key,
      name: r.name,
      description: r.description,
      category: r.category,
      isExecutive: r.isExecutive,
      isSystem: r.isSystem,
      permissionsCount: r.permissions.length,
    }));

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground mb-1">
          <ShieldCheck className="h-3.5 w-3.5" />
          <span>System Administration</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Administration</h1>
        <p className="mt-1 text-sm text-muted-foreground max-w-2xl">
          Approve pending registrations, manage account statuses, and assign roles. All actions are recorded in the audit log.
        </p>
      </div>

      <AdminPanel
        pendingUsers={serialisedPending}
        recentUsers={serialisedUsers}
        roles={serialisedRoles}
      />
    </div>
  );
}
