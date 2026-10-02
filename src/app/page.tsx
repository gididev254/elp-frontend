// Embuni ELC — public home page (server component).
// Renders hero, mission, quick stats, featured programs/events/news,
// leadership teaser, and a CTA to join the chapter.

import Link from "next/link";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  ArrowRight,
  CalendarDays,
  Users,
  GraduationCap,
  HeartHandshake,
  Newspaper,
  MapPin,
  Phone,
  Mail,
  Quote,
} from "lucide-react";
import { format, isPast, isFuture } from "date-fns";
import { Logo } from "@/components/layout/logo";

async function getHomeData() {
  const [leadersCount, eventsUpcoming, newsRecent, programs] = await Promise.all([
    db.user.count({
      where: {
        status: "active",
        userRoles: { some: { role: { key: "LEADER" } } },
      },
    }),
    db.event.findMany({
      where: { status: "published", startAt: { gte: new Date() } },
      orderBy: { startAt: "asc" },
      take: 3,
    }),
    db.newsArticle.findMany({
      where: { status: "published" },
      orderBy: { publishedAt: "desc" },
      take: 3,
    }),
    db.program.findMany({
      where: { status: "published" },
      take: 4,
    }),
  ]);
  return { leadersCount, eventsUpcoming, newsRecent, programs };
}

const STATS = [
  { icon: Users, label: "Active Leaders", value: null as number | null, suffix: "+" },
  { icon: CalendarDays, label: "Events / Year", value: 18, suffix: "+" },
  { icon: GraduationCap, label: "Programs", value: null as number | null, suffix: "" },
  { icon: HeartHandshake, label: "Years of Service", value: 6, suffix: "+" },
];

const VALUES = [
  {
    icon: GraduationCap,
    title: "Academic Excellence",
    description:
      "We support chapter leaders with mentorship, resources and peer learning that lift academic outcomes across the chapter.",
  },
  {
    icon: HeartHandshake,
    title: "Service to Community",
    description:
      "From school visits to environmental drives, our leaders give back to Embu County through structured service activities.",
  },
  {
    icon: Users,
    title: "Leadership Development",
    description:
      "Each executive role carries real responsibility. Our leaders graduate with the experience of having led a chapter.",
  },
];

