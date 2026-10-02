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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { FileUpload } from "@/components/dashboard/file-upload";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Pencil,
  Archive,
  RefreshCw,
  Files,
  FileText,
  Download,
  ExternalLink,
  CalendarDays,
  Eye,
  Lock,
  ShieldCheck,
  FileStack,
  Upload as UploadIcon,
  Link as LinkIcon,
} from "lucide-react";

export interface ResourceItem {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  category: string | null;
  fileUrl: string | null;
  externalUrl: string | null;
  visibility: "public" | "leaders" | "executive";
  status: "draft" | "published" | "archived";
  createdAt: string;
  updatedAt: string;
}

interface Props {
  initialResources: ResourceItem[];
  canManage: boolean;
}

const CATEGORY_LABELS: Record<string, string> = {
  document: "Documents",
  template: "Templates",
  policy: "Policies",
  form: "Forms",
  guide: "Guides",
};

const CATEGORY_ORDER = ["policy", "document", "template", "form", "guide"];

const CATEGORY_ICONS: Record<string, typeof FileText> = {
  document: FileText,
  template: Files,
  policy: ShieldCheck,
  form: FileStack,
  guide: FileText,
};

const VISIBILITY_LABELS: Record<
  string,
  { label: string; icon: typeof Eye; variant: "default" | "secondary" | "outline" }
> = {
  public: { label: "Public", icon: Eye, variant: "default" },
  leaders: { label: "Leaders", icon: Lock, variant: "secondary" },
  executive: { label: "Executive", icon: ShieldCheck, variant: "outline" },
};

const STATUS_BADGE: Record<
  string,
  { label: string; variant: "default" | "secondary" | "outline" }
