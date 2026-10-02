// /dashboard/resources — Resources management module.
// Executives with resources.view see the list (filtered by visibility); resources.manage can create/edit/archive.

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { resolveUser } from "@/lib/rbac/server";
import { db } from "@/lib/db";
import {
  ResourcesManager,
  type ResourceItem,
} from "@/components/dashboard/resources-manager";
import { Card, CardContent } from "@/components/ui/card";
import { Files, ShieldAlert } from "lucide-react";
import { redirect } from "next/navigation";

export const metadata = { title: "Resources" };

const EXEC_ROLES = new Set([
  "SUPER_ADMIN",
  "PRESIDENT",
  "VICE_PRESIDENT",
  "SECRETARY_GENERAL",
  "ORGANIZING_SECRETARY",
  "TREASURER",
  "COMMUNICATIONS_DIRECTOR",
  "MENTORSHIP_COORDINATOR",
  "ALUMNI_MANAGER",
  "MALE_Y1_REPRESENTATIVE",
  "FEMALE_Y1_REPRESENTATIVE",
  "ASSISTANT_FEMALE_Y1_REPRESENTATIVE",
]);

function resolveVisibilityFilter(
  roleKeys: string[],
  hasManage: boolean,
  hasAdminSystem: boolean,
): string[] | null {
  if (hasAdminSystem || hasManage) return null;
  const isExecutive = roleKeys.some((k) => EXEC_ROLES.has(k));
  return isExecutive
    ? ["public", "leaders", "executive"]
    : ["public", "leaders"];
}

export default async function ResourcesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");
  const user = await resolveUser(session.user.id);
  if (!user) redirect("/login");

  const canView =
    user.permissions.has("resources.view") ||
    user.permissions.has("resources.manage") ||
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
                You do not have permission to view chapter resources. Contact
                the Secretary General or Communications Director if you believe
                this is an error.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const canManage =
    user.permissions.has("resources.manage") ||
    user.permissions.has("admin.system");

  // Apply the SAME visibility filter as the GET API for the initial fetch.
  const hasAdminSystem = user.permissions.has("admin.system");
  const visibilityFilter = resolveVisibilityFilter(
    user.roleKeys,
    canManage,
    hasAdminSystem,
  );

  const where: Record<string, unknown> = {};
  if (visibilityFilter) {
    where.visibility = { in: visibilityFilter };
  }

  const resources = await db.resource.findMany({
    where,
    orderBy: [{ category: "asc" }, { updatedAt: "desc" }],
    take: 200,
  });

  const initialResources: ResourceItem[] = resources.map((r) => ({
    id: r.id,
    title: r.title,
    slug: r.slug,
    description: r.description,
    category: r.category,
    fileUrl: r.fileUrl,
    externalUrl: r.externalUrl,
    visibility: r.visibility as ResourceItem["visibility"],
    status: r.status as ResourceItem["status"],
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <PageHeader />
      <ResourcesManager
        initialResources={initialResources}
        canManage={canManage}
      />
    </div>
  );
}

function PageHeader() {
  return (
    <div>
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground mb-1">
        <Files className="h-3.5 w-3.5" />
        <span>Chapter Knowledge Base</span>
      </div>
      <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
        Resources
      </h1>
      <p className="mt-1 text-sm text-muted-foreground max-w-2xl">
        Manage chapter documents, templates, policies, forms and guides.
        Visibility is enforced per-item: public, leaders-only, or
        executive-only.
      </p>
    </div>
  );
}
