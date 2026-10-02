// Embuni ELC — /news public page (server component).

import Link from "next/link";
import { db } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Newspaper, ArrowRight, CalendarDays } from "lucide-react";
import { format } from "date-fns";

export const dynamic = 'force-dynamic';

export const metadata = {
  title: "News & Announcements",
  description:
    "Announcements, updates, stories and event recaps from the Embuni Equity Leaders Chapter executive.",
};

const CATEGORY_LABELS: Record<string, string> = {
  announcement: "Announcement",
  update: "Update",
  story: "Story",
  event_recap: "Event Recap",
  minute: "Minutes",
};

export default async function NewsPage() {
  const articles = await db.newsArticle.findMany({
    where: { status: "published" },
    orderBy: { publishedAt: "desc" },
  });

  const [featured, ...rest] = articles;

  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-to-br from-background via-background to-secondary/40 border-b border-border">
        <div className="absolute inset-0 bg-grid-pattern opacity-30 pointer-events-none" />
        <div className="absolute inset-0 bg-radial-brand pointer-events-none" />
        <div className="container mx-auto px-4 md:px-6 py-16 md:py-24 relative">
          <div className="max-w-2xl space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
              <Newspaper className="h-3.5 w-3.5" />
              Chapter Newsroom
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-balance leading-[1.05]">
              News &amp; Announcements
            </h1>
            <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
              Official announcements, updates, stories and event recaps from
              the chapter executive.
            </p>
          </div>
        </div>
      </section>

      {/* FEATURED */}
      {featured && (
        <section className="container mx-auto px-4 md:px-6 py-16 md:py-20">
          <Link href={`/news/${featured.slug}`} className="group block">
            <Card className="overflow-hidden hover:border-primary/30 transition-colors">
              <div className="grid md:grid-cols-2 gap-0">
                <div className="aspect-[16/10] md:aspect-auto md:h-full bg-secondary overflow-hidden">
                  { }
                  <img
                    src={featured.coverUrl ?? "/images/news/news-1.png"}
                    alt={featured.title}
                    className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="eager"
                  />
                </div>
                <CardContent className="p-8 md:p-10 flex flex-col justify-center space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className="uppercase tracking-wide text-[10px]">
                      Featured
                    </Badge>
                    {featured.category && (
                      <Badge variant="secondary" className="uppercase tracking-wide text-[10px]">
                        {CATEGORY_LABELS[featured.category] ?? featured.category}
                      </Badge>
                    )}
                  </div>
                  <h2 className="text-2xl md:text-3xl font-bold tracking-tight leading-tight line-clamp-3">
                    {featured.title}
                  </h2>
                  <p className="text-sm md:text-base text-muted-foreground leading-relaxed line-clamp-4">
                    {featured.summary}
                  </p>
                  {featured.publishedAt && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <CalendarDays className="h-3.5 w-3.5" />
                      {format(featured.publishedAt, "EEEE, d MMM yyyy")}
                    </div>
                  )}
                  <div className="inline-flex items-center gap-1.5 text-sm font-medium text-primary">
                    Read article
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </CardContent>
              </div>
            </Card>
          </Link>
        </section>
      )}

      {/* GRID */}
      {rest.length > 0 && (
        <section className="bg-section-alt border-t border-border">
          <div className="container mx-auto px-4 md:px-6 py-16 md:py-20">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-8">
              More from the newsroom
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {rest.map((n) => (
                <Link key={n.id} href={`/news/${n.slug}`} className="group">
                  <Card className="overflow-hidden h-full hover:border-primary/30 transition-colors">
                    <div className="aspect-[16/9] bg-secondary overflow-hidden">
                      { }
                      <img
                        src={n.coverUrl ?? "/images/news/news-1.png"}
                        alt={n.title}
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                    </div>
                    <CardContent className="p-5 space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        {n.category && (
                          <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
                            {CATEGORY_LABELS[n.category] ?? n.category}
                          </Badge>
                        )}
                        {n.publishedAt && (
                          <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                            <CalendarDays className="h-3 w-3" />
                            {format(n.publishedAt, "d MMM yyyy")}
                          </span>
                        )}
                      </div>
                      <h3 className="font-semibold leading-snug line-clamp-2">{n.title}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-3">{n.summary}</p>
                      <div className="inline-flex items-center gap-1.5 text-xs font-medium text-primary">
                        Read more
                        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {articles.length === 0 && (
        <section className="container mx-auto px-4 md:px-6 py-16 md:py-20">
          <div className="rounded-xl border border-border bg-secondary/30 p-10 text-center">
            <Newspaper className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              No news articles have been published yet. Check back soon.
            </p>
          </div>
        </section>
      )}
    </>
  );
}