> = {
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

export function ResourcesManager({ initialResources, canManage }: Props) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [tab, setTab] = React.useState<
    "all" | "draft" | "published" | "archived"
  >("all");
  const [categoryFilter, setCategoryFilter] = React.useState<string>("all");
  const [search, setSearch] = React.useState("");
  const [editing, setEditing] = React.useState<ResourceItem | null>(null);
  const [creating, setCreating] = React.useState(false);
  const [archiving, setArchiving] = React.useState<ResourceItem | null>(null);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["resources", tab, categoryFilter, search],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (tab !== "all") params.set("status", tab);
      if (categoryFilter !== "all") params.set("category", categoryFilter);
      if (search) params.set("search", search);
      const res = await fetch(`/api/resources?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load resources");
      return (await res.json()) as {
        items: ResourceItem[];
        canManage: boolean;
        visibilityScope: string | string[];
      };
    },
    initialData: { items: initialResources, canManage, visibilityScope: "all" },
  });

  const items = data?.items ?? [];

  // Group items by category for display.
  const grouped = React.useMemo(() => {
    const map = new Map<string, ResourceItem[]>();
    for (const r of items) {
      const key = r.category ?? "other";
      const list = map.get(key) ?? [];
      list.push(r);
      map.set(key, list);
    }
    return map;
  }, [items]);

  const sortedCategories = React.useMemo(() => {
    const keys = Array.from(grouped.keys());
    return keys.sort((a, b) => {
      const ai = CATEGORY_ORDER.indexOf(a);
      const bi = CATEGORY_ORDER.indexOf(b);
      if (ai === -1 && bi === -1) return a.localeCompare(b);
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });
  }, [grouped]);

  const archiveMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/resources/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error ?? "Failed to archive resource");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Resource archived",
        description: "It is no longer visible to your members.",
      });
      qc.invalidateQueries({ queryKey: ["resources"] });
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
            <TabsTrigger value="published">Published</TabsTrigger>
            <TabsTrigger value="draft">Drafts</TabsTrigger>
            <TabsTrigger value="archived">Archived</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[170px]" aria-label="Filter by category">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {CATEGORY_ORDER.map((c) => (
                <SelectItem key={c} value={c}>
                  {CATEGORY_LABELS[c]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            placeholder="Search resources..."
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
              New resource
            </Button>
          )}
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        {isLoading
          ? "Loading..."
          : `${items.length} resource${items.length === 1 ? "" : "s"}`}
      </p>

      {isLoading ? (
        <div className="space-y-6">
          {Array.from({ length: 2 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4 space-y-3">
                <Skeleton className="h-5 w-1/4" />
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {Array.from({ length: 3 }).map((_, j) => (
                    <Skeleton key={j} className="h-24 w-full rounded-md" />
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center">
            <Files className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <h3 className="font-medium">No resources found</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {canManage
                ? "Add your first document, template, policy, form or guide."
                : "Check back later for chapter resources."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {sortedCategories.map((cat) => {
            const Icon = CATEGORY_ICONS[cat] ?? FileText;
            const label = CATEGORY_LABELS[cat] ?? cat;
            const list = grouped.get(cat) ?? [];
            return (
              <section key={cat} className="space-y-3">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-primary" />
                  <h3 className="font-semibold tracking-tight">{label}</h3>
                  <Badge variant="outline" className="text-[10px]">
                    {list.length}
                  </Badge>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {list.map((r) => (
                    <ResourceCard
                      key={r.id}
                      resource={r}
                      canManage={canManage}
                      onEdit={() => setEditing(r)}
                      onArchive={() => setArchiving(r)}
                      isArchiving={archiveMutation.isPending}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {creating && (
        <ResourceFormDialog
          open={creating}
          onOpenChange={setCreating}
          mode="create"
        />
      )}
      {editing && (
        <ResourceFormDialog
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
            <AlertDialogTitle>Archive this resource?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{archiving?.title}&rdquo; will be moved to the archived
              tab and removed from your members&rsquo; view. You can restore it
              later by editing its status.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                archiving && archiveMutation.mutate(archiving.id)
              }
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

function ResourceCard({
  resource,
  canManage,
  onEdit,
  onArchive,
  isArchiving,
}: {
  resource: ResourceItem;
  canManage: boolean;
  onEdit: () => void;
  onArchive: () => void;
  isArchiving: boolean;
}) {
  const status = STATUS_BADGE[resource.status] ?? STATUS_BADGE.published;
  const vis = VISIBILITY_LABELS[resource.visibility] ?? VISIBILITY_LABELS.public;
  const VisIcon = vis.icon;
  const href = resource.externalUrl || resource.fileUrl;
  const isExternal = Boolean(resource.externalUrl);
  return (
    <Card className="hover:border-primary/30 transition-colors flex flex-col">
      <CardContent className="p-4 space-y-3 flex-1 flex flex-col">
        <div className="space-y-2 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold leading-tight line-clamp-2">
              {resource.title}
            </h3>
            <Badge variant={status.variant} className="shrink-0">
              {status.label}
            </Badge>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant={vis.variant} className="text-[10px]">
              <VisIcon className="h-2.5 w-2.5 mr-1" />
              {vis.label}
            </Badge>
          </div>
          {resource.description && (
            <p className="text-sm text-muted-foreground line-clamp-3">
              {resource.description}
            </p>
          )}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <CalendarDays className="h-3 w-3" />
            Updated {format(new Date(resource.updatedAt), "d MMM yyyy")}
          </div>
        </div>
        <div className="flex items-center gap-1.5 pt-1 border-t border-border">
          {href ? (
            <Button
              size="sm"
              variant="default"
              className="flex-1"
              asChild
            >
              <a
                href={href}
                target={isExternal ? "_blank" : undefined}
                rel={isExternal ? "noreferrer" : undefined}
              >
                {isExternal ? (
                  <ExternalLink className="h-3.5 w-3.5 mr-1" />
                ) : (
                  <Download className="h-3.5 w-3.5 mr-1" />
                )}
                {isExternal ? "Open" : "Download"}
              </a>
            </Button>
          ) : (
            <Button size="sm" variant="outline" disabled className="flex-1">
              <FileText className="h-3.5 w-3.5 mr-1" />
              No link
            </Button>
          )}
          {canManage && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={onEdit}
                aria-label="Edit"
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              {resource.status !== "archived" && (
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
        </div>
      </CardContent>
    </Card>
  );
}

interface ResourceFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  initial?: ResourceItem;
}

function ResourceFormDialog({
  open,
  onOpenChange,
  mode,
  initial,
}: ResourceFormProps) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [title, setTitle] = React.useState(initial?.title ?? "");
  const [slug, setSlug] = React.useState(initial?.slug ?? "");
  const [description, setDescription] = React.useState(
    initial?.description ?? "",
  );
  const [category, setCategory] = React.useState<string>(
    initial?.category ?? "document",
  );
  const [fileUrl, setFileUrl] = React.useState(initial?.fileUrl ?? "");
  const [fileMode, setFileMode] = React.useState<"upload" | "url">(
    initial?.fileUrl ? "url" : "upload",
  );
  const [externalUrl, setExternalUrl] = React.useState(
    initial?.externalUrl ?? "",
  );
  const [visibility, setVisibility] = React.useState<string>(
    initial?.visibility ?? "public",
  );
  const [status, setStatus] = React.useState<string>(
    initial?.status ?? "published",
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
      const payload = {
        title,
        slug: slug || undefined,
        description: description || undefined,
        category,
        fileUrl: fileUrl || undefined,
        externalUrl: externalUrl || undefined,
        visibility,
        status,
      };
      if (isEdit && initial) {
        const res = await fetch(`/api/resources/${initial.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => null);
          throw new Error(j?.error ?? "Failed to update resource");
        }
        return res.json();
      } else {
        const res = await fetch("/api/resources", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => null);
          throw new Error(j?.error ?? "Failed to create resource");
        }
        return res.json();
      }
    },
    onSuccess: () => {
      toast({
        title: isEdit ? "Resource updated" : "Resource created",
        description: isEdit
          ? "Your changes have been saved."
          : "The resource is now available to its audience.",
      });
      qc.invalidateQueries({ queryKey: ["resources"] });
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
    if (!title.trim()) {
      toast({
        title: "Missing fields",
        description: "Title is required.",
        variant: "destructive",
      });
      return;
    }
    if (!fileUrl.trim() && !externalUrl.trim()) {
      toast({
        title: "Missing link",
        description:
          "Provide either a file URL or an external URL for this resource.",
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
            {isEdit ? "Edit resource" : "New resource"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the resource details below."
              : "Add a chapter document, template, policy, form or guide."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Chapter Constitution 2026"
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
              Used in the URL: /resources/&lt;slug&gt;
            </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
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
              <Label htmlFor="visibility">Visibility</Label>
              <Select value={visibility} onValueChange={setVisibility}>
                <SelectTrigger id="visibility">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">
                    <span>Public — anyone</span>
                  </SelectItem>
                  <SelectItem value="leaders">
                    <span>Leaders — chapter members</span>
                  </SelectItem>
                  <SelectItem value="executive">
                    <span>Executive — committee only</span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A short summary of what this resource is for."
              rows={3}
              maxLength={2000}
            />
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>File (internal)</Label>
              <Tabs value={fileMode} onValueChange={(v) => setFileMode(v as "upload" | "url")}>
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
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.txt"
                    label="Document"
                    currentUrl={fileUrl || undefined}
                    onUpload={(url) => setFileUrl(url)}
                    onClear={() => setFileUrl("")}
                    hint="PDF, DOC/DOCX, XLS/XLSX or TXT. Maximum 10 MB."
                  />
                </TabsContent>
                <TabsContent value="url" className="mt-3 space-y-1.5">
                  <Input
                    id="fileUrl"
                    value={fileUrl}
                    onChange={(e) => setFileUrl(e.target.value)}
                    placeholder="/documents/constitution-2026.pdf"
                  />
                  <p className="text-xs text-muted-foreground">
                    Used when the file is hosted on the site (Download button).
                  </p>
                </TabsContent>
              </Tabs>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="externalUrl">External URL (optional)</Label>
              <Input
                id="externalUrl"
                value={externalUrl}
                onChange={(e) => setExternalUrl(e.target.value)}
                placeholder="https://drive.google.com/..."
              />
              <p className="text-xs text-muted-foreground">
                Opens in a new tab. Provide either an uploaded file or an
                external link (or both).
              </p>
            </div>
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
                  : "Create resource"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
