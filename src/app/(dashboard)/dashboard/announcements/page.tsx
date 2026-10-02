// /dashboard/announcements — Announcements management module.
// Executives with announcements.view see the list; announcements.manage can create/edit/publish/archive.

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { resolveUser } from "@/lib/rbac/server";
import { db } from "@/lib/db";
import {
  AnnouncementsManager,
  type AnnouncementItem,
} from "@/components/dashboard/announcements-manager";
import { Card, CardContent } from "@/components/ui/card";
import { Megaphone, ShieldAlert } from "lucide-react";
import { redirect } from "next/navigation";

export const metadata = { title: "Announcements" };

const AUDIENCE_LABELS: Record<string, string> = {
  all: "Everyone",
  leaders: "All Leaders",
  executive: "Executive Committee",
  year1: "Year 1 (All)",
  male_y1: "Male Year 1",
  female_y1: "Female Year 1",
};

export default async function AnnouncementsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");
  const user = await resolveUser(session.user.id);
  if (!user) redirect("/login");

  const canView =
    user.permissions.has("announcements.view") ||
    user.permissions.has("announcements.manage") ||
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
                You do not have permission to view chapter announcements.
                Contact the Secretary General or Communications Director if
                you believe this is an error.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const canManage =
    user.permissions.has("announcements.manage") ||
    user.permissions.has("admin.system");

  const announcements = await db.announcement.findMany({
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    take: 60,
    include: {
      author: {
        select: {
          id: true,
          profile: { select: { preferredName: true, fullName: true } },
        },
      },
    },
  });

  const initialAnnouncements: AnnouncementItem[] = announcements.map((a) => ({
    id: a.id,
    title: a.title,
    body: a.body,
    audience: a.audience,
    audienceLabel: AUDIENCE_LABELS[a.audience] ?? a.audience,
    status: a.status as AnnouncementItem["status"],
    publishedAt: a.publishedAt?.toISOString() ?? null,
    authorId: a.authorId,
    authorName:
      a.author?.profile?.preferredName ??
      a.author?.profile?.fullName ??
      null,
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <PageHeader />
      <AnnouncementsManager
        initialAnnouncements={initialAnnouncements}
        canManage={canManage}
      />
    </div>
  );
}

function PageHeader() {
  return (
    <div>
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground mb-1">
        <Megaphone className="h-3.5 w-3.5" />
        <span>Chapter Communications</span>
      </div>
      <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
        Announcements
      </h1>
      <p className="mt-1 text-sm text-muted-foreground max-w-2xl">
        Draft, publish, and archive chapter announcements. Target the whole
        chapter, the executive committee, or a specific Year-1 cohort.
      </p>
    </div>
  );
}
