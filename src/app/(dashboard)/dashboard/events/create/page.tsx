// /dashboard/events/create — full-page event create form.
// Server component that checks `events.manage` permission and renders
// the client EventCreateForm.

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { resolveUser } from "@/lib/rbac/server";
import { redirect } from "next/navigation";
import { EventCreateForm } from "@/components/dashboard/event-create-form";
import { Card, CardContent } from "@/components/ui/card";
import { ShieldAlert } from "lucide-react";

export const metadata = { title: "New Event" };

export default async function CreateEventPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login?callbackUrl=/dashboard/events/create");
  const user = await resolveUser(session.user.id);
  if (!user) redirect("/login");

  const canManage =
    user.permissions.has("events.manage") || user.permissions.has("admin.system");

  if (!canManage) {
    return (
      <div className="space-y-6">
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="p-6 flex items-start gap-3">
            <ShieldAlert className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div className="text-sm space-y-1">
              <div className="font-medium">No access</div>
              <p className="text-muted-foreground">
                You do not have permission to create events. Contact the President
                or Organizing Secretary if you believe this is an error.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <EventCreateForm />;
}
