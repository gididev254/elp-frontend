// /dashboard/programs — Programs management module.
// Executives with programs.view see the list; programs.manage can create/edit/publish/archive.

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { resolveUser } from "@/lib/rbac/server";
import { db } from "@/lib/db";
import { ProgramsManager, type ProgramItem } from "@/components/dashboard/programs-manager";
import { Card, CardContent } from "@/components/ui/card";
import { FolderKanban, ShieldAlert } from "lucide-react";
import { redirect } from "next/navigation";

export const metadata = { title: "Programs" };

export default async function ProgramsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");
  const user = await resolveUser(session.user.id);
  if (!user) redirect("/login");

  const canView =
    user.permissions.has("programs.view") ||
    user.permissions.has("programs.manage") ||
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
                You do not have permission to view chapter programs. Contact the President or Secretary General if you believe this is an error.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const canManage =
    user.permissions.has("programs.manage") || user.permissions.has("admin.system");

  const programs = await db.program.findMany({
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    take: 60,
    include: { _count: { select: { events: true } } },
  });

  const initialPrograms: ProgramItem[] = programs.map((p) => ({
    id: p.id,
    title: p.title,
    slug: p.slug,
    summary: p.summary,
    description: p.description,
    category: p.category,
    coverUrl: p.coverUrl,
    status: p.status as ProgramItem["status"],
    publishedAt: p.publishedAt?.toISOString() ?? null,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
    eventCount: p._count.events,
  }));

  return (
    <div className="space-y-6">
      <PageHeader />
      <ProgramsManager initialPrograms={initialPrograms} canManage={canManage} />
    </div>
  );
}

function PageHeader() {
  return (
    <div>
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground mb-1">
        <FolderKanban className="h-3.5 w-3.5" />
        <span>Chapter Programs</span>
      </div>
      <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Programs</h1>
      <p className="mt-1 text-sm text-muted-foreground max-w-2xl">
        Plan, draft, and publish the chapter's structured initiatives — mentorship, leadership, community, career, and academic programs.
      </p>
    </div>
  );
}
