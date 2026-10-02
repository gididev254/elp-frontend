import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { resolveUser } from "@/lib/rbac/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ROLE_LABELS } from "@/components/dashboard/nav-config";
import { redirect } from "next/navigation";
import { Settings2 } from "lucide-react";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login?callbackUrl=/settings");
  const user = await resolveUser(session.user.id);
  if (!user) redirect("/login");

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground mb-1">
          <Settings2 className="h-3.5 w-3.5" />
          <span>Account</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your account preferences and notification settings.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Account information</CardTitle>
          <CardDescription>Your role and account status.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Email</span>
            <span className="text-sm font-medium">{user.email}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Name</span>
            <span className="text-sm font-medium">{user.name ?? "—"}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Primary role</span>
            <Badge variant="default" className="text-[10px] uppercase tracking-wide">
              {ROLE_LABELS[user.primaryRole ?? "LEADER"] ?? user.primaryRole}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Status</span>
            <Badge variant={user.status === "active" ? "default" : "outline"} className="text-[10px] uppercase tracking-wide">
              {user.status}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Notification preferences</CardTitle>
          <CardDescription>Choose which notifications you receive.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Notification preferences will be available in a future update. Currently, all
            in-app notifications are enabled for your role.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Security</CardTitle>
          <CardDescription>Password and session management.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Password changes are managed by the chapter executive in v1. Contact
            <a href="mailto:elc@embuni.ac.ke" className="text-primary hover:underline ml-1">elc@embuni.ac.ke</a>
            {" "}to change your password.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
