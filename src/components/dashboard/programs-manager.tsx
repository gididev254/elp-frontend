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
  FileText,
  ExternalLink,
  CalendarDays,
  Tag,
} from "lucide-react";

export interface ProgramItem {
  id: string;
  title: string;
  slug: string;
  summary: string;
  description: string;
  category: string | null;
  coverUrl: string | null;
  status: "draft" | "published" | "archived";
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  eventCount?: number;
}

interface Props {
  initialPrograms: ProgramItem[];
  canManage: boolean;
}

const CATEGORY_LABELS: Record<string, string> = {
  mentorship: "Mentorship",
  leadership: "Leadership",
  community: "Community",
  career: "Career",
  academic: "Academic",
};

const STATUS_BADGE: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  draft: { label: "Draft", variant: "secondary" },
  published: { label: "Published", variant: "default" },
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

export function ProgramsManager({ initialPrograms, canManage }: Props) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [tab, setTab] = React.useState<"all" | "draft" | "published" | "archived">("all");
  const [search, setSearch] = React.useState("");
  const [editing, setEditing] = React.useState<ProgramItem | null>(null);
  const [creating, setCreating] = React.useState(false);
  const [archiving, setArchiving] = React.useState<ProgramItem | null>(null);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["programs", tab, search],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (tab !== "all") params.set("status", tab);
      if (search) params.set("search", search);
      const res = await fetch(`/api/programs?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load programs");
      return (await res.json()) as { items: ProgramItem[]; canManage: boolean };
    },
    initialData: { items: initialPrograms, canManage },
  });

  const items = data?.items ?? [];

  const publishMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/programs/${id}/publish`, { method: "POST" });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error ?? "Failed to publish program");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Program published", description: "It is now visible on the public site." });
      qc.invalidateQueries({ queryKey: ["programs"] });
    },
    onError: (e: Error) => toast({ title: "Could not publish", description: e.message, variant: "destructive" }),
  });

  const archiveMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/programs/${id}/archive`, { method: "POST" });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error ?? "Failed to archive program");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Program archived", description: "It is no longer visible publicly." });
      qc.invalidateQueries({ queryKey: ["programs"] });
    },
    onError: (e: Error) => toast({ title: "Could not archive", description: e.message, variant: "destructive" }),
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
        <div className="flex items-center gap-2">
          <Input
            placeholder="Search programs..."
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
              New program
            </Button>
          )}
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        {isLoading ? "Loading..." : `${items.length} program${items.length === 1 ? "" : "s"}`}
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
            <FileText className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <h3 className="font-medium">No programs found</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {canManage ? "Create your first program to get started." : "Check back later for chapter programs."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((p) => (
            <ProgramCard
              key={p.id}
              program={p}
              canManage={canManage}
              onEdit={() => setEditing(p)}
              onPublish={() => publishMutation.mutate(p.id)}
              onArchive={() => setArchiving(p)}
              isPublishing={publishMutation.isPending}
              isArchiving={archiveMutation.isPending}
            />
          ))}
        </div>
      )}

      {creating && (
        <ProgramFormDialog
          open={creating}
          onOpenChange={setCreating}
          mode="create"
        />
      )}
      {editing && (
        <ProgramFormDialog
          open={!!editing}
          onOpenChange={(o) => !o && setEditing(null)}
          mode="edit"
          initial={editing}
        />
      )}

      <AlertDialog open={!!archiving} onOpenChange={(o) => !o && setArchiving(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive this program?</AlertDialogTitle>
            <AlertDialogDescription>
              {archiving?.title} will be moved to the archived tab and removed from the public site.
              You can still restore it later by editing its status.
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

function ProgramCard({
  program,
  canManage,
  onEdit,
  onPublish,
  onArchive,
  isPublishing,
  isArchiving,
}: {
  program: ProgramItem;
  canManage: boolean;
  onEdit: () => void;
  onPublish: () => void;
  onArchive: () => void;
  isPublishing: boolean;
  isArchiving: boolean;
}) {
  const status = STATUS_BADGE[program.status] ?? STATUS_BADGE.draft;
  return (
    <Card className="overflow-hidden hover:border-primary/30 transition-colors flex flex-col">
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
            <FileText className="h-10 w-10 opacity-40" />
          </div>
        )}
        <div className="absolute top-2 right-2">
          <Badge variant={status.variant} className="backdrop-blur-sm bg-background/80">
            {status.label}
          </Badge>
        </div>
      </div>
      <CardContent className="p-4 space-y-3 flex-1 flex flex-col">
        <div className="space-y-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold leading-tight line-clamp-2">{program.title}</h3>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {program.category && (
              <Badge variant="outline" className="text-[10px] capitalize">
                <Tag className="h-2.5 w-2.5 mr-1" />
                {CATEGORY_LABELS[program.category] ?? program.category}
              </Badge>
            )}
            {typeof program.eventCount === "number" && program.eventCount > 0 && (
              <Badge variant="secondary" className="text-[10px]">
                {program.eventCount} event{program.eventCount === 1 ? "" : "s"}
              </Badge>
            )}
          </div>
        </div>
        <p className="text-sm text-muted-foreground line-clamp-3 flex-1">{program.summary}</p>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <CalendarDays className="h-3 w-3" />
          {program.publishedAt
            ? `Published ${format(new Date(program.publishedAt), "d MMM yyyy")}`
            : `Updated ${format(new Date(program.updatedAt), "d MMM yyyy")}`}
        </div>
        <div className="flex items-center gap-1.5 pt-1 border-t border-border">
          {canManage && (
            <>
              <Button size="sm" variant="outline" className="flex-1" onClick={onEdit}>
                <Pencil className="h-3.5 w-3.5 mr-1" />
                Edit
              </Button>
              {program.status !== "published" && (
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
              {program.status !== "archived" && (
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
            </>
          )}
          {program.status === "published" && (
            <Button size="sm" variant="ghost" asChild>
              <a href={`/programs/${program.slug}`} target="_blank" rel="noreferrer">
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface ProgramFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  initial?: ProgramItem;
}

function ProgramFormDialog({ open, onOpenChange, mode, initial }: ProgramFormProps) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [title, setTitle] = React.useState(initial?.title ?? "");
  const [slug, setSlug] = React.useState(initial?.slug ?? "");
  const [summary, setSummary] = React.useState(initial?.summary ?? "");
  const [description, setDescription] = React.useState(initial?.description ?? "");
  const [category, setCategory] = React.useState<string>(initial?.category ?? "mentorship");
  const [coverUrl, setCoverUrl] = React.useState(initial?.coverUrl ?? "");
  const [slugEdited, setSlugEdited] = React.useState(mode === "edit");

  // Auto-generate slug from title (only on create)
  React.useEffect(() => {
    if (mode === "create" && !slugEdited) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSlug(slugify(title));
    }
  }, [title, slugEdited, mode]);

  const isEdit = mode === "edit";

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        title,
        slug: slug || undefined,
        summary,
        description,
        category,
        coverUrl: coverUrl || "",
      };
      if (isEdit && initial) {
        const res = await fetch(`/api/programs/${initial.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => null);
          throw new Error(j?.error ?? "Failed to update program");
        }
        return res.json();
      } else {
        const res = await fetch("/api/programs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => null);
          throw new Error(j?.error ?? "Failed to create program");
        }
        return res.json();
      }
    },
    onSuccess: () => {
      toast({
        title: isEdit ? "Program updated" : "Program created",
        description: isEdit
          ? "Your changes have been saved."
          : "Saved as a draft. Publish when you're ready.",
      });
      qc.invalidateQueries({ queryKey: ["programs"] });
      onOpenChange(false);
    },
    onError: (e: Error) =>
      toast({ title: "Save failed", description: e.message, variant: "destructive" }),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !summary.trim() || !description.trim()) {
      toast({ title: "Missing fields", description: "Title, summary, and description are required.", variant: "destructive" });
      return;
    }
    mutation.mutate();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit program" : "New program"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the program details below."
              : "Create a new chapter program. It will be saved as a draft."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Mentorship Circle 2026"
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
              Used in the public URL: /programs/&lt;slug&gt;
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="category">Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger id="category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
              placeholder="Full description shown on the program detail page."
              rows={6}
              required
            />
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
              {mutation.isPending ? "Saving..." : isEdit ? "Save changes" : "Create program"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// End of ProgramsManager component tree
