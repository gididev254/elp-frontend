// /dashboard/programs/[id] — Program detail page (server component).
// Fetches a single program by ID and shows full details + related events.
// Executives with programs.manage get Publish/Archive action buttons.

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
import { ProgramActions } from "@/components/dashboard/program-actions";
import { format } from "date-fns";
import {
  ArrowLeft,
  FolderKanban,
  Pencil,
  CalendarDays,
  Tag,
  ExternalLink,
  FileText,
  Send,
  Archive,
} from "lucide-react";

type Params = { id: string };

export const metadata = { title: "Program details" };

const CATEGORY_LABELS: Record<string, string> = {
  mentorship: "Mentorship",
  leadership: "Leadership",
  community: "Community",
  career: "Career",
  academic: "Academic",
};

const STATUS_BADGE: Record<
  string,
  { label: string; variant: "default" | "secondary" | "outline" }
> = {
  draft: { label: "Draft", variant: "secondary" },
  published: { label: "Published", variant: "default" },
  archived: { label: "Archived", variant: "outline" },
};

export default async function ProgramDetailPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect(`/login?callbackUrl=/dashboard/programs`);
  const user = await resolveUser(session.user.id);
  if (!user) redirect("/login");

  const canView =
    user.permissions.has("programs.view") ||
    user.permissions.has("programs.manage") ||
    user.permissions.has("admin.system");
  if (!canView) notFound();

  const canManage =
    user.permissions.has("programs.manage") || user.permissions.has("admin.system");

  const { id } = await params;
  const program = await db.program.findUnique({
    where: { id },
    include: {
      events: {
        orderBy: { startAt: "desc" },
        take: 30,
      },
    },
  });

  if (!program) notFound();

  const status = STATUS_BADGE[program.status] ?? STATUS_BADGE.draft;
  const upcomingEvents = program.events.filter(
    (e) => new Date(e.startAt) >= new Date(),
  );
  const pastEvents = program.events.filter((e) => new Date(e.startAt) < new Date());

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <Link
            href="/dashboard/programs"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-1"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Programs
          </Link>
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground mb-1">
            <FolderKanban className="h-3.5 w-3.5" />
            <span>Chapter Program</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            {program.title}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground max-w-2xl">
            {program.summary}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canManage && (
            <Button asChild variant="outline">
              <Link href={`/dashboard/programs?edit=${program.id}`}>
                <Pencil className="h-4 w-4 mr-1.5" />
                Edit
              </Link>
            </Button>
          )}
          {program.status === "published" && (
            <Button asChild variant="ghost">
              <a
                href={`/programs/${program.slug}`}
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
              {program.coverUrl ? (
                 
                <img
                  src={program.coverUrl}
                  alt={program.title}
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-muted-foreground">
                  <FileText className="h-12 w-12 opacity-40" />
                </div>
              )}
              <div className="absolute top-3 left-3 flex gap-1.5">
                <Badge variant={status.variant} className="backdrop-blur-sm bg-background/80">
                  {status.label}
                </Badge>
                {program.category && (
                  <Badge
                    variant="outline"
                    className="backdrop-blur-sm bg-background/80 text-[10px] capitalize"
                  >
                    <Tag className="h-2.5 w-2.5 mr-1" />
                    {CATEGORY_LABELS[program.category] ?? program.category}
                  </Badge>
                )}
              </div>
            </div>
          </Card>

          {/* Description */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed whitespace-pre-line text-foreground/90">
                {program.description}
              </p>
            </CardContent>
          </Card>

          {/* Related events */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-primary" />
                Related Events
                <Badge variant="secondary" className="ml-auto text-[10px]">
                  {program.events.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {program.events.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">
                  No events are linked to this program yet.
                </p>
              ) : (
                <div className="space-y-4">
                  {upcomingEvents.length > 0 && (
                    <div>
                      <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
                        Upcoming
                      </div>
                      <ul className="space-y-2">
                        {upcomingEvents.map((e) => (
                          <EventRow key={e.id} event={e} />
                        ))}
                      </ul>
                    </div>
                  )}
                  {pastEvents.length > 0 && (
                    <div>
                      <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
                        Past
                      </div>
                      <ul className="space-y-2">
                        {pastEvents.map((e) => (
                          <EventRow key={e.id} event={e} />
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Program details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <DetailRow label="Status" value={<Badge variant={status.variant} className="text-[10px] uppercase tracking-wide">{status.label}</Badge>} />
              <DetailRow
                label="Category"
                value={
                  program.category
                    ? CATEGORY_LABELS[program.category] ?? program.category
                    : "—"
                }
              />
              <DetailRow label="Slug" value={<code className="text-xs">{program.slug}</code>} />
              <DetailRow
                label="Published"
                value={
                  program.publishedAt
                    ? format(program.publishedAt, "d MMM yyyy")
                    : "—"
                }
              />
              <DetailRow
                label="Updated"
                value={format(program.updatedAt, "d MMM yyyy")}
              />
              <DetailRow
                label="Created"
                value={format(program.createdAt, "d MMM yyyy")}
              />
              {program.archivedAt && (
                <DetailRow
                  label="Archived"
                  value={format(program.archivedAt, "d MMM yyyy")}
                />
              )}
            </CardContent>
          </Card>

          {canManage && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <ProgramActions programId={program.id} status={program.status as "draft" | "published" | "archived"} />
                {program.status === "archived" && (
                  <p className="text-xs text-muted-foreground flex items-start gap-1.5">
                    <Archive className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    Archived programs cannot be published directly. Edit the program to restore it.
                  </p>
                )}
                {program.status === "published" && (
                  <p className="text-xs text-muted-foreground flex items-start gap-1.5">
                    <Send className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    This program is live on the public site.
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

function EventRow({
  event,
}: {
  event: {
    id: string;
    title: string;
    slug: string;
    startAt: Date;
    venue: string | null;
    status: string;
  };
}) {
  return (
    <li>
      <Link
        href={`/dashboard/events/${event.id}`}
        className="flex items-start justify-between gap-3 py-2 border-b border-border last:border-0 hover:bg-secondary/40 -mx-2 px-2 rounded-sm"
      >
        <div className="min-w-0">
          <div className="font-medium text-sm truncate">{event.title}</div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
            <CalendarDays className="h-3 w-3" />
            {format(event.startAt, "d MMM yyyy, h:mm a")}
          </div>
          {event.venue && (
            <div className="text-xs text-muted-foreground mt-0.5">{event.venue}</div>
          )}
        </div>
        <Badge variant="outline" className="text-[10px] capitalize shrink-0">
          {event.status}
        </Badge>
      </Link>
    </li>
  );
}
