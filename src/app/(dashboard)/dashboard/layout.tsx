// Dashboard layout — wraps every /dashboard/* route.
// Server component: checks auth and redirects unauthenticated users to /login.
// Renders the DashboardShell client component with the page content inside.

import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { DashboardShell } from "@/components/dashboard/shell";
import { resolveUser } from "@/lib/rbac/server";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/dashboard");
  }

  const user = await resolveUser(session.user.id);
  if (!user) {
    redirect("/login?callbackUrl=/dashboard&error=unresolved");
  }
  if (user.status === "pending") {
    redirect("/login?error=pending");
  }
  if (user.status !== "active") {
    redirect("/login?error=" + user.status);
  }

  return <DashboardShell>{children}</DashboardShell>;
}
