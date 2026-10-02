// /dashboard/news — News management module.
// Executives with news.view see the list; news.manage can create/edit/publish/archive.

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { resolveUser } from "@/lib/rbac/server";
import { db } from "@/lib/db";
import { NewsManager, type NewsItem } from "@/components/dashboard/news-manager";
import { Card, CardContent } from "@/components/ui/card";
import { Newspaper, ShieldAlert } from "lucide-react";
import { redirect } from "next/navigation";

export const metadata = { title: "News" };

export default async function NewsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");
  const user = await resolveUser(session.user.id);
  if (!user) redirect("/login");

  const canView =
    user.permissions.has("news.view") ||
    user.permissions.has("news.manage") ||
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
                You do not have permission to view chapter news. Contact the President, Secretary General, or Communications Director if you believe this is an error.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const canManage =
    user.permissions.has("news.manage") || user.permissions.has("admin.system");

  const articles = await db.newsArticle.findMany({
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    take: 60,
    include: {
      author: { include: { profile: true } },
    },
  });

  const initialArticles: NewsItem[] = articles.map((a) => ({
    id: a.id,
    title: a.title,
    slug: a.slug,
    summary: a.summary,
    body: a.body,
    category: a.category,
    coverUrl: a.coverUrl,
    status: a.status as NewsItem["status"],
    publishedAt: a.publishedAt?.toISOString() ?? null,
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
    authorId: a.authorId,
    author: a.author
      ? { id: a.author.id, name: a.author.profile?.fullName ?? a.author.email }
      : null,
  }));

  return (
    <div className="space-y-6">
      <PageHeader />
      <NewsManager initialArticles={initialArticles} canManage={canManage} />
    </div>
  );
}

function PageHeader() {
  return (
    <div>
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground mb-1">
        <Newspaper className="h-3.5 w-3.5" />
        <span>Chapter News</span>
      </div>
      <h1 className="text-2xl md:text-3xl font-bold tracking-tight">News</h1>
      <p className="mt-1 text-sm text-muted-foreground max-w-2xl">
        Publish announcements, updates, member stories, event recaps, and meeting minutes for the chapter.
      </p>
    </div>
  );
}
