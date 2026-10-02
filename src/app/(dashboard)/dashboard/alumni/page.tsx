// /dashboard/alumni — Alumni management module.
// Alumni Manager + executives with alumni.view see the list;
// alumni.manage can create/edit/archive records.

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { resolveUser } from "@/lib/rbac/server";
import { db } from "@/lib/db";
import {
  AlumniManager,
  type AlumniItem,
} from "@/components/dashboard/alumni-manager";
import { Card, CardContent } from "@/components/ui/card";
import { GraduationCap, ShieldAlert } from "lucide-react";
import { redirect } from "next/navigation";

export const metadata = { title: "Alumni" };

export default async function AlumniPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");
  const user = await resolveUser(session.user.id);
  if (!user) redirect("/login");

  const canView =
    user.permissions.has("alumni.view") ||
    user.permissions.has("alumni.manage") ||
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
                You do not have permission to view alumni records. Contact the Alumni
                Manager, President, or Super Admin if you believe this is an error.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const canManage =
    user.permissions.has("alumni.manage") || user.permissions.has("admin.system");

  // Pre-fetch alumni records (default: status="active", latest first).
  const alumni = await db.alumni.findMany({
    where: { status: "active" },
    orderBy: [{ graduationYear: "desc" }, { fullName: "asc" }],
    take: 300,
  });

  const initialAlumni: AlumniItem[] = alumni.map((a) => ({
    id: a.id,
    userId: a.userId,
    fullName: a.fullName,
    email: a.email,
    phone: a.phone,
    graduationYear: a.graduationYear,
    formerRole: a.formerRole,
    school: a.school,
    program: a.program,
    currentOccupation: a.currentOccupation,
    company: a.company,
    linkedinUrl: a.linkedinUrl,
    bio: a.bio,
    avatarUrl: a.avatarUrl,
    engagementLevel: a.engagementLevel as AlumniItem["engagementLevel"],
    status: a.status as AlumniItem["status"],
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <PageHeader />
      <AlumniManager initialAlumni={initialAlumni} canManage={canManage} />
    </div>
  );
}

function PageHeader() {
  return (
    <div>
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground mb-1">
        <GraduationCap className="h-3.5 w-3.5" />
        <span>Alumni</span>
      </div>
      <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Alumni</h1>
      <p className="mt-1 text-sm text-muted-foreground max-w-2xl">
        Maintain a directory of former chapter leaders who have graduated. Track their
        engagement level, current occupation, and mentorship availability.
      </p>
    </div>
  );
}
