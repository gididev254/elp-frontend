// Embuni ELC — /events/[slug] public detail page (server component).

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
  Compass,
} from "lucide-react";
import { format } from "date-fns";

export const dynamic = 'force-dynamic';

type Params = { slug: string };

export async function generateMetadata({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const event = await db.event.findUnique({ where: { slug } });
  if (!event || !["published", "ongoing", "completed"].includes(event.status)) {
    return { title: "Event not found" };
  }
  return {
    title: event.title,
    description: event.summary,
  };
}

export default async function EventDetailPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const event = await db.event.findUnique({
    where: { slug },
    include: {
      program: true,
      registrations: { where: { status: { not: "cancelled" } } },
    },
  });

  if (
    !event ||
    !["published", "ongoing", "completed"].includes(event.status)
  ) {
    notFound();
  }

  const isPast = new Date(event.startAt) < new Date();
  const spotsTaken = event.registrations.length;
  const spotsLeft =
    event.capacity != null ? Math.max(0, event.capacity - spotsTaken) : null;

  return (
    <>
      {/* HERO */}
      <section className="relative border-b border-border bg-gradient-to-br from-background via-background to-secondary/40">
        <div className="absolute inset-0 bg-grid-pattern opacity-20 pointer-events-none" />
        <div className="container mx-auto px-4 md:px-6 py-12 md:py-20 relative">
          <Link
            href="/events"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            All events
          </Link>

          <div className="grid lg:grid-cols-5 gap-10 items-start">
            <div className="lg:col-span-3 space-y-5">
              <div className="flex flex-wrap items-center gap-2">
                {event.category && (
                  <Badge variant="secondary" className="uppercase tracking-wide text-[10px]">
                    {event.category}
                  </Badge>
                )}
                <Badge
                  variant={isPast ? "outline" : "default"}
                  className="uppercase tracking-wide text-[10px]"
                >
                  {isPast ? "Past event" : "Upcoming"}
                </Badge>
              </div>
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-balance leading-[1.1]">
                {event.title}
              </h1>
              <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
                {event.summary}
              </p>

              <div className="flex flex-wrap gap-4 pt-2 text-sm">
                <div className="inline-flex items-center gap-2 text-foreground">
                  <CalendarDays className="h-4 w-4 text-primary" />
                  {format(event.startAt, "EEEE, d MMM yyyy")}
                </div>
                <div className="inline-flex items-center gap-2 text-foreground">
                  <Clock className="h-4 w-4 text-primary" />
                  {format(event.startAt, "h:mm a")}
                  {event.endAt && ` – ${format(event.endAt, "h:mm a")}`}
                </div>
                {event.venue && (
                  <div className="inline-flex items-center gap-2 text-foreground">
                    <MapPin className="h-4 w-4 text-primary" />
                    {event.venue}
                  </div>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                {!isPast ? (
                  <Button asChild size="lg">
                    <Link href="/login">
                      Register for this event
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                ) : (
                  <Button asChild size="lg" variant="outline">
                    <Link href="/gallery">View photos</Link>
                  </Button>
                )}
                <Button asChild size="lg" variant="ghost">
                  <Link href="/contacts">Ask a question</Link>
                </Button>
              </div>
            </div>

            <div className="lg:col-span-2">
              <div className="aspect-[4/3] rounded-xl overflow-hidden ring-1 ring-border shadow-sm bg-secondary">
                { }
                <img
                  src={event.coverUrl ?? "/images/events/event-1.png"}
                  alt={event.title}
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
            <h2 className="text-2xl font-bold tracking-tight">About this event</h2>
            <div className="prose prose-stone max-w-none text-muted-foreground leading-relaxed whitespace-pre-line">
              {event.description}
            </div>

            {event.program && (
              <div className="mt-8 rounded-xl border border-border bg-secondary/30 p-5">
                <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
                  <Compass className="h-3.5 w-3.5" />
                  Part of program
                </div>
                <Link
                  href={`/programs/${event.program.slug}`}
                  className="inline-flex items-center gap-1.5 text-base font-semibold text-foreground hover:text-primary transition-colors"
                >
                  {event.program.title}
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <p className="text-sm text-muted-foreground mt-1">
                  {event.program.summary}
                </p>
              </div>
            )}
          </article>

          {/* METADATA SIDE PANEL */}
          <aside>
            <Card className="border-border/70 sticky top-24">
              <CardHeader>
                <CardTitle className="text-base">Event details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <Detail
                  icon={CalendarDays}
                  label="Date"
                  value={format(event.startAt, "EEEE, d MMM yyyy")}
                />
                <Detail
                  icon={Clock}
                  label="Time"
                  value={
                    event.endAt
                      ? `${format(event.startAt, "h:mm a")} – ${format(event.endAt, "h:mm a")}`
                      : format(event.startAt, "h:mm a")
                  }
                />
                {event.venue && (
                  <Detail icon={MapPin} label="Venue" value={event.venue} />
                )}
                {event.location && (
                  <Detail icon={MapPin} label="Location" value={event.location} />
                )}
                {event.capacity != null && (
                  <Detail
                    icon={Users}
                    label="Capacity"
                    value={`${event.capacity} attendees`}
                  />
                )}
                {spotsLeft != null && !isPast && (
                  <div className="rounded-md bg-primary/5 border border-primary/20 p-3">
                    <div className="text-xs text-muted-foreground">Spots remaining</div>
                    <div className="text-lg font-semibold text-primary">
                      {spotsLeft} / {event.capacity}
                    </div>
                  </div>
                )}
                {!isPast && (
                  <Button asChild className="w-full">
                    <Link href="/login">
                      Register now
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          </aside>
        </div>
      </section>
    </>
  );
}

function Detail({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary shrink-0">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="font-medium">{value}</div>
      </div>
    </div>
  );
}
