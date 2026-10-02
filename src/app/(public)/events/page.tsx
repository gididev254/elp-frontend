// Embuni ELC — /events public page (server component).
// Hero, Upcoming events section, Past events section.

import Link from "next/link";
import { db } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Clock, MapPin, ArrowRight, CalendarCheck } from "lucide-react";
import { format } from "date-fns";

export const metadata = {
  title: "Events",
  description:
    "Upcoming and past chapter events at the Embuni Equity Leaders Chapter — ceremonies, workshops, outreach, social gatherings and more.",
};

export default async function EventsPage() {
  const now = new Date();
  const [upcoming, past] = await Promise.all([
    db.event.findMany({
      where: { status: "published", startAt: { gte: now } },
      orderBy: { startAt: "asc" },
    }),
    db.event.findMany({
      where: { status: { in: ["published", "completed"] }, startAt: { lt: now } },
      orderBy: { startAt: "desc" },
      take: 6,
    }),
  ]);

  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-to-br from-background via-background to-secondary/40 border-b border-border">
        <div className="absolute inset-0 bg-grid-pattern opacity-30 pointer-events-none" />
        <div className="absolute inset-0 bg-radial-brand pointer-events-none" />
        <div className="container mx-auto px-4 md:px-6 py-16 md:py-24 relative">
          <div className="max-w-2xl space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
              <CalendarCheck className="h-3.5 w-3.5" />
              Chapter Calendar
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-balance leading-[1.05]">
              Events
            </h1>
            <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
              Chapter activities throughout the academic year — ceremonies,
              workshops, outreach drives, mentorship sessions and social
              gatherings.
            </p>
          </div>
        </div>
      </section>

      {/* UPCOMING */}
      <section className="container mx-auto px-4 md:px-6 py-16 md:py-20">
        <div className="flex items-end justify-between gap-4 mb-8">
          <div className="max-w-xl">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Upcoming events</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              The next chapter activities on the calendar.
            </p>
          </div>
        </div>
        {upcoming.length === 0 ? (
          <div className="rounded-xl border border-border bg-secondary/30 p-10 text-center">
            <CalendarDays className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              No upcoming events scheduled. Check back soon.
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {upcoming.map((e) => (
              <EventCard key={e.id} event={e} />
            ))}
          </div>
        )}
      </section>

      {/* PAST */}
      {past.length > 0 && (
        <section className="bg-section-alt border-t border-border">
          <div className="container mx-auto px-4 md:px-6 py-16 md:py-20">
            <div className="flex items-end justify-between gap-4 mb-8">
              <div className="max-w-xl">
                <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Past events</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  A look back at recently concluded chapter activities.
                </p>
              </div>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {past.map((e) => (
                <EventCard key={e.id} event={e} isPast />
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}

type EventListItem = {
  id: string;
  title: string;
  slug: string;
  summary: string;
  category?: string | null;
  coverUrl?: string | null;
  venue?: string | null;
  location?: string | null;
  startAt: Date;
  status: string;
  capacity?: number | null;
};

function EventCard({ event, isPast = false }: { event: EventListItem; isPast?: boolean }) {
  return (
    <Link href={`/events/${event.slug}`} className="group">
      <Card className="overflow-hidden h-full hover:border-primary/30 transition-colors">
        <div className="aspect-[16/9] bg-secondary overflow-hidden relative">
          { }
          <img
            src={event.coverUrl ?? "/images/events/event-1.png"}
            alt={event.title}
            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
          {isPast && (
            <div className="absolute top-3 left-3">
              <Badge variant="outline" className="bg-background/90 text-[10px] uppercase tracking-wide">
                Past
              </Badge>
            </div>
          )}
        </div>
        <CardContent className="p-5 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {event.category && (
              <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
                {event.category}
              </Badge>
            )}
            <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5" />
              {format(event.startAt, "EEE, d MMM yyyy")}
            </span>
            <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {format(event.startAt, "h:mm a")}
            </span>
          </div>
          <h3 className="font-semibold leading-snug line-clamp-2">{event.title}</h3>
          <p className="text-sm text-muted-foreground line-clamp-2">{event.summary}</p>
          {(event.venue || event.location) && (
            <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span>
                {event.venue}
                {event.venue && event.location ? ", " : ""}
                {event.location}
              </span>
            </div>
          )}
          <div className="inline-flex items-center gap-1.5 text-xs font-medium text-primary">
            View details
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