export default async function HomePage() {
  const { leadersCount, eventsUpcoming, newsRecent, programs } = await getHomeData();
  const stats = STATS.map((s) => ({
    ...s,
    value:
      s.label === "Active Leaders"
        ? leadersCount
        : s.label === "Programs"
        ? programs.length
        : s.value,
  }));

  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden bg-brand-gradient text-primary-foreground">
        <div className="absolute inset-0 bg-grid-pattern opacity-30 pointer-events-none" />
        <div className="absolute inset-0 bg-radial-brand pointer-events-none" />
        <div className="container mx-auto px-4 md:px-6 py-16 md:py-24 lg:py-32 relative">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6 max-w-xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-white backdrop-blur">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
                </span>
                University of Embu &middot; Equity Leaders Chapter
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-balance leading-[1.05] text-white">
                Leading today.{" "}
                <span className="text-gold">Building tomorrow.</span>
              </h1>
              <p className="text-base md:text-lg text-white/85 leading-relaxed">
                The official digital home of the Embuni Equity Leaders Chapter —
                centralising records, programs, events and engagement for present
                and future chapter leaders at the University of Embu.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90 border-0">
                  <Link href="/register">
                    Join the chapter
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10 hover:text-white">
                  <Link href="/about">Learn about us</Link>
                </Button>
              </div>
              <div className="flex items-center gap-6 text-xs text-white/70">
                <div className="flex items-center gap-1.5">
                  <GraduationCap className="h-3.5 w-3.5 text-gold" />
                  <span>University of Embu</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-gold" />
                  <span>Embu, Kenya</span>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="aspect-[4/3] rounded-xl overflow-hidden shadow-xl ring-1 ring-border bg-secondary">
                { }
                <img
                  src="/images/hero/hero-home.png"
                  alt="Embuni ELC leaders collaborating in the campus library"
                  className="h-full w-full object-cover"
                  loading="eager"
                />
              </div>
              <div className="absolute -bottom-4 -left-4 hidden md:flex items-center gap-3 rounded-lg bg-background p-3 pr-5 shadow-lg ring-1 ring-border">
                <div className="flex -space-x-2">
                  {["avatar-1.png", "avatar-2.png", "avatar-3.png", "avatar-4.png"].map((a) => (
                    <Avatar key={a} className="h-8 w-8 border-2 border-background">
                      <AvatarImage src={`/images/${a}`} alt="" />
                      <AvatarFallback>ELC</AvatarFallback>
                    </Avatar>
                  ))}
                </div>
                <div className="text-xs">
                  <div className="font-semibold">{leadersCount}+ active leaders</div>
                  <div className="text-muted-foreground">across all year groups</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="border-y border-border bg-section-alt">
        <div className="container mx-auto px-4 md:px-6 py-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((s) => (
              <div key={s.label} className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary shrink-0">
                  <s.icon className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-2xl font-bold leading-none">
                    {s.value ?? "—"}{s.suffix}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* VALUES */}
      <section className="container mx-auto px-4 md:px-6 py-16 md:py-20">
        <div className="max-w-2xl mb-10">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
            Our chapter at a glance
          </h2>
          <p className="mt-3 text-muted-foreground">
            Three commitments anchor everything the Embuni Equity Leaders Chapter does.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {VALUES.map((v) => (
            <Card key={v.title} className="border-border/70 hover:border-primary/30 transition-colors">
              <CardHeader>
                <div className="flex h-11 w-11 items-center justify-center rounded-md bg-primary/10 text-primary mb-2">
                  <v.icon className="h-5 w-5" />
                </div>
                <CardTitle className="text-xl">{v.title}</CardTitle>
                <CardDescription className="text-sm leading-relaxed">
                  {v.description}
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      {/* FEATURED PROGRAMS */}
      <section className="bg-section-alt border-y border-border">
        <div className="container mx-auto px-4 md:px-6 py-16 md:py-20">
          <div className="flex items-end justify-between gap-4 mb-10">
            <div className="max-w-xl">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Featured programs</h2>
              <p className="mt-3 text-muted-foreground">
                Structured initiatives that run throughout the academic year.
              </p>
            </div>
            <Button asChild variant="ghost" className="hidden sm:inline-flex">
              <Link href="/programs">
                All programs
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
            {programs.map((p) => (
              <Link key={p.id} href={`/programs/${p.slug}`} className="group">
                <Card className="overflow-hidden h-full hover:border-primary/30 transition-colors">
                  <div className="aspect-[16/10] bg-secondary overflow-hidden">
                    { }
                    <img
                      src={p.coverUrl ?? "/images/programs/program-1.png"}
                      alt={p.title}
                      className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  <CardContent className="p-4 space-y-2">
                    <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
                      {p.category ?? "program"}
                    </Badge>
                    <h3 className="font-semibold leading-snug line-clamp-2">{p.title}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-2">{p.summary}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* UPCOMING EVENTS */}
      <section className="container mx-auto px-4 md:px-6 py-16 md:py-20">
        <div className="flex items-end justify-between gap-4 mb-10">
          <div className="max-w-xl">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Upcoming events</h2>
            <p className="mt-3 text-muted-foreground">
              The next chapter activities on the calendar.
            </p>
          </div>
          <Button asChild variant="ghost" className="hidden sm:inline-flex">
            <Link href="/events">
              All events
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
        {eventsUpcoming.length === 0 ? (
          <p className="text-sm text-muted-foreground">No upcoming events scheduled.</p>
        ) : (
          <div className="grid md:grid-cols-3 gap-5">
            {eventsUpcoming.map((e) => (
              <Link key={e.id} href={`/events/${e.slug}`} className="group">
                <Card className="overflow-hidden h-full hover:border-primary/30 transition-colors">
                  <div className="aspect-[16/9] bg-secondary overflow-hidden">
                    { }
                    <img
                      src={e.coverUrl ?? "/images/events/event-1.png"}
                      alt={e.title}
                      className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <CalendarDays className="h-3.5 w-3.5" />
                      <span>{format(e.startAt, "EEE, d MMM yyyy")}</span>
                      <span className="text-border">•</span>
                      <span>{format(e.startAt, "h:mm a")}</span>
                    </div>
                    <h3 className="font-semibold leading-snug line-clamp-2">{e.title}</h3>
                    {e.venue && (
                      <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                        <span>{e.venue}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* LATEST NEWS */}
      <section className="bg-section-alt border-y border-border">
        <div className="container mx-auto px-4 md:px-6 py-16 md:py-20">
          <div className="flex items-end justify-between gap-4 mb-10">
            <div className="max-w-xl">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Latest news</h2>
              <p className="mt-3 text-muted-foreground">
                Announcements and updates from the chapter executive.
              </p>
            </div>
            <Button asChild variant="ghost" className="hidden sm:inline-flex">
              <Link href="/news">
                All news
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {newsRecent.map((n) => (
              <Link key={n.id} href={`/news/${n.slug}`} className="group">
                <Card className="overflow-hidden h-full hover:border-primary/30 transition-colors">
                  <div className="aspect-[16/9] bg-secondary overflow-hidden">
                    { }
                    <img
                      src={n.coverUrl ?? "/images/news/news-1.png"}
                      alt={n.title}
                      className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Newspaper className="h-3.5 w-3.5" />
                      <span>{n.category}</span>
                      {n.publishedAt && (
                        <>
                          <span className="text-border">•</span>
                          <span>{format(n.publishedAt, "d MMM yyyy")}</span>
                        </>
                      )}
                    </div>
                    <h3 className="font-semibold leading-snug line-clamp-2">{n.title}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-2">{n.summary}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 md:px-6 py-16 md:py-24">
        <div className="rounded-2xl bg-brand-gradient text-primary-foreground p-8 md:p-12 relative overflow-hidden">
          <div className="absolute inset-0 bg-grid-pattern opacity-10" />
          <div className="relative grid md:grid-cols-3 gap-6 items-center">
            <div className="md:col-span-2 space-y-3">
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
                Are you a University of Embu student?
              </h2>
              <p className="text-sm md:text-base opacity-90 max-w-2xl">
                Join the Embuni Equity Leaders Chapter. Build your leadership,
                serve the community, and connect with peers across the university.
                Registration is open to all <code className="bg-primary-foreground/10 px-1.5 py-0.5 rounded text-xs">@embuni.ac.ke</code> emails.
              </p>
            </div>
            <div className="flex flex-col gap-3 md:items-end">
              <Button asChild size="lg" className="w-full md:w-auto bg-accent text-accent-foreground hover:bg-accent/90 border-0">
                <Link href="/register">
                  Join the chapter
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="ghost" className="w-full md:w-auto text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground">
                <Link href="/contacts">Contact us</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
