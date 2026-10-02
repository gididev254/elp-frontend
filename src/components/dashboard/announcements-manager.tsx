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
  Megaphone,
  Users,
  CalendarDays,
  User,
} from "lucide-react";

export interface AnnouncementItem {
  id: string;
  title: string;
  body: string;
  audience: string;
  audienceLabel: string;
  status: "draft" | "published" | "archived";
  publishedAt: string | null;
  authorId: string | null;
  authorName: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Props {
  initialAnnouncements: AnnouncementItem[];
  canManage: boolean;
}

const AUDIENCE_OPTIONS: { value: string; label: string; hint: string }[] = [
  { value: "all", label: "Everyone", hint: "All leaders & executives" },
  { value: "leaders", label: "All Leaders", hint: "Entire chapter membership" },
  { value: "executive", label: "Executive Committee", hint: "11 executive roles only" },
  { value: "year1", label: "Year 1 (All)", hint: "All first-year students" },
  { value: "male_y1", label: "Male Year 1", hint: "First-year men" },
  { value: "female_y1", label: "Female Year 1", hint: "First-year women" },
];

const AUDIENCE_LABELS: Record<string, string> = Object.fromEntries(
  AUDIENCE_OPTIONS.map((a) => [a.value, a.label]),
);

const STATUS_BADGE: Record<
  string,
  { label: string; variant: "default" | "secondary" | "outline" }
> = {
  draft: { label: "Draft", variant: "secondary" },
  published: { label: "Published", variant: "default" },
  archived: { label: "Archived", variant: "outline" },
};

export function AnnouncementsManager({
  initialAnnouncements,
  canManage,
}: Props) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [tab, setTab] = React.useState<
    "all" | "draft" | "published" | "archived"
  >("all");
  const [audienceFilter, setAudienceFilter] = React.useState<string>("all");
  const [search, setSearch] = React.useState("");
  const [editing, setEditing] = React.useState<AnnouncementItem | null>(null);
  const [creating, setCreating] = React.useState(false);
  const [archiving, setArchiving] = React.useState<AnnouncementItem | null>(
    null,
  );

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["announcements", tab, audienceFilter, search],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (tab !== "all") params.set("status", tab);
      if (audienceFilter !== "all") params.set("audience", audienceFilter);
      if (search) params.set("search", search);
      const res = await fetch(`/api/announcements?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load announcements");
      return (await res.json()) as {
        items: AnnouncementItem[];
        canManage: boolean;
      };
    },
    initialData: { items: initialAnnouncements, canManage },
  });

  const items = data?.items ?? [];

  const publishMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/announcements/${id}/publish`, {
        method: "POST",
      });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error ?? "Failed to publish announcement");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Announcement published",
        description: "It is now visible to its target audience.",
      });
      qc.invalidateQueries({ queryKey: ["announcements"] });
    },
    onError: (e: Error) =>
      toast({
        title: "Could not publish",
        description: e.message,
        variant: "destructive",
      }),
  });

  const archiveMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/announcements/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error ?? "Failed to archive announcement");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Announcement archived",
        description: "It is no longer visible to its audience.",
      });
      qc.invalidateQueries({ queryKey: ["announcements"] });
    },
    onError: (e: Error) =>
      toast({
        title: "Could not archive",
        description: e.message,
        variant: "destructive",
      }),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="draft">Drafts</TabsTrigger>
            <TabsTrigger value="published">Published</TabsTrigger>
            <TabsTrigger value="archived">Archived</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={audienceFilter} onValueChange={setAudienceFilter}>
            <SelectTrigger className="w-[170px]" aria-label="Filter by audience">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All audiences</SelectItem>
              {AUDIENCE_OPTIONS.map((a) => (
                <SelectItem key={a.value} value={a.value}>
                  {a.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            placeholder="Search announcements..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="sm:w-56"
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => refetch()}
            disabled={isFetching}
            aria-label="Refresh"
          >
            <RefreshCw
              className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`}
            />
          </Button>
          {canManage && (
            <Button onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4 mr-1.5" />
              New announcement
            </Button>
          )}
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        {isLoading
          ? "Loading..."
          : `${items.length} announcement${items.length === 1 ? "" : "s"}`}
      </p>

      {isLoading ? (
        <div className="grid sm:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4 space-y-3">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center">
            <Megaphone className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <h3 className="font-medium">No announcements found</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {canManage
                ? "Create your first announcement to reach the chapter."
                : "Check back later for chapter updates."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {items.map((a) => (
            <AnnouncementCard
              key={a.id}
              announcement={a}
              canManage={canManage}
              onEdit={() => setEditing(a)}
              onPublish={() => publishMutation.mutate(a.id)}
              onArchive={() => setArchiving(a)}
              isPublishing={publishMutation.isPending}
              isArchiving={archiveMutation.isPending}
            />
          ))}
        </div>
      )}

      {creating && (
        <AnnouncementFormDialog
          open={creating}
          onOpenChange={setCreating}
          mode="create"
        />
      )}
      {editing && (
        <AnnouncementFormDialog
          open={!!editing}
          onOpenChange={(o) => !o && setEditing(null)}
          mode="edit"
          initial={editing}
        />
      )}

      <AlertDialog
        open={!!archiving}
        onOpenChange={(o) => !o && setArchiving(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive this announcement?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{archiving?.title}&rdquo; will be moved to the archived
              tab and removed from your audience&rsquo;s view. You can restore
              it later by editing its status.
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

function AnnouncementCard({
  announcement,
  canManage,
  onEdit,
  onPublish,
  onArchive,
  isPublishing,
  isArchiving,
}: {
  announcement: AnnouncementItem;
  canManage: boolean;
  onEdit: () => void;
  onPublish: () => void;
  onArchive: () => void;
  isPublishing: boolean;
  isArchiving: boolean;
}) {
  const status = STATUS_BADGE[announcement.status] ?? STATUS_BADGE.draft;
  return (
    <Card className="hover:border-primary/30 transition-colors flex flex-col">
      <CardContent className="p-4 space-y-3 flex-1 flex flex-col">
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold leading-tight line-clamp-2">
              {announcement.title}
            </h3>
            <Badge variant={status.variant} className="shrink-0">
              {status.label}
            </Badge>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="outline" className="text-[10px]">
              <Users className="h-2.5 w-2.5 mr-1" />
              {AUDIENCE_LABELS[announcement.audience] ?? announcement.audience}
            </Badge>
          </div>
        </div>
        <p className="text-sm text-muted-foreground line-clamp-4 flex-1 whitespace-pre-line">
          {announcement.body}
        </p>
        <div className="flex flex-col gap-1 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <CalendarDays className="h-3 w-3" />
            {announcement.publishedAt
              ? `Published ${format(new Date(announcement.publishedAt), "d MMM yyyy")}`
              : `Updated ${format(new Date(announcement.updatedAt), "d MMM yyyy")}`}
          </div>
          {announcement.authorName && (
            <div className="flex items-center gap-1.5">
              <User className="h-3 w-3" />
              {announcement.authorName}
            </div>
          )}
        </div>
        {canManage && (
          <div className="flex items-center gap-1.5 pt-1 border-t border-border">
            <Button
              size="sm"
              variant="outline"
              className="flex-1"
              onClick={onEdit}
            >
              <Pencil className="h-3.5 w-3.5 mr-1" />
              Edit
            </Button>
            {announcement.status !== "published" && (
              <Button
                size="sm"
                variant="default"
                onClick={onPublish}
                disabled={isPublishing}
              >
                <Send className="h-3.5 w-3.5 mr-1" />
                Publish
              </Button>
            )}
            {announcement.status !== "archived" && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onArchive}
                disabled={isArchiving}
                aria-label="Archive"
              >
                <Archive className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface AnnouncementFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  initial?: AnnouncementItem;
}

function AnnouncementFormDialog({
  open,
  onOpenChange,
  mode,
  initial,
}: AnnouncementFormProps) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [title, setTitle] = React.useState(initial?.title ?? "");
  const [body, setBody] = React.useState(initial?.body ?? "");
  const [audience, setAudience] = React.useState<string>(
    initial?.audience ?? "all",
  );
  const [publishNow, setPublishNow] = React.useState<boolean>(
    initial?.status === "published",
  );

  const isEdit = mode === "edit";

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        title,
        body,
        audience,
        status: publishNow ? ("published" as const) : ("draft" as const),
      };
      if (isEdit && initial) {
        const res = await fetch(`/api/announcements/${initial.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => null);
          throw new Error(j?.error ?? "Failed to update announcement");
        }
        return res.json();
      } else {
        const res = await fetch("/api/announcements", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => null);
          throw new Error(j?.error ?? "Failed to create announcement");
        }
        return res.json();
      }
    },
    onSuccess: () => {
      toast({
        title: isEdit ? "Announcement updated" : "Announcement created",
        description: isEdit
          ? "Your changes have been saved."
          : publishNow
            ? "Published to its target audience."
            : "Saved as a draft. Publish when you're ready.",
      });
      qc.invalidateQueries({ queryKey: ["announcements"] });
      onOpenChange(false);
    },
    onError: (e: Error) =>
      toast({
        title: "Save failed",
        description: e.message,
        variant: "destructive",
      }),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !body.trim()) {
      toast({
        title: "Missing fields",
        description: "Title and body are required.",
        variant: "destructive",
      });
      return;
    }
    mutation.mutate();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit announcement" : "New announcement"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the announcement details below."
              : "Draft a chapter announcement. Choose an audience and decide when to publish."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Mentorship Circle — Sign-ups close Friday"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="audience">Audience</Label>
            <Select value={audience} onValueChange={setAudience}>
              <SelectTrigger id="audience">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AUDIENCE_OPTIONS.map((a) => (
                  <SelectItem key={a.value} value={a.value}>
                    <div className="flex flex-col">
                      <span>{a.label}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {a.hint}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              The audience is stored on the announcement. The frontend will
              filter who sees what. (No fan-out notifications in v1.)
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="body">Body</Label>
            <Textarea
              id="body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write the announcement. Plain text — line breaks are preserved."
              rows={8}
              maxLength={20000}
              required
            />
            <p className="text-xs text-muted-foreground">
              {body.length.toLocaleString()} / 20,000
            </p>
          </div>
          <label className="flex items-start gap-3 rounded-md border border-border bg-secondary/30 p-3 cursor-pointer hover:bg-secondary/50 transition-colors">
            <input
              type="checkbox"
              checked={publishNow}
              onChange={(e) => setPublishNow(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-primary"
            />
            <div className="text-sm space-y-0.5">
              <div className="font-medium">
                {isEdit
                  ? publishNow
                    ? "Publish now (mark as published)"
                    : "Save as draft"
                  : publishNow
                    ? "Publish immediately"
                    : "Save as draft"}
              </div>
              <p className="text-muted-foreground text-xs">
                Published announcements are visible to their target audience.
                Drafts are only visible in this dashboard.
              </p>
            </div>
          </label>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending
                ? "Saving..."
                : isEdit
                  ? "Save changes"
                  : publishNow
                    ? "Create & publish"
                    : "Create draft"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
