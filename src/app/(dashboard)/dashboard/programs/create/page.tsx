// /dashboard/programs/create — full-page program create form.
// Server component that checks `programs.manage` permission and renders
// the client ProgramCreateForm.

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { resolveUser } from "@/lib/rbac/server";
import { redirect } from "next/navigation";
import { ProgramCreateForm } from "@/components/dashboard/program-create-form";
import { Card, CardContent } from "@/components/ui/card";
import { ShieldAlert } from "lucide-react";

export const metadata = { title: "New Program" };

export default async function CreateProgramPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login?callbackUrl=/dashboard/programs/create");
  const user = await resolveUser(session.user.id);
  if (!user) redirect("/login");

  const canManage =
    user.permissions.has("programs.manage") || user.permissions.has("admin.system");

  if (!canManage) {
    return (
      <div className="space-y-6">
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="p-6 flex items-start gap-3">
            <ShieldAlert className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div className="text-sm space-y-1">
              <div className="font-medium">No access</div>
              <p className="text-muted-foreground">
                You do not have permission to create programs. Contact the President
                or Secretary General if you believe this is an error.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <ProgramCreateForm />;
}
