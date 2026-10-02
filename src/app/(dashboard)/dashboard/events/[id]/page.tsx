// /dashboard/events/[id] — Event detail page (server component).
// Fetches a single event by ID and shows full details + registrations.
// Executives with events.manage get Publish/Archive action buttons.

import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { resolveUser } from "@/lib/rbac/server";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { EventActions } from "@/components/dashboard/event-actions";
import { format } from "date-fns";
import {
  ArrowLeft,
  CalendarDays,
  Tag,
  MapPin,
  Clock,
  Users,
  ExternalLink,
  Pencil,
  Send,
  Archive,
} from "lucide-react";

type Params = { id: string };

export const metadata = { title: "Event details" };

const CATEGORY_LABELS: Record<string, string> = {
  workshop: "Workshop",
  seminar: "Seminar",
  outreach: "Outreach",
  social: "Social",
  meeting: "Meeting",
  ceremony: "Ceremony",
};

const STATUS_BADGE: Record<
  string,
  { label: string; variant: "default" | "secondary" | "outline" | "destructive" }
> = {
  draft: { label: "Draft", variant: "secondary" },
  published: { label: "Published", variant: "default" },
  ongoing: { label: "Ongoing", variant: "default" },
  completed: { label: "Completed", variant: "outline" },
  cancelled: { label: "Cancelled", variant: "destructive" },
  archived: { label: "Archived", variant: "outline" },
};

