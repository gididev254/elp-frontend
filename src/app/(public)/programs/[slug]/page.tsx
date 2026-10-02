// Embuni ELC — /programs/[slug] public detail page (server component).

import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Clock,
  MapPin,
  Users,
} from "lucide-react";
import { format } from "date-fns";

export const dynamic = 'force-dynamic';

type Params = { slug: string };

export async function generateMetadata({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const program = await db.program.findUnique({ where: { slug } });
  if (!program || program.status !== "published") {
    return { title: "Program not found" };
  }
  return {
    title: program.title,
    description: program.summary,
  };
}

export default async function ProgramDetailPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const program = await db.program.findUnique({
    where: { slug },
    include: {
      events: {
        where: { status: { in: ["published", "ongoing", "completed"] } },
        orderBy: { startAt: "asc" },
      },
    },
  });

  if (!program || program.status !== "published") {
    notFound();
  }

  const upcomingEvents = program.events.filter((e) => new Date(e.startAt) >= new Date());
  const pastEvents = program.events.filter((e) => new Date(e.startAt) < new Date());

  return (
    <>
      {/* HERO */}
      <section className="relative border-b border-border bg-gradient-to-br from-background via-background to-secondary/40">
        <div className="absolute inset-0 bg-grid-pattern opacity-20 pointer-events-none" />
        <div className="container mx-auto px-4 md:px-6 py-12 md:py-20 relative">
          <Link
            href="/programs"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            All programs
          </Link>

          <div className="grid lg:grid-cols-5 gap-10 items-start">
            <div className="lg:col-span-3 space-y-5">
              <div className="flex flex-wrap items-center gap-2">
                {program.category && (
                  <Badge variant="secondary" className="uppercase tracking-wide text-[10px]">
                    {program.category}
                  </Badge>
                )}
                {program.publishedAt && (
                  <span className="text-xs text-muted-foreground inline-flex items-center gap-1.5">
                    <CalendarDays className="h-3.5 w-3.5" />
                    Published {format(program.publishedAt, "d MMM yyyy")}
                  </span>
                )}
              </div>
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-balance leading-[1.1]">
                {program.title}
              </h1>
              <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
                {program.summary}
              </p>
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button asChild size="lg">
                  <Link href="/register">
                    Join this program
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link href="/contacts">Ask a question</Link>
                </Button>
              </div>
            </div>
            <div className="lg:col-span-2">
              <div className="aspect-[4/3] rounded-xl overflow-hidden ring-1 ring-border shadow-sm bg-secondary">
                { }
                <img
                  src={program.coverUrl ?? "/images/hero/hero-about.png"}
                  alt={program.title}
                  className="h-full w-full object-cover"
                  loading="eager"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* BODY */}
      <section className="container mx-auto px-4 md:px-6 py-16 md:py-20">
        <div className="grid lg:grid-cols-3 gap-10">
          <article className="lg:col-span-2 space-y-4">
            <h2 className="text-2xl font-bold tracking-tight">About this program</h2>
            <div className="prose prose-stone max-w-none text-muted-foreground leading-relaxed whitespace-pre-line">
              {program.description}
            </div>
          </article>

          <aside className="space-y-4">
            <Card className="border-border/70">
              <CardHeader>
                <CardTitle className="text-base">Program details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <Row label="Category" value={program.category ?? "—"} />
                <Row label="Status" value={<Badge variant="secondary" className="text-[10px] uppercase tracking-wide">{program.status}</Badge>} />
                <Row
                  label="Published"
                  value={program.publishedAt ? format(program.publishedAt, "d MMM yyyy") : "—"}
                />
                <Row
                  label="Updated"
                  value={format(program.updatedAt, "d MMM yyyy")}
                />
              </CardContent>
            </Card>

            <Card className="bg-secondary/30 border-border/70">
              <CardContent className="p-5 space-y-3">
                <h3 className="text-sm font-semibold">Eligibility</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Open to all active chapter leaders at the University of Embu.
                  New members must register and be approved before enrolling in
                  program activities.
                </p>
                <Button asChild size="sm" className="w-full">
                  <Link href="/register">
                    Become a leader
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </aside>
        </div>
      </section>

      {/* RELATED EVENTS */}
      {(upcomingEvents.length > 0 || pastEvents.length > 0) && (
        <section className="bg-section-alt border-t border-border">
          <div className="container mx-auto px-4 md:px-6 py-16 md:py-20">
            <div className="max-w-2xl mb-10">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
                Events under this program
              </h2>
              <p className="mt-3 text-muted-foreground">
                Upcoming and past chapter events tied to {program.title}.
              </p>
            </div>

            {upcomingEvents.length > 0 && (
              <div className="mb-10">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
                  Upcoming
                </h3>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {upcomingEvents.map((e) => (
                    <EventMiniCard key={e.id} event={e} />
                  ))}
                </div>
              </div>
            )}

            {pastEvents.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
                  Past
                </h3>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {pastEvents.map((e) => (
                    <EventMiniCard key={e.id} event={e} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}
    </>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}

function EventMiniCard({
  event,
}: {
  event: {
    id: string;
    title: string;
    slug: string;
    startAt: Date;
    venue?: string | null;
    coverUrl?: string | null;
  };
}) {
  return (
    <Link href={`/events/${event.slug}`} className="group">
      <Card className="overflow-hidden h-full hover:border-primary/30 transition-colors">
        <div className="aspect-[16/9] bg-secondary overflow-hidden">
          { }
          <img
            src={event.coverUrl ?? "/images/events/event-1.png"}
            alt={event.title}
            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        </div>
        <CardContent className="p-4 space-y-2">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <CalendarDays className="h-3.5 w-3.5" />
            <span>{format(event.startAt, "EEE, d MMM yyyy")}</span>
            <span className="text-border">•</span>
            <Clock className="h-3 w-3" />
            <span>{format(event.startAt, "h:mm a")}</span>
          </div>
          <h4 className="font-semibold leading-snug line-clamp-2">{event.title}</h4>
          {event.venue && (
            <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span>{event.venue}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
