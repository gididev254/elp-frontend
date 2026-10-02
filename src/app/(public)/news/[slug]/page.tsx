// Embuni ELC — /news/[slug] public detail page (server component).

import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, ArrowRight, CalendarDays, User } from "lucide-react";
import { format } from "date-fns";

export const dynamic = 'force-dynamic';

type Params = { slug: string };

const CATEGORY_LABELS: Record<string, string> = {
  announcement: "Announcement",
  update: "Update",
  story: "Story",
  event_recap: "Event Recap",
  minute: "Minutes",
};

export async function generateMetadata({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const article = await db.newsArticle.findUnique({
    where: { slug },
    include: { author: { include: { profile: true } } },
  });
  if (!article || article.status !== "published") {
    return { title: "Article not found" };
  }
  return {
    title: article.title,
    description: article.summary,
  };
}

export default async function NewsArticlePage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const article = await db.newsArticle.findUnique({
    where: { slug },
    include: {
      author: { include: { profile: true } },
    },
  });

  if (!article || article.status !== "published") {
    notFound();
  }

  const authorName = article.author?.profile?.fullName ?? "Chapter Executive";
  const authorAvatar = article.author?.profile?.avatarUrl ?? null;
  const authorInitials = authorName
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <>
      {/* HERO */}
      <section className="relative border-b border-border bg-gradient-to-br from-background via-background to-secondary/40">
        <div className="absolute inset-0 bg-grid-pattern opacity-20 pointer-events-none" />
        <div className="container mx-auto px-4 md:px-6 py-12 md:py-16 relative">
          <div className="max-w-3xl mx-auto space-y-5 text-center">
            <Link
              href="/news"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to all news
            </Link>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {article.category && (
                <Badge variant="secondary" className="uppercase tracking-wide text-[10px]">
                  {CATEGORY_LABELS[article.category] ?? article.category}
                </Badge>
              )}
              {article.publishedAt && (
                <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {format(article.publishedAt, "d MMM yyyy")}
                </span>
              )}
            </div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-balance leading-[1.15]">
              {article.title}
            </h1>
            <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
              {article.summary}
            </p>

            <div className="flex items-center justify-center gap-3 pt-2">
              <Avatar className="h-10 w-10 border border-border">
                {authorAvatar ? (
                  <AvatarImage src={authorAvatar} alt={authorName} />
                ) : null}
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                  {authorInitials}
                </AvatarFallback>
              </Avatar>
              <div className="text-left">
                <div className="text-sm font-medium">{authorName}</div>
                <div className="text-xs text-muted-foreground inline-flex items-center gap-1">
                  <User className="h-3 w-3" />
                  Chapter Executive
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* COVER */}
      <section className="container mx-auto px-4 md:px-6 pt-10 md:pt-12">
        <div className="max-w-4xl mx-auto">
          <div className="aspect-[16/9] rounded-xl overflow-hidden ring-1 ring-border shadow-sm bg-secondary">
            { }
            <img
              src={article.coverUrl ?? "/images/news/news-1.png"}
              alt={article.title}
              className="h-full w-full object-cover"
              loading="eager"
            />
          </div>
        </div>
      </section>

      {/* BODY */}
      <section className="container mx-auto px-4 md:px-6 py-12 md:py-16">
        <article className="max-w-3xl mx-auto">
          <div className="prose prose-stone max-w-none whitespace-pre-line text-[15px] leading-[1.85] text-foreground/90">
            {article.body}
          </div>

          <div className="mt-12 pt-8 border-t border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold">Want more chapter news?</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Browse all announcements, updates and stories from the executive.
              </p>
            </div>
            <Button asChild variant="outline">
              <Link href="/news">
                <ArrowLeft className="mr-2 h-4 w-4" />
                All news
              </Link>
            </Button>
          </div>
        </article>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 md:px-6 pb-16 md:pb-24">
        <div className="max-w-3xl mx-auto rounded-2xl bg-brand-gradient text-primary-foreground p-8 md:p-10 relative overflow-hidden">
          <div className="absolute inset-0 bg-grid-pattern opacity-10" />
          <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="space-y-2 max-w-md">
              <h2 className="text-xl md:text-2xl font-bold tracking-tight">
                Join the chapter
              </h2>
              <p className="text-sm opacity-90">
                Be part of the next story. Registration is open to all
                University of Embu students.
              </p>
            </div>
            <Button asChild size="lg" variant="secondary">
              <Link href="/register">
                Join now
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
