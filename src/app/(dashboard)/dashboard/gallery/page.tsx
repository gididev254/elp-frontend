// /dashboard/gallery — Gallery management module.
// Executives with gallery.view see the list; gallery.manage can add/edit/delete.

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { resolveUser } from "@/lib/rbac/server";
import { db } from "@/lib/db";
import {
  GalleryManager,
  type GalleryItem,
} from "@/components/dashboard/gallery-manager";
import { Card, CardContent } from "@/components/ui/card";
import { Images, ShieldAlert } from "lucide-react";
import { redirect } from "next/navigation";

export const metadata = { title: "Gallery" };

export default async function GalleryPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");
  const user = await resolveUser(session.user.id);
  if (!user) redirect("/login");

  const canView =
    user.permissions.has("gallery.view") ||
    user.permissions.has("gallery.manage") ||
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
                You do not have permission to view the chapter gallery.
                Contact the Communications Director if you believe this is an
                error.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const canManage =
    user.permissions.has("gallery.manage") ||
    user.permissions.has("admin.system");

  const media = await db.galleryMedia.findMany({
    orderBy: [{ createdAt: "desc" }],
    take: 120,
  });

  const initialItems: GalleryItem[] = media.map((m) => ({
    id: m.id,
    title: m.title,
    caption: m.caption,
    imageUrl: m.imageUrl,
    album: m.album,
    eventId: m.eventId,
    status: m.status as GalleryItem["status"],
    createdAt: m.createdAt.toISOString(),
    updatedAt: m.updatedAt.toISOString(),
  }));

  const initialAlbums = Array.from(
    new Set(media.map((m) => m.album).filter((a): a is string => Boolean(a))),
  ).sort();

  return (
    <div className="space-y-6">
      <PageHeader />
      <GalleryManager
        initialItems={initialItems}
        initialAlbums={initialAlbums}
        canManage={canManage}
      />
    </div>
  );
}

function PageHeader() {
  return (
    <div>
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground mb-1">
        <Images className="h-3.5 w-3.5" />
        <span>Chapter Visual Records</span>
      </div>
      <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
        Gallery
      </h1>
      <p className="mt-1 text-sm text-muted-foreground max-w-2xl">
        Curate visual records of chapter activities — workshops, outreach,
        ceremonies and team moments. Group by album; link to events.
      </p>
    </div>
  );
}