export default async function EventDetailPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect(`/login?callbackUrl=/dashboard/events`);
  const user = await resolveUser(session.user.id);
  if (!user) redirect("/login");

  const canView =
    user.permissions.has("events.view") ||
    user.permissions.has("events.manage") ||
    user.permissions.has("admin.system");
  if (!canView) notFound();

  const canManage =
    user.permissions.has("events.manage") || user.permissions.has("admin.system");

  const { id } = await params;
  const event = await db.event.findUnique({
    where: { id },
    include: {
      program: { select: { id: true, title: true, slug: true } },
      registrations: {
        include: {
          user: {
            include: {
              profile: {
                select: { fullName: true, preferredName: true, avatarUrl: true },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 200,
      },
      _count: { select: { registrations: true, attendance: true } },
    },
  });

  if (!event) notFound();

  const status = STATUS_BADGE[event.status] ?? STATUS_BADGE.draft;
  const start = new Date(event.startAt);
  const end = event.endAt ? new Date(event.endAt) : null;
  const isPast = start.getTime() < Date.now();
  const registrations = event.registrations.filter((r) => r.status !== "cancelled");
  const spotsTaken = registrations.length;
  const spotsLeft =
    event.capacity != null ? Math.max(0, event.capacity - spotsTaken) : null;
  const capacityPct =
    event.capacity != null && event.capacity > 0
      ? Math.min(100, Math.round((spotsTaken / event.capacity) * 100))
      : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <Link
            href="/dashboard/events"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-1"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Events
          </Link>
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground mb-1">
            <CalendarDays className="h-3.5 w-3.5" />
            <span>Chapter Event</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            {event.title}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground max-w-2xl">
            {event.summary}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canManage && (
            <Button asChild variant="outline">
              <Link href={`/dashboard/events?edit=${event.id}`}>
                <Pencil className="h-4 w-4 mr-1.5" />
                Edit
              </Link>
            </Button>
          )}
          {["published", "ongoing", "completed"].includes(event.status) && (
            <Button asChild variant="ghost">
              <a
                href={`/events/${event.slug}`}
                target="_blank"
                rel="noreferrer"
              >
                <ExternalLink className="h-4 w-4 mr-1.5" />
                View public
              </a>
            </Button>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Cover */}
          <Card className="overflow-hidden">
            <div className="aspect-[16/9] bg-secondary/40 relative">
              {event.coverUrl ? (
                 
                <img
                  src={event.coverUrl}
                  alt={event.title}
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-muted-foreground">
                  <CalendarDays className="h-12 w-12 opacity-40" />
                </div>
              )}
              <div className="absolute top-3 left-3 flex gap-1.5">
                <Badge
                  variant={status.variant}
                  className="backdrop-blur-sm bg-background/80"
                >
                  {status.label}
                </Badge>
                {event.category && (
                  <Badge
                    variant="outline"
                    className="backdrop-blur-sm bg-background/80 text-[10px] capitalize"
                  >
                    <Tag className="h-2.5 w-2.5 mr-1" />
                    {CATEGORY_LABELS[event.category] ?? event.category}
                  </Badge>
                )}
              </div>
            </div>
          </Card>

          {/* Date / Venue / Location strip */}
          <div className="grid sm:grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-4 space-y-2">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">
                  When
                </div>
                <div className="flex items-start gap-2">
                  <CalendarDays className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                  <div>
                    <div className="font-medium">
                      {format(start, "EEEE, d MMM yyyy")}
                    </div>
                    <div className="text-sm text-muted-foreground flex items-center gap-1.5">
                      <Clock className="h-3 w-3" />
                      {format(start, "h:mm a")}
                      {end && (
                        <>
                          <span>—</span>
                          {format(end, "h:mm a")}
                        </>
                      )}
                    </div>
                  </div>
                </div>
                {isPast && (
                  <Badge variant="outline" className="text-[10px]">
                    Past event
                  </Badge>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 space-y-2">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">
                  Where
                </div>
                {event.venue ? (
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                    <div>
                      <div className="font-medium">{event.venue}</div>
                      {event.location && (
                        <div className="text-sm text-muted-foreground">
                          {event.location}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Venue TBA</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Description */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed whitespace-pre-line text-foreground/90">
                {event.description}
              </p>
            </CardContent>
          </Card>

          {/* Registrations list */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                Registrations
                <Badge variant="secondary" className="ml-auto text-[10px]">
                  {spotsTaken}
                  {event.capacity ? ` / ${event.capacity}` : ""}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {registrations.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">
                  No one has registered for this event yet.
                </p>
              ) : (
                <ul className="space-y-2 max-h-96 overflow-y-auto pr-1">
                  {registrations.map((r) => {
                    const name =
                      r.user?.profile?.preferredName ??
                      r.user?.profile?.fullName ??
                      r.user?.email ??
                      "Unknown";
                    const initials = name
                      .split(" ")
                      .map((s) => s[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase();
                    return (
                      <li key={r.id}>
                        <Link
                          href={r.user ? `/dashboard/leaders/${r.user.id}` : "#"}
                          className="flex items-center gap-3 py-2 border-b border-border last:border-0 hover:bg-secondary/40 -mx-2 px-2 rounded-sm"
                        >
                          <Avatar className="h-8 w-8 border border-border">
                            <AvatarImage
                              src={r.user?.profile?.avatarUrl ?? undefined}
                              alt={name}
                            />
                            <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium truncate">{name}</div>
                            <div className="text-xs text-muted-foreground truncate">
                              {r.user?.email}
                            </div>
                          </div>
                          <Badge
                            variant={
                              r.status === "attended"
                                ? "default"
                                : r.status === "cancelled"
                                  ? "destructive"
                                  : "outline"
                            }
                            className="text-[10px] capitalize"
                          >
                            {r.status}
                          </Badge>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Event details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <DetailRow
                label="Status"
                value={
                  <Badge
                    variant={status.variant}
                    className="text-[10px] uppercase tracking-wide"
                  >
                    {status.label}
                  </Badge>
                }
              />
              <DetailRow
                label="Category"
                value={
                  event.category
                    ? CATEGORY_LABELS[event.category] ?? event.category
                    : "—"
                }
              />
              <DetailRow
                label="Slug"
                value={<code className="text-xs">{event.slug}</code>}
              />
              {event.program && (
                <DetailRow
                  label="Program"
                  value={
                    <Link
                      href={`/dashboard/programs/${event.program.id}`}
                      className="text-primary hover:underline"
                    >
                      {event.program.title}
                    </Link>
                  }
                />
              )}
              <DetailRow
                label="Start"
                value={format(start, "d MMM yyyy, h:mm a")}
              />
              {end && (
                <DetailRow label="End" value={format(end, "d MMM yyyy, h:mm a")} />
              )}
              <DetailRow
                label="Capacity"
                value={event.capacity ? String(event.capacity) : "Unlimited"}
              />
              <DetailRow
                label="Registered"
                value={
                  <span className="font-medium">
                    {spotsTaken}
                    {event.capacity ? ` / ${event.capacity}` : ""}
                  </span>
                }
              />
              <DetailRow
                label="Spots left"
                value={spotsLeft != null ? String(spotsLeft) : "—"}
              />
              <DetailRow
                label="Published"
                value={
                  event.publishedAt
                    ? format(event.publishedAt, "d MMM yyyy")
                    : "—"
                }
              />
              <DetailRow
                label="Updated"
                value={format(event.updatedAt, "d MMM yyyy")}
              />
              {event.archivedAt && (
                <DetailRow
                  label="Archived"
                  value={format(event.archivedAt, "d MMM yyyy")}
                />
              )}
            </CardContent>
          </Card>

          {/* Capacity progress */}
          {event.capacity != null && event.capacity > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Capacity</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="h-2 rounded-full bg-secondary overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${capacityPct}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    {spotsTaken} of {event.capacity} registered
                  </span>
                  <span>{capacityPct}%</span>
                </div>
                {spotsLeft === 0 && (
                  <Badge variant="destructive" className="text-[10px]">
                    Full
                  </Badge>
                )}
              </CardContent>
            </Card>
          )}

          {canManage && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <EventActions eventId={event.id} status={event.status as "draft" | "published" | "ongoing" | "completed" | "cancelled" | "archived"} />
                {event.status === "archived" && (
                  <p className="text-xs text-muted-foreground flex items-start gap-1.5">
                    <Archive className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    Archived events cannot be published directly. Edit the event to restore it.
                  </p>
                )}
                {event.status === "published" && (
                  <p className="text-xs text-muted-foreground flex items-start gap-1.5">
                    <Send className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    This event is live on the public site.
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}
