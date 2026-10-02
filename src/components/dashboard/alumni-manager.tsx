"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Pencil,
  Archive,
  RefreshCw,
  GraduationCap,
  Briefcase,
  Linkedin,
  Mail,
  Phone,
  Users,
  Sparkles,
  Search,
} from "lucide-react";

// ---------- Types ----------
export interface AlumniItem {
  id: string;
  userId: string | null;
  fullName: string;
  email: string;
  phone: string | null;
  graduationYear: number;
  formerRole: string | null;
  school: string | null;
  program: string | null;
  currentOccupation: string | null;
  company: string | null;
  linkedinUrl: string | null;
  bio: string | null;
  avatarUrl: string | null;
  engagementLevel: "active" | "passive" | "mentor" | "uncontactable";
  status: "active" | "archived";
  createdAt: string;
  updatedAt: string;
}

interface Props {
  initialAlumni: AlumniItem[];
  canManage: boolean;
}

// ---------- Constants ----------
const ENGAGEMENT_LABELS: Record<AlumniItem["engagementLevel"], string> = {
  mentor: "Mentor",
  active: "Active",
  passive: "Passive",
  uncontactable: "Uncontactable",
};

const ENGAGEMENT_BADGE: Record<AlumniItem["engagementLevel"], string> = {
  mentor: "bg-primary/10 text-primary border-primary/30 dark:bg-primary/20 dark:text-primary dark:border-primary/40",
  active: "bg-accent/20 text-accent-foreground border-accent/30 dark:bg-accent/20 dark:text-accent-foreground dark:border-accent/40",
  passive: "bg-muted text-muted-foreground border-border dark:bg-muted/30 dark:text-muted-foreground dark:border-border",
  uncontactable: "bg-muted text-muted-foreground border-border",
};

const ENGAGEMENT_KEYS = Object.keys(ENGAGEMENT_LABELS) as AlumniItem["engagementLevel"][];

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

