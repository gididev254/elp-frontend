// /profile — current user's profile page.
// Lets the user view and edit permitted profile fields.

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { resolveUser } from "@/lib/rbac/server";
import { db } from "@/lib/db";
import { ProfileEditor } from "@/components/dashboard/profile-editor";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ROLE_LABELS } from "@/components/dashboard/nav-config";
import { redirect } from "next/navigation";

export const metadata = { title: "My Profile" };

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login?callbackUrl=/profile");

  const user = await resolveUser(session.user.id);
  if (!user) redirect("/login");

  const fullUser = await db.user.findUnique({
    where: { id: user.id },
    include: { profile: true, userRoles: { include: { role: true } } },
  });
  if (!fullUser) redirect("/login");

  const initials = (fullUser.profile?.fullName ?? fullUser.email)
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const roles = fullUser.userRoles.map((ur) => ur.role);

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">My Profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          View and update your chapter profile information.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Account overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-4">
            <Avatar className="h-16 w-16 border border-border">
              <AvatarImage src={fullUser.profile?.avatarUrl ?? undefined} alt="" />
              <AvatarFallback className="bg-primary/10 text-primary text-base font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-lg">{fullUser.profile?.fullName ?? fullUser.email}</div>
              <div className="text-sm text-muted-foreground">{fullUser.email}</div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {roles.map((r) => (
                  <Badge
                    key={r.key}
                    variant={r.key === user.primaryRole ? "default" : "secondary"}
                    className="text-[10px] uppercase tracking-wide"
                  >
                    {ROLE_LABELS[r.key] ?? r.name}
                  </Badge>
                ))}
              </div>
              <div className="mt-2 text-xs">
                Status:{" "}
                <Badge
                  variant={fullUser.status === "active" ? "default" : "outline"}
                  className="text-[10px] uppercase tracking-wide"
                >
                  {fullUser.status}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <ProfileEditor
        profile={{
          fullName: fullUser.profile?.fullName ?? "",
          preferredName: fullUser.profile?.preferredName ?? "",
          gender: fullUser.profile?.gender ?? "",
          yearOfStudy: fullUser.profile?.yearOfStudy ?? null,
          school: fullUser.profile?.school ?? "",
          program: fullUser.profile?.program ?? "",
          phone: fullUser.profile?.phone ?? "",
          bio: fullUser.profile?.bio ?? "",
          avatarUrl: fullUser.profile?.avatarUrl ?? "",
        }}
      />
    </div>
  );
}
