"use client";

// Event create form — full-page form (NOT a dialog).
// POSTs to /api/events and redirects to /dashboard/events on success.

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FileUpload } from "@/components/dashboard/file-upload";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Save, Loader2 } from "lucide-react";

const CATEGORY_LABELS: Record<string, string> = {
  workshop: "Workshop",
  seminar: "Seminar",
  outreach: "Outreach",
  social: "Social",
  meeting: "Meeting",
  ceremony: "Ceremony",
};

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export function EventCreateForm() {
  const router = useRouter();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [title, setTitle] = React.useState("");
  const [slug, setSlug] = React.useState("");
  const [summary, setSummary] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [category, setCategory] = React.useState("workshop");
  const [coverUrl, setCoverUrl] = React.useState("");
  const [venue, setVenue] = React.useState("");
  const [location, setLocation] = React.useState("");
  const [startAt, setStartAt] = React.useState("");
  const [endAt, setEndAt] = React.useState("");
  const [capacity, setCapacity] = React.useState("");
  const [slugEdited, setSlugEdited] = React.useState(false);

  // Auto-generate slug from title.
  React.useEffect(() => {
    if (!slugEdited) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSlug(slugify(title));
    }
  }, [title, slugEdited]);

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
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(j?.error ?? "Failed to create event");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Event created",
        description: "Saved as a draft. Publish when you're ready.",
      });
      qc.invalidateQueries({ queryKey: ["events"] });
      router.push("/dashboard/events");
    },
    onError: (e: Error) =>
      toast({ title: "Save failed", description: e.message, variant: "destructive" }),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !summary.trim() || !description.trim() || !startAt) {
      toast({
        title: "Missing fields",
        description:
          "Title, summary, description, and start date/time are required.",
        variant: "destructive",
      });
      return;
    }
    mutation.mutate();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <Link
            href="/dashboard/events"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-1"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Events
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">New Event</h1>
          <p className="mt-1 text-sm text-muted-foreground max-w-2xl">
            Create a new chapter event. It will be saved as a draft and can be
            published once details are confirmed.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline">
            <Link href="/dashboard/events">Cancel</Link>
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-1.5" />
                Create event
              </>
            )}
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-6 space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Leadership Masterclass with Dr. Mwangi"
              required
              maxLength={160}
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
              rows={6}
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
            <Label>Cover image</Label>
            <FileUpload
              accept="image/*"
              label="Cover image"
              currentUrl={coverUrl || undefined}
              onUpload={(url) => setCoverUrl(url)}
              onClear={() => setCoverUrl("")}
              hint="Upload a cover image, or paste a URL below."
            />
            <Input
              id="coverUrl"
              value={coverUrl}
              onChange={(e) => setCoverUrl(e.target.value)}
              placeholder="https://... or /uploads/..."
              type="url"
            />
            {coverUrl && (
              <div className="mt-2 rounded-md overflow-hidden border border-border aspect-[16/9] bg-secondary/40">
                { }
                <img
                  src={coverUrl}
                  alt="Cover preview"
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
