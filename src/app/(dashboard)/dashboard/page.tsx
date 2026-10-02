// Dashboard home — role-aware landing page.
// Renders a personalised hero + role-specific widgets based on the user's
// primary role. Each role gets a distinct dashboard experience.

import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { resolveUser } from "@/lib/rbac/server";
import { db } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ROLE_LABELS } from "@/components/dashboard/nav-config";
import {
  Users,
  CalendarDays,
  Newspaper,
  Megaphone,
  Bell,
  GraduationCap,
  Wallet,
  AlertCircle,
  ScrollText,
  Settings2,
  FolderKanban,
  ArrowRight,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { format, isFuture, isPast } from "date-fns";

export default async function DashboardHomePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  const user = await resolveUser(session.user.id);
  if (!user) return null;

  const roleLabel = ROLE_LABELS[user.primaryRole ?? "LEADER"] ?? "Leader";
  const firstName = user.name?.split(" ")[0] ?? "Leader";

  // Common data: upcoming events, recent announcements, unread notifications, recent news.
  const [upcomingEvents, recentAnnouncements, unreadNotifs, recentNews, leadersCount, programsCount, newsCount, eventsCount, pendingUsersCount] = await Promise.all([
    db.event.findMany({
      where: { status: "published", startAt: { gte: new Date() } },
      orderBy: { startAt: "asc" },
      take: 5,
    }),
    db.announcement.findMany({
      where: { status: "published" },
      orderBy: { publishedAt: "desc" },
      take: 3,
    }),
    db.notification.count({ where: { userId: user.id, read: false } }),
    db.newsArticle.findMany({
      where: { status: "published" },
      orderBy: { publishedAt: "desc" },
      take: 3,
    }),
    db.user.count({
      where: {
        status: "active",
        userRoles: { some: { role: { key: "LEADER" } } },
      },
    }),
    db.program.count({ where: { status: "published" } }),
    db.newsArticle.count({ where: { status: "published" } }),
    db.event.count({ where: { status: "published" } }),
    user.permissions.has("admin.users") ? db.user.count({ where: { status: "pending" } }) : 0,
  ]);

  // Role-specific quick actions and stats
  const roleActions = getRoleActions(user.primaryRole ?? "LEADER");
  const roleStats = getRoleStats({
    role: user.primaryRole ?? "LEADER",
    leadersCount,
    programsCount,
    newsCount,
    eventsCount,
    upcomingEvents: upcomingEvents.length,
    pendingUsers: pendingUsersCount,
    unreadNotifs,
  });

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="rounded-xl bg-brand-gradient text-primary-foreground p-6 md:p-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern opacity-10" />
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="text-xs uppercase tracking-wider opacity-80">
              {roleLabel} Dashboard
            </div>
            <h1 className="text-2xl md:text-3xl font-bold">Karibu, {firstName}.</h1>
            <p className="text-sm opacity-90 max-w-xl">
              {getRoleGreeting(user.primaryRole ?? "LEADER")}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {roleActions.slice(0, 3).map((a) => (
              <Button
                key={a.href}
                asChild
                size="sm"
                variant="secondary"
                className="bg-primary-foreground/10 hover:bg-primary-foreground/20 text-primary-foreground"
              >
                <Link href={a.href}>
                  <a.icon className="h-4 w-4 mr-1.5" />
                  {a.label}
                </Link>
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {roleStats.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4 md:p-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary shrink-0">
                <s.icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="text-xl md:text-2xl font-bold leading-none">{s.value}</div>
                <div className="text-[11px] md:text-xs text-muted-foreground mt-1 truncate">
                  {s.label}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main grid: 2 cols */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left: upcoming events */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <div>
              <CardTitle className="text-lg">Upcoming events</CardTitle>
              <CardDescription>Next chapter activities on the calendar.</CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/dashboard/events">
                View all
                <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcomingEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">
                No upcoming events scheduled.
              </p>
            ) : (
              upcomingEvents.map((e) => (
                <Link
                  key={e.id}
                  href={`/dashboard/events`}
                  className="flex items-center gap-3 rounded-md border border-border/70 p-3 hover:border-primary/30 hover:bg-secondary/40 transition-colors"
                >
                  <div className="flex flex-col items-center justify-center rounded-md bg-secondary px-2.5 py-1.5 min-w-[3rem]">
                    <div className="text-[10px] uppercase font-semibold text-muted-foreground">
                      {format(e.startAt, "MMM")}
                    </div>
                    <div className="text-lg font-bold leading-none">
                      {format(e.startAt, "d")}
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-sm truncate">{e.title}</div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                      <Clock className="h-3 w-3" />
                      <span>{format(e.startAt, "EEE, h:mm a")}</span>
                      {e.venue && (
                        <>
                          <span className="text-border">•</span>
                          <span className="truncate">{e.venue}</span>
                        </>
                      )}
                    </div>
                  </div>
                  {e.category && (
                    <Badge variant="secondary" className="text-[10px] uppercase tracking-wide shrink-0">
                      {e.category}
                    </Badge>
                  )}
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        {/* Right: notifications + announcements */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Bell className="h-4 w-4 text-primary" />
                Notifications
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Unread</span>
                <Badge variant={unreadNotifs > 0 ? "default" : "secondary"}>{unreadNotifs}</Badge>
              </div>
              <Button asChild variant="outline" size="sm" className="w-full">
                <Link href="/dashboard/notifications">
                  View notifications
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Megaphone className="h-4 w-4 text-primary" />
                Announcements
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {recentAnnouncements.length === 0 ? (
                <p className="text-xs text-muted-foreground py-3">No announcements yet.</p>
              ) : (
                recentAnnouncements.map((a) => (
                  <div key={a.id} className="text-sm space-y-0.5">
                    <div className="font-medium line-clamp-1">{a.title}</div>
                    <div className="text-xs text-muted-foreground line-clamp-2">{a.body}</div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Role-specific spotlight */}
      {renderRoleSpotlight({
        role: user.primaryRole ?? "LEADER",
        upcomingEvents,
        recentNews,
        pendingUsers: pendingUsersCount,
      })}

      {/* Recent news */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <div>
            <CardTitle className="text-lg">Recent news</CardTitle>
            <CardDescription>Latest chapter updates.</CardDescription>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link href="/dashboard/news">
              View all
              <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {recentNews.map((n) => (
            <Link key={n.id} href="/dashboard/news" className="group">
              <div className="rounded-md border border-border/70 overflow-hidden hover:border-primary/30 transition-colors">
                <div className="aspect-[16/9] bg-secondary overflow-hidden">
                  { }
                  <img
                    src={n.coverUrl ?? "/images/news/news-1.png"}
                    alt={n.title}
                    className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div className="p-3 space-y-1">
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    <span className="uppercase tracking-wide">{n.category}</span>
                    {n.publishedAt && (
                      <>
                        <span>•</span>
                        <span>{format(n.publishedAt, "d MMM yyyy")}</span>
                      </>
                    )}
                  </div>
                  <div className="font-medium text-sm line-clamp-2">{n.title}</div>
                </div>
              </div>
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

// ---- Role-specific helpers ----

function getRoleGreeting(role: string): string {
  const map: Record<string, string> = {
    SUPER_ADMIN: "You have full system access. Review pending registrations and manage roles.",
    PRESIDENT: "Here's the chapter overview. Monitor executive activities and approve key actions.",
    VICE_PRESIDENT: "Support the President and oversee delegated executive responsibilities.",
    SECRETARY_GENERAL: "Manage chapter records, minutes and official documentation.",
    ORGANIZING_SECRETARY: "Coordinate events, activities and attendance for the chapter.",
    TREASURER: "Track chapter finances, budgets, income and expenditure.",
    COMMUNICATIONS_DIRECTOR: "Publish news, announcements and chapter content.",
    MENTORSHIP_COORDINATOR: "Coordinate mentorship programs and track mentor-mentee progress.",
    ALUMNI_MANAGER: "Maintain alumni records and engagement activities.",
    MALE_Y1_REPRESENTATIVE: "Represent Male Year 1 Leaders. View their concerns and coordinate activities.",
    FEMALE_Y1_REPRESENTATIVE: "Represent Female Year 1 Leaders. View their concerns and coordinate activities.",
    ASSISTANT_FEMALE_Y1_REPRESENTATIVE: "Support the Female Year 1 Representative with assigned duties.",
    LEADER: "Welcome to your chapter dashboard. Stay updated on events, programs and announcements.",
  };
  return map[role] ?? map.LEADER;
}

function getRoleActions(role: string): { href: string; label: string; icon: typeof Users }[] {
  const map: Record<string, { href: string; label: string; icon: typeof Users }[]> = {
    SUPER_ADMIN: [
      { href: "/dashboard/admin", label: "Review pending", icon: Settings2 },
      { href: "/dashboard/audit", label: "Audit logs", icon: ScrollText },
      { href: "/dashboard/leaders", label: "Leaders", icon: Users },
    ],
    PRESIDENT: [
      { href: "/dashboard/leaders", label: "Leaders", icon: Users },
      { href: "/dashboard/audit", label: "Audit logs", icon: ScrollText },
      { href: "/dashboard/events", label: "Events", icon: CalendarDays },
    ],
    VICE_PRESIDENT: [
      { href: "/dashboard/leaders", label: "Leaders", icon: Users },
      { href: "/dashboard/events", label: "Events", icon: CalendarDays },
      { href: "/dashboard/notifications", label: "Notifications", icon: Bell },
    ],
    SECRETARY_GENERAL: [
      { href: "/dashboard/news", label: "News & minutes", icon: Newspaper },
      { href: "/dashboard/resources", label: "Resources", icon: FolderKanban },
      { href: "/dashboard/audit", label: "Audit logs", icon: ScrollText },
    ],
    ORGANIZING_SECRETARY: [
      { href: "/dashboard/events", label: "Events", icon: CalendarDays },
      { href: "/dashboard/gallery", label: "Gallery", icon: Newspaper },
      { href: "/dashboard/leaders", label: "Leaders", icon: Users },
    ],
    TREASURER: [
      { href: "/dashboard/finance", label: "Finance", icon: Wallet },
      { href: "/dashboard/leaders", label: "Leaders", icon: Users },
      { href: "/dashboard/events", label: "Events", icon: CalendarDays },
    ],
    COMMUNICATIONS_DIRECTOR: [
      { href: "/dashboard/news", label: "News", icon: Newspaper },
      { href: "/dashboard/announcements", label: "Announcements", icon: Megaphone },
      { href: "/dashboard/gallery", label: "Gallery", icon: Newspaper },
    ],
    MENTORSHIP_COORDINATOR: [
      { href: "/dashboard/mentorship", label: "Mentorship", icon: GraduationCap },
      { href: "/dashboard/leaders", label: "Leaders", icon: Users },
      { href: "/dashboard/events", label: "Events", icon: CalendarDays },
    ],
    ALUMNI_MANAGER: [
      { href: "/dashboard/leaders", label: "Leaders", icon: Users },
      { href: "/dashboard/events", label: "Events", icon: CalendarDays },
      { href: "/dashboard/notifications", label: "Notifications", icon: Bell },
    ],
    MALE_Y1_REPRESENTATIVE: [
      { href: "/dashboard/leaders", label: "Male Year 1", icon: Users },
      { href: "/dashboard/concerns", label: "Concerns", icon: AlertCircle },
      { href: "/dashboard/events", label: "Events", icon: CalendarDays },
    ],
    FEMALE_Y1_REPRESENTATIVE: [
      { href: "/dashboard/leaders", label: "Female Year 1", icon: Users },
      { href: "/dashboard/concerns", label: "Concerns", icon: AlertCircle },
      { href: "/dashboard/events", label: "Events", icon: CalendarDays },
    ],
    ASSISTANT_FEMALE_Y1_REPRESENTATIVE: [
      { href: "/dashboard/leaders", label: "Female Year 1", icon: Users },
      { href: "/dashboard/concerns", label: "Concerns", icon: AlertCircle },
      { href: "/dashboard/notifications", label: "Notifications", icon: Bell },
    ],
    LEADER: [
      { href: "/dashboard/events", label: "Events", icon: CalendarDays },
      { href: "/dashboard/notifications", label: "Notifications", icon: Bell },
      { href: "/profile", label: "My profile", icon: Users },
    ],
  };
  return map[role] ?? map.LEADER;
}

function getRoleStats({
  role,
  leadersCount,
  programsCount,
  newsCount,
  eventsCount,
  upcomingEvents,
  pendingUsers,
  unreadNotifs,
}: {
  role: string;
  leadersCount: number;
  programsCount: number;
  newsCount: number;
  eventsCount: number;
  upcomingEvents: number;
  pendingUsers: number;
  unreadNotifs: number;
}): { label: string; value: number | string; icon: typeof Users }[] {
  const common: { label: string; value: number; icon: typeof Users }[] = [
    { label: "Upcoming events", value: upcomingEvents, icon: CalendarDays },
    { label: "Programs", value: programsCount, icon: FolderKanban },
    { label: "News articles", value: newsCount, icon: Newspaper },
    { label: "Notifications", value: unreadNotifs, icon: Bell },
  ];

  // Role-specific stats replace some of the common stats
  switch (role) {
    case "SUPER_ADMIN":
      return [
        { label: "Pending approvals", value: pendingUsers, icon: Users },
        { label: "Active leaders", value: leadersCount, icon: Users },
        { label: "Total events", value: eventsCount, icon: CalendarDays },
        { label: "Notifications", value: unreadNotifs, icon: Bell },
      ];
    case "PRESIDENT":
    case "VICE_PRESIDENT":
      return [
        { label: "Active leaders", value: leadersCount, icon: Users },
        { label: "Upcoming events", value: upcomingEvents, icon: CalendarDays },
        { label: "Programs", value: programsCount, icon: FolderKanban },
        { label: "Notifications", value: unreadNotifs, icon: Bell },
      ];
    case "SECRETARY_GENERAL":
      return [
        { label: "Active leaders", value: leadersCount, icon: Users },
        { label: "News articles", value: newsCount, icon: Newspaper },
        { label: "Upcoming events", value: upcomingEvents, icon: CalendarDays },
        { label: "Notifications", value: unreadNotifs, icon: Bell },
      ];
    case "ORGANIZING_SECRETARY":
      return [
        { label: "Upcoming events", value: upcomingEvents, icon: CalendarDays },
        { label: "Total events", value: eventsCount, icon: CalendarDays },
        { label: "Active leaders", value: leadersCount, icon: Users },
        { label: "Notifications", value: unreadNotifs, icon: Bell },
      ];
    case "TREASURER":
      return [
        { label: "Active leaders", value: leadersCount, icon: Users },
        { label: "Upcoming events", value: upcomingEvents, icon: CalendarDays },
        { label: "Programs", value: programsCount, icon: FolderKanban },
        { label: "Notifications", value: unreadNotifs, icon: Bell },
      ];
    case "COMMUNICATIONS_DIRECTOR":
      return [
        { label: "News articles", value: newsCount, icon: Newspaper },
        { label: "Programs", value: programsCount, icon: FolderKanban },
        { label: "Upcoming events", value: upcomingEvents, icon: CalendarDays },
        { label: "Notifications", value: unreadNotifs, icon: Bell },
      ];
    case "MENTORSHIP_COORDINATOR":
      return [
        { label: "Active leaders", value: leadersCount, icon: Users },
        { label: "Programs", value: programsCount, icon: FolderKanban },
        { label: "Upcoming events", value: upcomingEvents, icon: CalendarDays },
        { label: "Notifications", value: unreadNotifs, icon: Bell },
      ];
    case "ALUMNI_MANAGER":
      return [
        { label: "Active leaders", value: leadersCount, icon: Users },
        { label: "Upcoming events", value: upcomingEvents, icon: CalendarDays },
        { label: "Programs", value: programsCount, icon: FolderKanban },
        { label: "Notifications", value: unreadNotifs, icon: Bell },
      ];
    case "MALE_Y1_REPRESENTATIVE":
    case "FEMALE_Y1_REPRESENTATIVE":
    case "ASSISTANT_FEMALE_Y1_REPRESENTATIVE":
      return [
        { label: "Upcoming events", value: upcomingEvents, icon: CalendarDays },
        { label: "Programs", value: programsCount, icon: FolderKanban },
        { label: "News articles", value: newsCount, icon: Newspaper },
        { label: "Notifications", value: unreadNotifs, icon: Bell },
      ];
    default:
      return common;
  }
}

function renderRoleSpotlight({
  role,
  upcomingEvents,
  recentNews,
  pendingUsers,
}: {
  role: string;
  upcomingEvents: { id: string; title: string; startAt: Date; venue: string | null }[];
  recentNews: { id: string; title: string }[];
  pendingUsers: number;
}) {
  // For Super Admin — show pending approvals spotlight
  if (role === "SUPER_ADMIN") {
    return (
      <Card className="border-accent/40 bg-accent/5">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-accent" />
            Administrator attention required
          </CardTitle>
          <CardDescription>
            {pendingUsers > 0
              ? `${pendingUsers} registration${pendingUsers === 1 ? "" : "s"} awaiting your approval.`
              : "No pending approvals. System is healthy."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild size="sm">
            <Link href="/dashboard/admin">
              Review registrations
              <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  // For Year-1 Reps — show concerns spotlight
  if (["MALE_Y1_REPRESENTATIVE", "FEMALE_Y1_REPRESENTATIVE", "ASSISTANT_FEMALE_Y1_REPRESENTATIVE"].includes(role)) {
    const cohort = role === "MALE_Y1_REPRESENTATIVE" ? "Male Year 1" : "Female Year 1";
    return (
      <Card className="border-primary/30 bg-primary/5">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            {cohort} Leader representation
          </CardTitle>
          <CardDescription>
            Your dashboard gives you scoped visibility to {cohort.toLowerCase()} leaders and
            their concerns. Submit concerns to the executive on their behalf.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button asChild size="sm" variant="default">
            <Link href="/dashboard/leaders">
              View {cohort} leaders
              <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href="/dashboard/concerns">
              Submit a concern
              <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  // For Treasurer — show finance spotlight
  if (role === "TREASURER") {
    return (
      <Card className="border-primary/30">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Wallet className="h-4 w-4 text-primary" />
            Treasury overview
          </CardTitle>
          <CardDescription>
            Manage chapter income, expenditure, budgets and financial reports.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild size="sm">
            <Link href="/dashboard/finance">
              Open finance module
              <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  // For Comms Director — show communications spotlight
  if (role === "COMMUNICATIONS_DIRECTOR") {
    return (
      <Card className="border-primary/30">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Megaphone className="h-4 w-4 text-primary" />
            Communications hub
          </CardTitle>
          <CardDescription>
            Publish news, announcements, manage gallery and chapter content.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button asChild size="sm" variant="default">
            <Link href="/dashboard/news">
              <Newspaper className="h-4 w-4 mr-1.5" />
              News
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href="/dashboard/announcements">
              <Megaphone className="h-4 w-4 mr-1.5" />
              Announcements
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  // For Mentorship Coordinator
  if (role === "MENTORSHIP_COORDINATOR") {
    return (
      <Card className="border-primary/30">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-primary" />
            Mentorship programs
          </CardTitle>
          <CardDescription>
            Coordinate mentor-mentee pairings and track mentorship session progress.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild size="sm">
            <Link href="/dashboard/mentorship">
              Open mentorship
              <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  // For Organizing Secretary
  if (role === "ORGANIZING_SECRETARY") {
    return (
      <Card className="border-primary/30">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-primary" />
            Events & activities
          </CardTitle>
          <CardDescription>
            Plan, schedule and coordinate chapter events. Track attendance.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild size="sm">
            <Link href="/dashboard/events">
              Manage events
              <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  // For Secretary General
  if (role === "SECRETARY_GENERAL") {
    return (
      <Card className="border-primary/30">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            Records & documentation
          </CardTitle>
          <CardDescription>
            Manage chapter records, meeting minutes, official documents and audit logs.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button asChild size="sm" variant="default">
            <Link href="/dashboard/news">News & minutes</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href="/dashboard/audit">Audit logs</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  // For Alumni Manager
  if (role === "ALUMNI_MANAGER") {
    return (
      <Card className="border-primary/30">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            Alumni engagement
          </CardTitle>
          <CardDescription>
            Maintain alumni records and coordinate engagement activities.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild size="sm">
            <Link href="/dashboard/leaders">
              View leaders
              <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  // For President / VP — chapter-wide spotlight
  if (role === "PRESIDENT" || role === "VICE_PRESIDENT") {
    return (
      <Card className="border-primary/30">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            Chapter oversight
          </CardTitle>
          <CardDescription>
            You have chapter-wide visibility. Monitor executive activities, audit trail and reports.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button asChild size="sm" variant="default">
            <Link href="/dashboard/leaders">All leaders</Link>
          </Button>
          {role === "PRESIDENT" && (
            <Button asChild size="sm" variant="outline">
              <Link href="/dashboard/audit">Audit logs</Link>
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  // Default (Leader)
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Your chapter at a glance</CardTitle>
        <CardDescription>
          Stay engaged with chapter events, programs and announcements.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button asChild size="sm" variant="default">
          <Link href="/dashboard/events">Browse events</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
