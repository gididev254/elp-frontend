"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Pencil,
  Send,
  Archive,
  RefreshCw,
  Calendar,
  MapPin,
  Users,
  ExternalLink,
  Clock,
  Tag,
  UserCheck,
} from "lucide-react";

export interface EventItem {
  id: string;
  title: string;
  slug: string;
  summary: string;
  description: string;
  category: string | null;
  coverUrl: string | null;
  venue: string | null;
  location: string | null;
  startAt: string;
  endAt: string | null;
  status: "draft" | "published" | "ongoing" | "completed" | "cancelled" | "archived";
  publishedAt: string | null;
  capacity: number | null;
  programId: string | null;
  program?: { id: string; title: string; slug: string } | null;
  createdAt: string;
  updatedAt: string;
  registrationCount?: number;
  isRegistered?: boolean;
}

interface Props {
  initialEvents: EventItem[];
  canManage: boolean;
  currentUserId: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  workshop: "Workshop",
  seminar: "Seminar",
  outreach: "Outreach",
  social: "Social",
  meeting: "Meeting",
  ceremony: "Ceremony",
};

const STATUS_BADGE: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  draft: { label: "Draft", variant: "secondary" },
  published: { label: "Published", variant: "default" },
  ongoing: { label: "Ongoing", variant: "default" },
  completed: { label: "Completed", variant: "outline" },
  cancelled: { label: "Cancelled", variant: "destructive" },
  archived: { label: "Archived", variant: "outline" },
};

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

