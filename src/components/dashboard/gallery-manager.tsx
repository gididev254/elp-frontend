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
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { FileUpload } from "@/components/dashboard/file-upload";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
  Images,
  Image as ImageIcon,
  CalendarDays,
  Album as AlbumIcon,
  Upload as UploadIcon,
  Link as LinkIcon,
} from "lucide-react";

export interface GalleryItem {
  id: string;
  title: string;
  caption: string | null;
  imageUrl: string;
  album: string | null;
  eventId: string | null;
  status: "draft" | "published" | "archived";
  createdAt: string;
  updatedAt: string;
}

interface Props {
  initialItems: GalleryItem[];
  initialAlbums: string[];
  canManage: boolean;
}

const STATUS_BADGE: Record<
  string,
  { label: string; variant: "default" | "secondary" | "outline" }
> = {
  draft: { label: "Draft", variant: "secondary" },
  published: { label: "Published", variant: "default" },
  archived: { label: "Archived", variant: "outline" },
};

export function GalleryManager({
  initialItems,
  initialAlbums,
  canManage,
}: Props) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [tab, setTab] = React.useState<
    "all" | "draft" | "published" | "archived"
  >("all");
  const [albumFilter, setAlbumFilter] = React.useState<string>("all");
  const [search, setSearch] = React.useState("");
  const [editing, setEditing] = React.useState<GalleryItem | null>(null);
  const [creating, setCreating] = React.useState(false);
  const [deleting, setDeleting] = React.useState<GalleryItem | null>(null);
  const [lightbox, setLightbox] = React.useState<GalleryItem | null>(null);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["gallery", tab, albumFilter, search],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (tab !== "all") params.set("status", tab);
      if (albumFilter !== "all") params.set("album", albumFilter);
      if (search) params.set("search", search);
      const res = await fetch(`/api/gallery?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load gallery media");
      return (await res.json()) as {
        items: GalleryItem[];
        canManage: boolean;
      };
    },
    initialData: { items: initialItems, canManage },
  });

  const items = data?.items ?? [];

  // Rebuild album list from current data (so newly added albums appear without refetch of albums).
  const albumOptions = React.useMemo(() => {
    const set = new Set<string>(initialAlbums);
    items.forEach((i) => i.album && set.add(i.album));
    return Array.from(set).sort();
  }, [initialAlbums, items]);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/gallery/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error ?? "Failed to delete media");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Media deleted",
        description: "The image has been permanently removed.",
      });
      qc.invalidateQueries({ queryKey: ["gallery"] });
    },
    onError: (e: Error) =>
      toast({
        title: "Could not delete",
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
            <TabsTrigger value="published">Published</TabsTrigger>
            <TabsTrigger value="draft">Drafts</TabsTrigger>
            <TabsTrigger value="archived">Archived</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={albumFilter} onValueChange={setAlbumFilter}>
            <SelectTrigger className="w-[180px]" aria-label="Filter by album">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All albums</SelectItem>
              {albumOptions.map((a) => (
                <SelectItem key={a} value={a}>
                  {a}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            placeholder="Search gallery..."
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
              Add media
            </Button>
          )}
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        {isLoading
          ? "Loading..."
          : `${items.length} item${items.length === 1 ? "" : "s"}`}
      </p>

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square w-full rounded-md" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <Images className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <h3 className="font-medium">No media in the gallery yet</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {canManage
              ? "Add your first image to start building the chapter gallery."
              : "Check back later for chapter photos."}
          </p>
        </div>
      ) : (
        <div className="[column-count:2] sm:[column-count:3] lg:[column-count:4] gap-3 [column-gap:0.75rem]">
          {items.map((m) => (
            <GalleryCard
              key={m.id}
              media={m}
              canManage={canManage}
              onEdit={() => setEditing(m)}
              onDelete={() => setDeleting(m)}
              onClick={() => setLightbox(m)}
            />
          ))}
        </div>
      )}

      {creating && (
        <GalleryFormDialog
          open={creating}
          onOpenChange={setCreating}
          mode="create"
          albumOptions={albumOptions}
        />
      )}
      {editing && (
        <GalleryFormDialog
          open={!!editing}
          onOpenChange={(o) => !o && setEditing(null)}
          mode="edit"
          initial={editing}
          albumOptions={albumOptions}
        />
      )}

      <AlertDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this image?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{deleting?.title}&rdquo; will be permanently removed from
              the gallery. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleting && deleteMutation.mutate(deleting.id)}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Lightbox */}
      <Dialog
        open={!!lightbox}
        onOpenChange={(o) => !o && setLightbox(null)}
      >
        <DialogContent className="sm:max-w-3xl p-0 overflow-hidden">
          {lightbox && (
            <>
              <div className="bg-black flex items-center justify-center">
                { }
                <img
                  src={lightbox.imageUrl}
                  alt={lightbox.title}
                  loading="lazy"
                  className="max-h-[70vh] w-auto object-contain"
                />
              </div>
              <div className="p-4 space-y-1.5">
                <DialogHeader className="space-y-0">
                  <DialogTitle className="text-lg">
                    {lightbox.title}
                  </DialogTitle>
                  {lightbox.caption && (
                    <DialogDescription className="text-sm">
                      {lightbox.caption}
                    </DialogDescription>
                  )}
                </DialogHeader>
                <div className="flex flex-wrap items-center gap-1.5 pt-2 text-xs text-muted-foreground">
                  {lightbox.album && (
                    <Badge variant="outline" className="text-[10px]">
                      <AlbumIcon className="h-2.5 w-2.5 mr-1" />
                      {lightbox.album}
                    </Badge>
                  )}
                  <Badge
                    variant={
                      STATUS_BADGE[lightbox.status]?.variant ?? "secondary"
                    }
                    className="text-[10px]"
                  >
                    {STATUS_BADGE[lightbox.status]?.label ?? lightbox.status}
                  </Badge>
                  <span className="flex items-center gap-1">
                    <CalendarDays className="h-3 w-3" />
                    {format(new Date(lightbox.createdAt), "d MMM yyyy")}
                  </span>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function GalleryCard({
  media,
  canManage,
  onEdit,
  onDelete,
  onClick,
}: {
  media: GalleryItem;
  canManage: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onClick: () => void;
}) {
  const status = STATUS_BADGE[media.status] ?? STATUS_BADGE.published;
  return (
    <div
      className="mb-3 break-inside-avoid group relative rounded-md overflow-hidden border border-border bg-secondary/30 hover:border-primary/40 transition-colors"
    >
      <button
        type="button"
        onClick={onClick}
        className="block w-full cursor-zoom-in"
        aria-label={`View ${media.title}`}
      >
        { }
        <img
          src={media.imageUrl}
          alt={media.title}
          loading="lazy"
          className="w-full h-auto object-cover"
        />
      </button>
      <div className="absolute top-2 right-2 flex items-center gap-1">
        <Badge
          variant={status.variant}
          className="backdrop-blur-sm bg-background/80 text-[10px]"
        >
          {status.label}
        </Badge>
      </div>
      <div className="p-3 space-y-1.5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-medium leading-tight line-clamp-2">
            {media.title}
          </h3>
        </div>
        {media.caption && (
          <p className="text-xs text-muted-foreground line-clamp-2">
            {media.caption}
          </p>
        )}
        <div className="flex items-center justify-between pt-1">
          <div className="flex flex-wrap items-center gap-1.5">
            {media.album && (
              <Badge variant="outline" className="text-[10px]">
                <AlbumIcon className="h-2.5 w-2.5 mr-1" />
                {media.album}
              </Badge>
            )}
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <CalendarDays className="h-2.5 w-2.5" />
              {format(new Date(media.createdAt), "d MMM yyyy")}
            </span>
          </div>
          {canManage && (
            <div className="flex items-center gap-0.5">
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0"
                onClick={onEdit}
                aria-label="Edit"
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                onClick={onDelete}
                aria-label="Delete"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface GalleryFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  initial?: GalleryItem;
  albumOptions: string[];
}

function GalleryFormDialog({
  open,
  onOpenChange,
  mode,
  initial,
  albumOptions,
}: GalleryFormProps) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [title, setTitle] = React.useState(initial?.title ?? "");
  const [imageUrl, setImageUrl] = React.useState(initial?.imageUrl ?? "");
  const [imageMode, setImageMode] = React.useState<"upload" | "url">(
    initial?.imageUrl ? "url" : "upload",
  );
  const [caption, setCaption] = React.useState(initial?.caption ?? "");
  const [album, setAlbum] = React.useState(initial?.album ?? "");
  const [eventId, setEventId] = React.useState(initial?.eventId ?? "");
  const [status, setStatus] = React.useState<string>(
    initial?.status ?? "published",
  );

  const isEdit = mode === "edit";

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        title,
        imageUrl,
        caption: caption || undefined,
        album: album || undefined,
        eventId: eventId || undefined,
        status,
      };
      if (isEdit && initial) {
        const res = await fetch(`/api/gallery/${initial.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => null);
          throw new Error(j?.error ?? "Failed to update media");
        }
        return res.json();
      } else {
        const res = await fetch("/api/gallery", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => null);
          throw new Error(j?.error ?? "Failed to create media");
        }
        return res.json();
      }
    },
    onSuccess: () => {
      toast({
        title: isEdit ? "Media updated" : "Media added",
        description: isEdit
          ? "Your changes have been saved."
          : "The image is now in the gallery.",
      });
      qc.invalidateQueries({ queryKey: ["gallery"] });
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
    if (!title.trim() || !imageUrl.trim()) {
      toast({
        title: "Missing fields",
        description: "Title and an uploaded image (or image URL) are required.",
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
            {isEdit ? "Edit media" : "Add gallery media"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the image details below."
              : "Add a new image to the chapter gallery."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Image</Label>
            <Tabs value={imageMode} onValueChange={(v) => setImageMode(v as "upload" | "url")}>
              <TabsList className="w-fit">
                <TabsTrigger value="upload" className="gap-1.5">
                  <UploadIcon className="h-3.5 w-3.5" />
                  Upload
                </TabsTrigger>
                <TabsTrigger value="url" className="gap-1.5">
                  <LinkIcon className="h-3.5 w-3.5" />
                  URL
                </TabsTrigger>
              </TabsList>
              <TabsContent value="upload" className="mt-3">
                <FileUpload
                  accept="image/*"
                  label="Image"
                  currentUrl={imageUrl}
                  onUpload={(url) => setImageUrl(url)}
                  onClear={() => setImageUrl("")}
                  hint="JPG, PNG, GIF or WebP. Maximum 5 MB."
                />
              </TabsContent>
              <TabsContent value="url" className="mt-3 space-y-1.5">
                <Input
                  id="imageUrl"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="/images/gallery/gallery-1.png or https://..."
                />
                <p className="text-xs text-muted-foreground">
                  Paste a path like{" "}
                  <code className="text-[11px] bg-secondary/60 px-1 py-0.5 rounded">
                    /images/gallery/gallery-X.png
                  </code>{" "}
                  or a full URL.
                </p>
              </TabsContent>
            </Tabs>
            {imageUrl && (
              <div className="mt-2 rounded-md overflow-hidden border border-border aspect-video bg-secondary/40 relative">
                { }
                <img
                  src={imageUrl}
                  alt="Preview"
                  loading="lazy"
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <ImageIcon className="h-8 w-8 text-muted-foreground/40" />
                </div>
              </div>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Mentorship Circle — Group Photo"
              required
            />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="album">Album</Label>
              <Input
                id="album"
                value={album}
                onChange={(e) => setAlbum(e.target.value)}
                placeholder="e.g. Mentorship 2026"
                list="album-suggestions"
              />
              <datalist id="album-suggestions">
                {albumOptions.map((a) => (
                  <option key={a} value={a} />
                ))}
              </datalist>
              <p className="text-xs text-muted-foreground">
                Grouping for multi-image sets.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="caption">Caption (optional)</Label>
            <Textarea
              id="caption"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="A short description shown under the image."
              rows={2}
              maxLength={600}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="eventId">Event ID (optional)</Label>
            <Input
              id="eventId"
              value={eventId}
              onChange={(e) => setEventId(e.target.value)}
              placeholder="Optional — links to an event (denormalized string)"
            />
            <p className="text-xs text-muted-foreground">
              Stored as a free-text reference; no foreign key enforced.
            </p>
          </div>
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
                  : "Add media"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