// ---------- Main component ----------
export function AlumniManager({ initialAlumni, canManage }: Props) {
  const qc = useQueryClient();
  const { toast } = useToast();

  // Filters
  const [search, setSearch] = React.useState("");
  const [engagementFilter, setEngagementFilter] = React.useState<string>("all");
  const [yearFilter, setYearFilter] = React.useState<string>("all");

  // Dialog state
  const [creating, setCreating] = React.useState(false);
  const [editing, setEditing] = React.useState<AlumniItem | null>(null);
  const [archiving, setArchiving] = React.useState<AlumniItem | null>(null);

  // Build year options from data.
  const yearOptions = React.useMemo(() => {
    const years = new Set<number>();
    for (const a of initialAlumni) years.add(a.graduationYear);
    return Array.from(years).sort((a, b) => b - a);
  }, [initialAlumni]);

  // ---------- Alumni query ----------
  const alumniQuery = useQuery<{ items: AlumniItem[]; canManage: boolean }>({
    queryKey: ["alumni", search, engagementFilter, yearFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (engagementFilter !== "all") params.set("engagementLevel", engagementFilter);
      if (yearFilter !== "all") params.set("graduationYear", yearFilter);
      const res = await fetch(`/api/alumni?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load alumni");
      return res.json();
    },
    initialData: { items: initialAlumni, canManage },
  });

  const alumni = alumniQuery.data?.items ?? [];

  // ---------- Summary cards ----------
  const summary = React.useMemo(() => {
    const total = alumni.length;
    const activeEngagement = alumni.filter((a) => a.engagementLevel === "active").length;
    const mentors = alumni.filter((a) => a.engagementLevel === "mentor").length;
    // Latest 3 graduation years represented in the data.
    const yearsSet = new Set<number>();
    for (const a of alumni) yearsSet.add(a.graduationYear);
    const years = Array.from(yearsSet).sort((a, b) => b - a).slice(0, 3);
    return { total, activeEngagement, mentors, years };
  }, [alumni]);

  // ---------- Archive mutation ----------
  const archiveMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/alumni/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error ?? "Failed to archive alumni");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Alumni archived",
        description: "The record has been moved to archived status.",
      });
      qc.invalidateQueries({ queryKey: ["alumni"] });
    },
    onError: (e: Error) =>
      toast({ title: "Could not archive", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-4">
      {/* ---------- Summary cards ---------- */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <SummaryCard
          icon={<GraduationCap className="h-4 w-4" />}
          label="Total Alumni"
          value={summary.total}
          tone="default"
        />
        <SummaryCard
          icon={<Sparkles className="h-4 w-4" />}
          label="Active Engagement"
          value={summary.activeEngagement}
          tone="amber"
        />
        <SummaryCard
          icon={<Users className="h-4 w-4" />}
          label="Mentors"
          value={summary.mentors}
          tone="emerald"
        />
        <Card className="border-border/50 bg-muted/50/50 dark:bg-muted/20">
          <CardContent className="p-4">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
              By Grad Year (latest 3)
            </div>
            <div className="flex flex-wrap gap-1.5">
              {summary.years.length === 0 ? (
                <span className="text-xs text-muted-foreground">—</span>
              ) : (
                summary.years.map((y) => (
                  <Badge key={y} variant="outline" className="text-[10px]">
                    {y}
                  </Badge>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ---------- Filter bar ---------- */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-end gap-3">
            <div className="space-y-1.5 flex-1">
              <Label htmlFor="search" className="text-xs text-muted-foreground">
                Search
              </Label>
              <div className="relative">
                <Search className="h-3.5 w-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
                <Input
                  id="search"
                  placeholder="Name, email, role, company, school…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="engagement-filter" className="text-xs text-muted-foreground">
                Engagement
              </Label>
              <Select value={engagementFilter} onValueChange={setEngagementFilter}>
                <SelectTrigger id="engagement-filter" className="sm:w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All levels</SelectItem>
                  {ENGAGEMENT_KEYS.map((k) => (
                    <SelectItem key={k} value={k}>
                      {ENGAGEMENT_LABELS[k]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="year-filter" className="text-xs text-muted-foreground">
                Graduation Year
              </Label>
              <Select value={yearFilter} onValueChange={setYearFilter}>
                <SelectTrigger id="year-filter" className="sm:w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All years</SelectItem>
                  {yearOptions.map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => alumniQuery.refetch()}
              disabled={alumniQuery.isFetching}
              aria-label="Refresh"
              className="mb-0.5"
            >
              <RefreshCw className={`h-4 w-4 ${alumniQuery.isFetching ? "animate-spin" : ""}`} />
            </Button>
            {canManage && (
              <Button onClick={() => setCreating(true)} className="mb-0.5">
                <Plus className="h-4 w-4 mr-1.5" />
                New alumni
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <p className="text-sm text-muted-foreground">
        {alumniQuery.isLoading ? "Loading…" : `${alumni.length} alumni record${alumni.length === 1 ? "" : "s"}`}
      </p>

      {/* ---------- Card grid ---------- */}
      {alumniQuery.isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
                <Skeleton className="h-3 w-2/3" />
                <Skeleton className="h-3 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : alumni.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center">
            <GraduationCap className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <h3 className="font-medium">No alumni records found</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {canManage
                ? "Add your first alumni record to start tracking graduates."
                : "Try adjusting your filters."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {alumni.map((a) => (
            <AlumniCard
              key={a.id}
              alumni={a}
              canManage={canManage}
              onEdit={() => setEditing(a)}
              onArchive={() => setArchiving(a)}
            />
          ))}
        </div>
      )}

      {/* ---------- Dialogs ---------- */}
      {creating && (
        <AlumniFormDialog
          open={creating}
          onOpenChange={setCreating}
          mode="create"
        />
      )}
      {editing && (
        <AlumniFormDialog
          open={!!editing}
          onOpenChange={(o) => !o && setEditing(null)}
          mode="edit"
          initial={editing}
        />
      )}

      <AlertDialog open={!!archiving} onOpenChange={(o) => !o && setArchiving(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive this alumni record?</AlertDialogTitle>
            <AlertDialogDescription>
              {archiving?.fullName} will be moved to archived status and hidden from the
              default alumni view. The record is retained and can be restored by changing its status.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep</AlertDialogCancel>
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

// ---------- Subcomponents ----------
function SummaryCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone: "default" | "emerald" | "amber" | "stone";
}) {
  const toneClass =
    tone === "emerald"
      ? "border-primary/30/50 bg-primary/10/50 dark:bg-primary/15"
      : tone === "amber"
        ? "border-accent/30/50 bg-accent/20/50 dark:bg-accent/15"
        : tone === "stone"
          ? "border-border/50 bg-muted/50/50 dark:bg-muted/20"
          : "";
  return (
    <Card className={toneClass}>
      <CardContent className="p-4 flex items-center gap-3">
        <div className="rounded-md bg-background/80 p-2 border border-border">
          {icon}
        </div>
        <div>
          <div className="text-2xl font-bold leading-none">{value}</div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">
            {label}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AlumniCard({
  alumni,
  canManage,
  onEdit,
  onArchive,
}: {
  alumni: AlumniItem;
  canManage: boolean;
  onEdit: () => void;
  onArchive: () => void;
}) {
  const engagement = ENGAGEMENT_BADGE[alumni.engagementLevel];
  return (
    <Card className="hover:border-primary/30 transition-colors flex flex-col">
      <CardContent className="p-4 space-y-3 flex-1 flex flex-col">
        {/* Header: avatar + name + role + year */}
        <div className="flex items-start gap-3">
          <Avatar className="h-12 w-12">
            {alumni.avatarUrl && (
               
              <img
                src={alumni.avatarUrl}
                alt={alumni.fullName}
                loading="lazy"
                className="aspect-square size-full rounded-full object-cover"
              />
            )}
            <AvatarFallback>{initials(alumni.fullName)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold leading-tight truncate">{alumni.fullName}</h3>
            <div className="flex flex-wrap items-center gap-1 mt-1">
              {alumni.formerRole && (
                <Badge variant="outline" className="text-[10px]">
                  {alumni.formerRole}
                </Badge>
              )}
              <Badge variant="secondary" className="text-[10px]">
                <GraduationCap className="h-2.5 w-2.5 mr-1" />
                Class of {alumni.graduationYear}
              </Badge>
            </div>
          </div>
        </div>

        {/* Occupation */}
        {(alumni.currentOccupation || alumni.company) && (
          <div className="flex items-start gap-2 text-xs text-muted-foreground">
            <Briefcase className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <div className="min-w-0">
              {alumni.currentOccupation && (
                <div className="text-sm text-foreground truncate">{alumni.currentOccupation}</div>
              )}
              {alumni.company && <div className="truncate">{alumni.company}</div>}
            </div>
          </div>
        )}

        {/* School + program */}
        {(alumni.school || alumni.program) && (
          <div className="text-xs text-muted-foreground">
            {alumni.school && <div className="truncate">{alumni.school}</div>}
            {alumni.program && <div className="truncate">{alumni.program}</div>}
          </div>
        )}

        {/* Bio (limited) */}
        {alumni.bio && (
          <p className="text-xs text-muted-foreground line-clamp-2 flex-1">
            {alumni.bio}
          </p>
        )}

        {/* Engagement badge + contact links */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-border">
          <Badge variant="outline" className={`text-[10px] ${engagement}`}>
            {ENGAGEMENT_LABELS[alumni.engagementLevel]}
          </Badge>
          <div className="ml-auto flex items-center gap-1">
            {alumni.linkedinUrl && (
              <Button asChild variant="ghost" size="icon" className="h-7 w-7" aria-label="LinkedIn profile">
                <a href={alumni.linkedinUrl} target="_blank" rel="noreferrer">
                  <Linkedin className="h-3.5 w-3.5" />
                </a>
              </Button>
            )}
            <Button asChild variant="ghost" size="icon" className="h-7 w-7" aria-label="Email">
              <a href={`mailto:${alumni.email}`}>
                <Mail className="h-3.5 w-3.5" />
              </a>
            </Button>
            {alumni.phone && (
              <Button asChild variant="ghost" size="icon" className="h-7 w-7" aria-label="Phone">
                <a href={`tel:${alumni.phone}`}>
                  <Phone className="h-3.5 w-3.5" />
                </a>
              </Button>
            )}
          </div>
        </div>

        {/* Email (small) + actions */}
        <div className="flex items-center justify-between gap-2">
          <div className="text-[10px] text-muted-foreground truncate flex-1">{alumni.email}</div>
          {canManage && (
            <div className="flex items-center gap-1 shrink-0">
              <Button size="sm" variant="outline" onClick={onEdit}>
                <Pencil className="h-3 w-3 mr-1" />
                Edit
              </Button>
              {alumni.status !== "archived" && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onArchive}
                  aria-label="Archive alumni"
                >
                  <Archive className="h-3 w-3" />
                </Button>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ---------- Form dialog ----------
function AlumniFormDialog({
  open,
  onOpenChange,
  mode,
  initial,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  initial?: AlumniItem;
}) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const currentYear = new Date().getFullYear();

  const [fullName, setFullName] = React.useState(initial?.fullName ?? "");
  const [email, setEmail] = React.useState(initial?.email ?? "");
  const [phone, setPhone] = React.useState(initial?.phone ?? "");
  const [graduationYear, setGraduationYear] = React.useState<string>(
    initial ? String(initial.graduationYear) : String(currentYear),
  );
  const [formerRole, setFormerRole] = React.useState(initial?.formerRole ?? "");
  const [school, setSchool] = React.useState(initial?.school ?? "");
  const [program, setProgram] = React.useState(initial?.program ?? "");
  const [currentOccupation, setCurrentOccupation] = React.useState(initial?.currentOccupation ?? "");
  const [company, setCompany] = React.useState(initial?.company ?? "");
  const [linkedinUrl, setLinkedinUrl] = React.useState(initial?.linkedinUrl ?? "");
  const [bio, setBio] = React.useState(initial?.bio ?? "");
  const [avatarUrl, setAvatarUrl] = React.useState(initial?.avatarUrl ?? "");
  const [engagementLevel, setEngagementLevel] = React.useState<AlumniItem["engagementLevel"]>(
    initial?.engagementLevel ?? "passive",
  );

  const isEdit = mode === "edit";

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone.trim() || null,
        graduationYear: Number(graduationYear),
        formerRole: formerRole.trim() || null,
        school: school.trim() || null,
        program: program.trim() || null,
        currentOccupation: currentOccupation.trim() || null,
        company: company.trim() || null,
        linkedinUrl: linkedinUrl.trim() || null,
        bio: bio.trim() || null,
        avatarUrl: avatarUrl.trim() || null,
        engagementLevel,
      };
      if (isEdit && initial) {
        const res = await fetch(`/api/alumni/${initial.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => null);
          throw new Error(j?.error ?? "Failed to update alumni record");
        }
        return res.json();
      } else {
        const res = await fetch("/api/alumni", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => null);
          throw new Error(j?.error ?? "Failed to create alumni record");
        }
        return res.json();
      }
    },
    onSuccess: () => {
      toast({
        title: isEdit ? "Alumni updated" : "Alumni added",
        description: isEdit
          ? "Your changes have been saved."
          : "The alumni record has been created.",
      });
      qc.invalidateQueries({ queryKey: ["alumni"] });
      onOpenChange(false);
    },
    onError: (e: Error) =>
      toast({ title: "Save failed", description: e.message, variant: "destructive" }),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim() || !email.trim() || !graduationYear) {
      toast({
        title: "Missing fields",
        description: "Full name, email, and graduation year are required.",
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
          <DialogTitle>{isEdit ? "Edit alumni" : "New alumni record"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the alumni details below."
              : "Record a former chapter leader who has graduated."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="fullName">Full name *</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Wanjiru Kamau"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="alumni@example.com"
                required
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+254 700 000 000"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="graduationYear">Graduation year *</Label>
              <Input
                id="graduationYear"
                type="number"
                min={1970}
                max={currentYear + 1}
                value={graduationYear}
                onChange={(e) => setGraduationYear(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="engagementLevel">Engagement</Label>
              <Select
                value={engagementLevel}
                onValueChange={(v) => setEngagementLevel(v as AlumniItem["engagementLevel"])}
              >
                <SelectTrigger id="engagementLevel">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ENGAGEMENT_KEYS.map((k) => (
                    <SelectItem key={k} value={k}>
                      {ENGAGEMENT_LABELS[k]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="formerRole">Former role</Label>
              <Input
                id="formerRole"
                value={formerRole}
                onChange={(e) => setFormerRole(e.target.value)}
                placeholder="e.g. President (2023–2024)"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="currentOccupation">Current occupation</Label>
              <Input
                id="currentOccupation"
                value={currentOccupation}
                onChange={(e) => setCurrentOccupation(e.target.value)}
                placeholder="e.g. Software Engineer"
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="school">School</Label>
              <Input
                id="school"
                value={school}
                onChange={(e) => setSchool(e.target.value)}
                placeholder="e.g. School of Business & Economics"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="program">Academic programme</Label>
              <Input
                id="program"
                value={program}
                onChange={(e) => setProgram(e.target.value)}
                placeholder="e.g. BSc Computer Science"
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="company">Company</Label>
              <Input
                id="company"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="e.g. Equity Bank"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="linkedinUrl">LinkedIn URL</Label>
              <Input
                id="linkedinUrl"
                type="url"
                value={linkedinUrl}
                onChange={(e) => setLinkedinUrl(e.target.value)}
                placeholder="https://linkedin.com/in/…"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="avatarUrl">Avatar URL</Label>
            <Input
              id="avatarUrl"
              type="url"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://…/photo.jpg"
            />
            {avatarUrl && (
              <div className="mt-2">
                { }
                <img
                  src={avatarUrl}
                  alt="Avatar preview"
                  loading="lazy"
                  className="h-16 w-16 rounded-full object-cover border border-border"
                />
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Short biography, career journey, chapter memories…"
              rows={4}
              maxLength={5000}
            />
            <p className="text-xs text-muted-foreground">{bio.length}/5000</p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving…" : isEdit ? "Save changes" : "Add alumni"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