// Convert ISO to value usable in datetime-local input (local time, no timezone suffix)
function toDateTimeLocal(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function EventsManager({ initialEvents, canManage, currentUserId }: Props) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [tab, setTab] = React.useState<"upcoming" | "past" | "drafts" | "all">("all");
  const [search, setSearch] = React.useState("");
  const [editing, setEditing] = React.useState<EventItem | null>(null);
  const [creating, setCreating] = React.useState(false);
  const [archiving, setArchiving] = React.useState<EventItem | null>(null);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["events", tab, search],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (tab === "upcoming") params.set("upcoming", "true");
      if (tab === "past") params.set("past", "true");
      if (tab === "drafts") params.set("status", "draft");
      if (search) params.set("search", search);
      const res = await fetch(`/api/events?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load events");
      return (await res.json()) as { items: EventItem[]; canManage: boolean };
    },
    initialData: { items: initialEvents, canManage },
  });

  const items = data?.items ?? [];

  const publishMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/events/${id}/publish`, { method: "POST" });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error ?? "Failed to publish event");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Event published", description: "It is now visible on the public site." });
      qc.invalidateQueries({ queryKey: ["events"] });
    },
    onError: (e: Error) => toast({ title: "Could not publish", description: e.message, variant: "destructive" }),
  });

  const archiveMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/events/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error ?? "Failed to archive event");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Event archived", description: "It is no longer visible publicly." });
      qc.invalidateQueries({ queryKey: ["events"] });
    },
    onError: (e: Error) => toast({ title: "Could not archive", description: e.message, variant: "destructive" }),
  });

  const registerMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/events/${id}/register`, { method: "POST" });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error ?? "Failed to register");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Registered", description: "You are now on the attendee list." });
      qc.invalidateQueries({ queryKey: ["events"] });
    },
    onError: (e: Error) => toast({ title: "Registration failed", description: e.message, variant: "destructive" }),
  });

  void currentUserId;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
            <TabsTrigger value="past">Past</TabsTrigger>
            <TabsTrigger value="drafts">Drafts</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex items-center gap-2">
          <Input
            placeholder="Search events..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="sm:w-64"
          />
          <Button variant="ghost" size="icon" onClick={() => refetch()} disabled={isFetching} aria-label="Refresh">
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          </Button>
          {canManage && (
            <Button onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4 mr-1.5" />
              New event
            </Button>
          )}
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        {isLoading ? "Loading..." : `${items.length} event${items.length === 1 ? "" : "s"}`}
      </p>

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4 space-y-3">
                <Skeleton className="h-32 w-full rounded-md" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-3 w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center">
            <Calendar className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <h3 className="font-medium">No events found</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {canManage ? "Create your first event to get started." : "Check back later for chapter events."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((e) => (
            <EventCard
              key={e.id}
              event={e}
              canManage={canManage}
              onEdit={() => setEditing(e)}
              onPublish={() => publishMutation.mutate(e.id)}
              onArchive={() => setArchiving(e)}
              onRegister={() => registerMutation.mutate(e.id)}
              isPublishing={publishMutation.isPending}
              isArchiving={archiveMutation.isPending}
              isRegistering={registerMutation.isPending}
            />
          ))}
        </div>
      )}

      {creating && (
        <EventFormDialog open={creating} onOpenChange={setCreating} mode="create" />
      )}
      {editing && (
        <EventFormDialog
          open={!!editing}
          onOpenChange={(o) => !o && setEditing(null)}
          mode="edit"
          initial={editing}
        />
      )}

      <AlertDialog open={!!archiving} onOpenChange={(o) => !o && setArchiving(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive this event?</AlertDialogTitle>
            <AlertDialogDescription>
              {archiving?.title} will be moved to the archived tab and removed from the public site.
              Registrations are preserved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => archiving && archiveMutation.mutate(archiving.id)}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Archive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function EventCard({
  event,
  canManage,
  onEdit,
  onPublish,
  onArchive,
  onRegister,
  isPublishing,
  isArchiving,
  isRegistering,
}: {
  event: EventItem;
  canManage: boolean;
  onEdit: () => void;
  onPublish: () => void;
  onArchive: () => void;
  onRegister: () => void;
  isPublishing: boolean;
  isArchiving: boolean;
  isRegistering: boolean;
}) {
  const status = STATUS_BADGE[event.status] ?? STATUS_BADGE.draft;
  const start = new Date(event.startAt);
  const isPast = start.getTime() < Date.now();
  const isRegistered = event.isRegistered === true;
  const canRegister =
    !canManage && ["published", "ongoing"].includes(event.status) && !isPast && !isRegistered;

  return (
    <Card className="overflow-hidden hover:border-primary/30 transition-colors flex flex-col">
      <div className="aspect-[16/9] bg-secondary/40 relative">
        {event.coverUrl ? (
           
          <img src={event.coverUrl} alt={event.title} loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-muted-foreground">
            <Calendar className="h-10 w-10 opacity-40" />
          </div>
        )}
        <div className="absolute top-2 right-2 flex gap-1">
          <Badge variant={status.variant} className="backdrop-blur-sm bg-background/80">
            {status.label}
          </Badge>
        </div>
        <div className="absolute top-2 left-2">
          <Badge variant="secondary" className="backdrop-blur-sm bg-background/80 text-primary">
            {format(start, "d MMM")}
          </Badge>
        </div>
      </div>
      <CardContent className="p-4 space-y-3 flex-1 flex flex-col">
        <div className="space-y-1">
          <h3 className="font-semibold leading-tight line-clamp-2">{event.title}</h3>
          <div className="flex flex-wrap items-center gap-1.5">
            {event.category && (
              <Badge variant="outline" className="text-[10px]">
                <Tag className="h-2.5 w-2.5 mr-1" />
                {CATEGORY_LABELS[event.category] ?? event.category}
              </Badge>
            )}
            {event.program && (
              <Badge variant="secondary" className="text-[10px]">{event.program.title}</Badge>
            )}
          </div>
        </div>
        <p className="text-sm text-muted-foreground line-clamp-2 flex-1">{event.summary}</p>
        <div className="space-y-1 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Clock className="h-3 w-3" />
            <span>{format(start, "EEE d MMM, h:mm a")}</span>
          </div>
          {event.venue && (
            <div className="flex items-center gap-1.5">
              <MapPin className="h-3 w-3" />
              <span className="truncate">
                {event.venue}
                {event.location ? ` · ${event.location}` : ""}
              </span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <Users className="h-3 w-3" />
            <span>
              {event.registrationCount ?? 0}
              {event.capacity ? ` / ${event.capacity}` : ""} registered
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 pt-1 border-t border-border">
          {canManage && (
            <>
              <Button size="sm" variant="outline" className="flex-1" onClick={onEdit}>
                <Pencil className="h-3.5 w-3.5 mr-1" />
                Edit
              </Button>
              {!["published", "ongoing", "completed", "cancelled", "archived"].includes(event.status) && (
                <Button size="sm" variant="default" onClick={onPublish} disabled={isPublishing}>
                  <Send className="h-3.5 w-3.5 mr-1" />
                  Publish
                </Button>
              )}
              {event.status !== "archived" && (
                <Button size="sm" variant="ghost" onClick={onArchive} disabled={isArchiving} aria-label="Archive">
                  <Archive className="h-3.5 w-3.5" />
                </Button>
              )}
            </>
          )}
          {!canManage && canRegister && (
            <Button size="sm" variant="default" className="flex-1" onClick={onRegister} disabled={isRegistering}>
              <UserCheck className="h-3.5 w-3.5 mr-1.5" />
              {isRegistering ? "Registering..." : "Register"}
            </Button>
          )}
          {!canManage && isRegistered && (
            <Badge variant="default" className="flex-1 justify-center py-1.5">
              <UserCheck className="h-3.5 w-3.5 mr-1.5" />
              Registered
            </Badge>
          )}
          {["published", "ongoing", "completed"].includes(event.status) && (
            <Button size="sm" variant="ghost" asChild>
              <a href={`/events/${event.slug}`} target="_blank" rel="noreferrer">
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface EventFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  initial?: EventItem;
}

function EventFormDialog({ open, onOpenChange, mode, initial }: EventFormProps) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [title, setTitle] = React.useState(initial?.title ?? "");
  const [slug, setSlug] = React.useState(initial?.slug ?? "");
  const [summary, setSummary] = React.useState(initial?.summary ?? "");
  const [description, setDescription] = React.useState(initial?.description ?? "");
  const [category, setCategory] = React.useState<string>(initial?.category ?? "workshop");
  const [coverUrl, setCoverUrl] = React.useState(initial?.coverUrl ?? "");
  const [venue, setVenue] = React.useState(initial?.venue ?? "");
  const [location, setLocation] = React.useState(initial?.location ?? "");
  const [startAt, setStartAt] = React.useState(
    initial ? toDateTimeLocal(initial.startAt) : "",
  );
  const [endAt, setEndAt] = React.useState(
    initial?.endAt ? toDateTimeLocal(initial.endAt) : "",
  );
  const [capacity, setCapacity] = React.useState<string>(
    initial?.capacity ? String(initial.capacity) : "",
  );
  const [slugEdited, setSlugEdited] = React.useState(mode === "edit");

  React.useEffect(() => {
    if (mode === "create" && !slugEdited) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSlug(slugify(title));
    }
  }, [title, slugEdited, mode]);

  const isEdit = mode === "edit";

  const mutation = useMutation({
    mutationFn: async () => {
      const startIso = startAt ? new Date(startAt).toISOString() : "";
      const endIso = endAt ? new Date(endAt).toISOString() : null;
      const cap = capacity ? Number(capacity) : null;
      const payload = {
        title,
        slug: slug || undefined,
        summary,
        description,
        category,
        coverUrl: coverUrl || "",
        venue: venue || undefined,
        location: location || undefined,
        startAt: startIso,
        endAt: endIso,
        capacity: cap,
      };
      if (isEdit && initial) {
        const res = await fetch(`/api/events/${initial.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => null);
          throw new Error(j?.error ?? "Failed to update event");
        }
        return res.json();
      } else {
        const res = await fetch("/api/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => null);
          throw new Error(j?.error ?? "Failed to create event");
        }
        return res.json();
      }
    },
    onSuccess: () => {
      toast({
        title: isEdit ? "Event updated" : "Event created",
        description: isEdit
          ? "Your changes have been saved."
          : "Saved as a draft. Publish when you're ready.",
      });
      qc.invalidateQueries({ queryKey: ["events"] });
      onOpenChange(false);
    },
    onError: (e: Error) =>
      toast({ title: "Save failed", description: e.message, variant: "destructive" }),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !summary.trim() || !description.trim() || !startAt) {
      toast({ title: "Missing fields", description: "Title, summary, description, and start date/time are required.", variant: "destructive" });
      return;
    }
    mutation.mutate();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit event" : "New event"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the event details below."
              : "Create a new chapter event. It will be saved as a draft."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Leadership Masterclass with Dr. Mwangi"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="slug">Slug</Label>
            <Input
              id="slug"
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value);
                setSlugEdited(true);
              }}
              placeholder="auto-generated-from-title"
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Used in the public URL: /events/&lt;slug&gt;
            </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="category">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger id="category"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="capacity">Capacity (optional)</Label>
              <Input
                id="capacity"
                value={capacity}
                onChange={(e) => setCapacity(e.target.value.replace(/[^0-9]/g, ""))}
                placeholder="e.g. 50"
                inputMode="numeric"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="summary">Summary</Label>
            <Textarea
              id="summary"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="One-sentence overview shown on cards."
              rows={2}
              maxLength={400}
              required
            />
            <p className="text-xs text-muted-foreground">{summary.length}/400</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Full description shown on the event detail page."
              rows={5}
              required
            />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="venue">Venue</Label>
              <Input
                id="venue"
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
                placeholder="e.g. Lecture Hall A"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Main Campus, Embu"
              />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="startAt">Start date &amp; time</Label>
              <Input
                id="startAt"
                type="datetime-local"
                value={startAt}
                onChange={(e) => setStartAt(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="endAt">End date &amp; time (optional)</Label>
              <Input
                id="endAt"
                type="datetime-local"
                value={endAt}
                onChange={(e) => setEndAt(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="coverUrl">Cover image URL</Label>
            <Input
              id="coverUrl"
              value={coverUrl}
              onChange={(e) => setCoverUrl(e.target.value)}
              placeholder="https://... or /images/..."
              type="url"
            />
            {coverUrl && (
              <div className="mt-2 rounded-md overflow-hidden border border-border aspect-[16/9] bg-secondary/40">
                { }
                <img src={coverUrl} alt="Cover preview" className="h-full w-full object-cover" loading="lazy" />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving..." : isEdit ? "Save changes" : "Create event"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
