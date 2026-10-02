// Dashboard route group layout.
// Wraps all dashboard routes with auth protection.
// The actual dashboard shell (sidebar + topbar) is in (dashboard)/dashboard/layout.tsx.
// Non-dashboard routes in this group (like /profile) use the root layout's header/footer.

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { resolveUser } from "@/lib/rbac/server";
import { redirect } from "next/navigation";

export default async function DashboardGroupLayout({ children }: { children: React.ReactNode }) {
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

  return <>{children}</>;
}
