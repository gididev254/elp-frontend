// /dashboard/audit — Audit Logs (read-only)
// Visible to roles with audit.view: SUPER_ADMIN, PRESIDENT, SECRETARY_GENERAL (per roles.ts)
// VICE_PRESIDENT does not have audit.view in roles.ts — they get the "Access restricted" card.

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { resolveUser } from "@/lib/rbac/server";
import { db } from "@/lib/db";
import {
  AuditViewer,
  type AuditEntry,
} from "@/components/dashboard/audit-viewer";
import { Card, CardContent } from "@/components/ui/card";
import { History, ShieldAlert } from "lucide-react";
import { redirect } from "next/navigation";

export const metadata = { title: "Audit Logs" };

const PAGE_SIZE = 20;

export default async function AuditPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");
  const user = await resolveUser(session.user.id);
  if (!user) redirect("/login");

  const canView = user.permissions.has("audit.view") ||
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
                Audit logs are only visible to the Super Admin, President, and
                Secretary General. Contact one of them if you believe you should
                have access.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Pre-fetch the first page server-side to avoid a loading flash.
  const [total, rows] = await Promise.all([
    db.auditLog.count(),
    db.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
      include: {
        actor: {
          select: {
            id: true,
            email: true,
            profile: { select: { fullName: true, preferredName: true } },
          },
        },
      },
    }),
  ]);

  const initialItems: AuditEntry[] = rows.map((a) => ({
    id: a.id,
    actorId: a.actorId,
    action: a.action,
    target: a.target,
    context: a.context,
    ip: a.ip,
    createdAt: a.createdAt.toISOString(),
    actor: a.actor
      ? {
          id: a.actor.id,
          email: a.actor.email,
          name:
            a.actor.profile?.preferredName ||
            a.actor.profile?.fullName ||
            a.actor.email,
        }
      : null,
  }));

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <PageHeader />
      <AuditViewer
        initialItems={initialItems}
        initialPage={1}
        initialPages={pages}
        initialTotal={total}
      />
    </div>
  );
}

function PageHeader() {
  return (
    <div>
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground mb-1">
        <History className="h-3.5 w-3.5" />
        <span>Compliance &amp; Accountability</span>
      </div>
      <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Audit Logs</h1>
      <p className="mt-1 text-sm text-muted-foreground max-w-2xl">
        A read-only, append-only record of every important administrative action
        taken in the platform — user approvals, role assignments, content
        publishing, and finance entries.
      </p>
    </div>
  );
}
