// Embuni ELC — /programs public page (server component).
// Hero, category filter bar (static), and grid of published programs.

import Link from "next/link";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, CalendarDays, Compass } from "lucide-react";
import { format } from "date-fns";

const CATEGORIES = [
  { key: "all", label: "All" },
  { key: "mentorship", label: "Mentorship" },
  { key: "leadership", label: "Leadership" },
  { key: "community", label: "Community" },
  { key: "career", label: "Career" },
];

export const metadata = {
  title: "Programs",
  description:
    "Structured chapter programs at the Embuni Equity Leaders Chapter — mentorship, leadership, community and career initiatives running throughout the academic year.",
};

export default async function ProgramsPage() {
  const programs = await db.program.findMany({
    where: { status: "published" },
    orderBy: { publishedAt: "desc" },
  });

  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-to-br from-background via-background to-secondary/40 border-b border-border">
        <div className="absolute inset-0 bg-grid-pattern opacity-30 pointer-events-none" />
        <div className="absolute inset-0 bg-radial-brand pointer-events-none" />
        <div className="container mx-auto px-4 md:px-6 py-16 md:py-24 relative">
          <div className="max-w-2xl space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
              <Compass className="h-3.5 w-3.5" />
              Chapter Programs
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-balance leading-[1.05]">
              Programs
            </h1>
            <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
              Structured initiatives that run throughout the academic year.
              Each program is owned by a member of the chapter executive.
            </p>
          </div>
        </div>
      </section>

      {/* FILTER BAR + GRID */}
      <section className="container mx-auto px-4 md:px-6 py-16 md:py-20">
        {/* Filter bar — visual only (no JS state). Categories serve as anchor labels. */}
        <div className="flex flex-wrap items-center gap-2 mb-10">
          {CATEGORIES.map((c, idx) => (
            <Badge
              key={c.key}
              variant={idx === 0 ? "default" : "outline"}
              className="cursor-default text-xs uppercase tracking-wide"
            >
              {c.label}
            </Badge>
          ))}
        </div>

        {programs.length === 0 ? (
          <div className="rounded-xl border border-border bg-secondary/30 p-10 text-center">
            <p className="text-sm text-muted-foreground">
              No programs are currently published. Check back soon.
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {programs.map((p) => (
              <Link key={p.id} href={`/programs/${p.slug}`} className="group">
                <Card className="overflow-hidden h-full hover:border-primary/30 transition-colors">
                  <div className="aspect-[16/10] bg-secondary overflow-hidden">
                    { }
                    <img
                      src={p.coverUrl ?? "/images/hero/hero-about.png"}
                      alt={p.title}
                      className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                  </div>
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
                        {p.category ?? "program"}
                      </Badge>
                      {p.publishedAt && (
                        <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                          <CalendarDays className="h-3 w-3" />
                          <span>{format(p.publishedAt, "d MMM yyyy")}</span>
                        </div>
                      )}
                    </div>
                    <h3 className="font-semibold leading-snug line-clamp-2">{p.title}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-3">{p.summary}</p>
                    <div className="inline-flex items-center gap-1.5 text-xs font-medium text-primary">
                      Read more
                      <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 md:px-6 pb-16 md:pb-24">
        <div className="rounded-2xl bg-secondary/40 border border-border p-8 md:p-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <h2 className="text-2xl font-bold tracking-tight">Want to participate?</h2>
            <p className="text-sm text-muted-foreground">
              Chapter programs are open to all active leaders. Join the chapter
              to enrol in mentorship circles, leadership workshops and career
              readiness sessions.
            </p>
          </div>
          <Button asChild size="lg">
            <Link href="/register">
              Join the chapter
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>
    </>
  );
}
