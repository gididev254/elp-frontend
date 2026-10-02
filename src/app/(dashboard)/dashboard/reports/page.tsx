// /dashboard/reports — Reports module.
// Requires the `reports.view` permission. Pre-fetches the role-scoped overview
// server-side (which decides what data to show based on the user's primary role)
// and hands it to the ReportsViewer client component for rendering + CSV export.

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { resolveUser } from "@/lib/rbac/server";
import { buildReportOverview, type ReportOverview } from "@/lib/reports/overview";
import { ReportsViewer } from "@/components/dashboard/reports-viewer";
import { Card, CardContent } from "@/components/ui/card";
import { BarChart3, ShieldAlert } from "lucide-react";
import { redirect } from "next/navigation";

export const metadata = { title: "Reports" };

export default async function ReportsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");
  const user = await resolveUser(session.user.id);
  if (!user) redirect("/login");

  const canView =
    user.permissions.has("reports.view") || user.permissions.has("admin.system");
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
                You do not have permission to view reports. Only executive
                officers and the Technical Administrator can access this module.
                Contact the President if you believe this is an error.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Pre-fetch the overview server-side so the client has initial data.
  const overview: ReportOverview = await buildReportOverview(user);

  return (
    <div className="space-y-6">
      <PageHeader />
      <ReportsViewer initialOverview={overview} />
    </div>
  );
}

function PageHeader() {
  return (
    <div>
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground mb-1">
        <BarChart3 className="h-3.5 w-3.5" />
        <span>Insights</span>
      </div>
      <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Reports</h1>
      <p className="mt-1 text-sm text-muted-foreground max-w-2xl">
        Role-scoped overview of the chapter&apos;s leaders, events, finance,
        attendance, mentorship, and alumni. Export any module as CSV for record-keeping.
      </p>
    </div>
  );
}
