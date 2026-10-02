"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Search, Users, Mail, Phone, GraduationCap, RefreshCw, AlertCircle, Pencil, Trash2, Download, Save, X, Loader2 } from "lucide-react";
import { FileUpload } from "@/components/dashboard/file-upload";
import { SCHOOLS } from "@/lib/constants/schools";

export interface LeaderItem {
  id: string;
  email: string;
  status: string;
  fullName: string;
  preferredName: string | null;
  gender: string | null;
  yearOfStudy: number | null;
  school: string | null;
  program: string | null;
  phone: string | null;
  bio: string | null;
  avatarUrl: string | null;
  isExecutive: boolean;
  executiveRole: { key: string; name: string } | null;
  canManage: boolean;
}

interface Props {
  initialLeaders: LeaderItem[];
  schools: string[];
  scopeReadOnly: boolean;
  scopeGender: string | null;
  scopeYear: number | null;
}

export function LeadersBrowser({ initialLeaders, schools, scopeReadOnly, scopeGender, scopeYear }: Props) {
  const [search, setSearch] = React.useState("");
  const [year, setYear] = React.useState<string>(scopeYear ? String(scopeYear) : "all");
  const [school, setSchool] = React.useState<string>("all");
  const [gender, setGender] = React.useState<string>(scopeGender ?? "all");
  const [selected, setSelected] = React.useState<LeaderItem | null>(null);
  const [editing, setEditing] = React.useState<LeaderItem | null>(null);
  const [confirmArchive, setConfirmArchive] = React.useState<LeaderItem | null>(null);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  // When scope is restricted to a cohort, lock the gender/year filters.
  const genderLocked = !!scopeGender;
  const yearLocked = !!scopeYear;

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["leaders", search, year, school, gender],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (year !== "all") params.set("year", year);
      if (school !== "all") params.set("school", school);
      if (gender !== "all") params.set("gender", gender);
      const res = await fetch(`/api/leaders?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load leaders");
      return (await res.json()) as { items: LeaderItem[]; total: number; scope: { readOnly: boolean } };
    },
    initialData: { items: initialLeaders, total: initialLeaders.length, scope: { readOnly: scopeReadOnly } },
  });

  // Debounce search
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const items = data?.items ?? [];

  // --- Mutation: update a leader's profile ---
  const updateMutation = useMutation({
    mutationFn: async (payload: { id: string; data: Record<string, unknown> }) => {
      const res = await fetch(`/api/leaders/${payload.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload.data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed to update leader.");
      }
      return (await res.json()) as LeaderItem;
    },
    onSuccess: (updated) => {
      queryClient.setQueriesData(
        ["leaders"],
        (old: { items: LeaderItem[]; total: number; scope: { readOnly: boolean } } | undefined) => {
          if (!old) return old;
          return {
            ...old,
            items: old.items.map((l) => (l.id === updated.id ? { ...l, ...updated } : l)),
          };
        },
      );
      setEditing(null);
      toast({ title: "Leader updated", description: "Changes have been saved." });
    },
    onError: (err: Error) => {
      toast({ title: "Update failed", description: err.message, variant: "destructive" });
    },
  });

  // --- Mutation: archive (soft delete) a leader ---
  const archiveMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/leaders/${id}/archive`, { method: "POST" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed to archive leader.");
      }
      return (await res.json()) as { message: string };
    },
    onSuccess: (_data, id) => {
      queryClient.setQueriesData(
        ["leaders"],
        (old: { items: LeaderItem[]; total: number; scope: { readOnly: boolean } } | undefined) => {
          if (!old) return old;
          return {
            ...old,
            items: old.items.filter((l) => l.id !== id),
            total: Math.max(0, old.total - 1),
          };
        },
      );
      setConfirmArchive(null);
      setSelected(null);
      toast({ title: "Leader archived", description: "The leader has been deactivated." });
    },
    onError: (err: Error) => {
      toast({ title: "Archive failed", description: err.message, variant: "destructive" });
    },
  });

  // --- Mutation: export leaders as CSV ---
  const exportMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/leaders/export", { method: "POST" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed to export leaders.");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = res.headers.get("Content-Disposition")?.match(/filename="([^"]+)"/)?.[1] ?? "leaders.csv";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
    onError: (err: Error) => {
      toast({ title: "Export failed", description: err.message, variant: "destructive" });
    },
  });

  function openEdit(leader: LeaderItem) {
    setEditing(leader);
  }

  function closeEdit() {
    setEditing(null);
  }

  function handleExport() {
    exportMutation.mutate();
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="search" className="text-xs">Search</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Name, email, phone..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="year" className="text-xs">Year</Label>
              <Select value={year} onValueChange={setYear} disabled={yearLocked}>
                <SelectTrigger id="year"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All years</SelectItem>
                  <SelectItem value="1">Year 1</SelectItem>
                  <SelectItem value="2">Year 2</SelectItem>
                  <SelectItem value="3">Year 3</SelectItem>
                  <SelectItem value="4">Year 4</SelectItem>
                  <SelectItem value="5">Year 5</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="school" className="text-xs">School</Label>
              <Select value={school} onValueChange={setSchool}>
                <SelectTrigger id="school"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All schools</SelectItem>
                  {schools.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="gender" className="text-xs">Gender</Label>
              <Select value={gender} onValueChange={setGender} disabled={genderLocked}>
                <SelectTrigger id="gender"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {(yearLocked || genderLocked) && (
            <p className="mt-3 text-xs text-muted-foreground flex items-center gap-1.5">
              <AlertCircle className="h-3 w-3" />
              Gender/year filters are locked to your cohort scope.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Results header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm text-muted-foreground">
          {isLoading ? "Loading..." : `${items.length} leader${items.length === 1 ? "" : "s"} shown`}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={exportMutation.isPending || items.length === 0}
          >
            {exportMutation.isPending ? (
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5 mr-1.5" />
            )}
            Export CSV
          </Button>
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="space-y-1.5 flex-1">
                    <Skeleton className="h-3.5 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
                <Skeleton className="h-3 w-2/3" />
                <Skeleton className="h-3 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center">
            <Users className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <h3 className="font-medium">No leaders found</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Try adjusting your search or filters.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((leader) => (
            <LeaderCard
              key={leader.id}
              leader={leader}
              canManage={leader.canManage && !scopeReadOnly}
              onEdit={() => openEdit(leader)}
              onArchive={() => setConfirmArchive(leader)}
              onView={() => setSelected(leader)}
            />
          ))}
        </div>
      )}

      {/* Detail dialog */}
      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="sm:max-w-md">
          {selected && (
            <LeaderDetail
              leader={selected}
              canManage={selected.canManage && !scopeReadOnly}
              onEdit={() => { setSelected(null); openEdit(selected); }}
              onArchive={() => { setSelected(null); setConfirmArchive(selected); }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <EditLeaderDialog
        leader={editing}
        open={!!editing}
        onClose={closeEdit}
        onSave={(data) => updateMutation.mutate({ id: editing!.id, data })}
        saving={updateMutation.isPending}
      />

      {/* Archive confirmation */}
      <Dialog open={!!confirmArchive} onOpenChange={(open) => !open && setConfirmArchive(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Archive leader?</DialogTitle>
            <DialogDescription>
              This will deactivate{" "}
              <span className="font-medium">{confirmArchive?.fullName}</span>. They will no
              longer appear in leader lists but their data is preserved.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmArchive(null)}
              disabled={archiveMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => archiveMutation.mutate(confirmArchive!.id)}
              disabled={archiveMutation.isPending}
            >
              {archiveMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Archive
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function LeaderCard({
  leader,
  canManage,
  onEdit,
  onArchive,
  onView,
}: {
  leader: LeaderItem;
  canManage: boolean;
  onEdit: () => void;
  onArchive: () => void;
  onView: () => void;
}) {
  const initials = leader.fullName.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();
  return (
    <Card className="hover:border-primary/30 transition-colors">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start gap-3">
          <Avatar className="h-12 w-12 border border-border">
            <AvatarImage src={leader.avatarUrl ?? undefined} alt={leader.fullName} />
            <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="font-medium text-sm truncate">{leader.fullName}</div>
            <div className="text-xs text-muted-foreground truncate">{leader.email}</div>
            <div className="mt-1.5 flex flex-wrap gap-1">
              {leader.executiveRole && (
                <Badge variant="default" className="text-[10px] uppercase tracking-wide">
                  {leader.executiveRole.name}
                </Badge>
              )}
              {leader.yearOfStudy && (
                <Badge variant="secondary" className="text-[10px]">Y{leader.yearOfStudy}</Badge>
              )}
              {leader.gender && (
                <Badge variant="outline" className="text-[10px] capitalize">{leader.gender}</Badge>
              )}
            </div>
          </div>
        </div>
        <div className="space-y-1 text-xs text-muted-foreground">
          {leader.school && (
            <div className="flex items-start gap-1.5">
              <GraduationCap className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span className="truncate">{leader.program ?? leader.school}</span>
            </div>
          )}
          {leader.phone && (
            <div className="flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5" />
              <span>{leader.phone}</span>
            </div>
          )}
        </div>
        {canManage ? (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1" onClick={onEdit}>
              <Pencil className="h-3.5 w-3.5 mr-1.5" />
              Edit
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 text-destructive hover:text-destructive"
              onClick={onArchive}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              Archive
            </Button>
          </div>
        ) : (
          <Button variant="outline" size="sm" className="w-full" onClick={onView}>
            View profile
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function LeaderDetail({
  leader,
  canManage,
  onEdit,
  onArchive,
}: {
  leader: LeaderItem;
  canManage: boolean;
  onEdit: () => void;
  onArchive: () => void;
}) {
  const initials = leader.fullName.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();
  return (
    <>
      <DialogHeader>
        <DialogTitle className="sr-only">Leader profile</DialogTitle>
        <DialogDescription className="sr-only">View leader details</DialogDescription>
      </DialogHeader>
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <Avatar className="h-16 w-16 border border-border">
            <AvatarImage src={leader.avatarUrl ?? undefined} alt={leader.fullName} />
            <AvatarFallback className="bg-primary/10 text-primary text-base font-semibold">{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-bold">{leader.fullName}</h3>
            {leader.executiveRole && (
              <Badge variant="default" className="mt-0.5 text-[10px] uppercase tracking-wide">
                {leader.executiveRole.name}
              </Badge>
            )}
            {!leader.executiveRole && (
              <Badge variant="secondary" className="mt-0.5 text-[10px] uppercase tracking-wide">
                Leader
              </Badge>
            )}
          </div>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Mail className="h-4 w-4 text-primary" />
            <span className="truncate">{leader.email}</span>
          </div>
          {leader.phone && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone className="h-4 w-4 text-primary" />
              <span>{leader.phone}</span>
            </div>
          )}
          {leader.school && (
            <div className="flex items-start gap-2 text-muted-foreground">
              <GraduationCap className="h-4 w-4 mt-0.5 text-primary" />
              <div>
                <div>{leader.program}</div>
                <div className="text-xs text-muted-foreground">{leader.school}</div>
              </div>
            </div>
          )}
        </div>
        {leader.bio && (
          <div className="rounded-md border border-border p-3 text-sm">
            <div className="text-xs font-medium text-muted-foreground mb-1">Bio</div>
            <p className="text-sm leading-relaxed">{leader.bio}</p>
          </div>
        )}
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="rounded-md border border-border p-2">
            <div className="text-muted-foreground">Gender</div>
            <div className="font-medium capitalize mt-0.5">{leader.gender ?? "—"}</div>
          </div>
          <div className="rounded-md border border-border p-2">
            <div className="text-muted-foreground">Year</div>
            <div className="font-medium mt-0.5">Year {leader.yearOfStudy ?? "—"}</div>
          </div>
          <div className="rounded-md border border-border p-2">
            <div className="text-muted-foreground">Status</div>
            <div className="font-medium capitalize mt-0.5">{leader.status}</div>
          </div>
        </div>
        {canManage && (
          <div className="flex gap-2 pt-2">
            <Button variant="default" size="sm" className="flex-1" onClick={onEdit}>
              <Pencil className="h-3.5 w-3.5 mr-1.5" />
              Edit profile
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="flex-1"
              onClick={onArchive}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              Archive
            </Button>
          </div>
        )}
      </div>
    </>
  );
}

// ---------- Edit dialog ----------

interface EditForm {
  fullName: string;
  preferredName: string;
  gender: string;
  yearOfStudy: number | null;
  school: string;
  program: string;
  phone: string;
  bio: string;
  avatarUrl: string;
}

function EditLeaderDialog({
  leader,
  open,
  onClose,
  onSave,
  saving,
}: {
  leader: LeaderItem | null;
  open: boolean;
  onClose: () => void;
  onSave: (data: Record<string, unknown>) => void;
  saving: boolean;
}) {
  const [form, setForm] = React.useState<EditForm | null>(null);
  const { toast } = useToast();

  // Reset form when the dialog opens with a new leader.
  React.useEffect(() => {
    if (leader && open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setForm({
        fullName: leader.fullName,
        preferredName: leader.preferredName ?? "",
        gender: leader.gender ?? "other",
        yearOfStudy: leader.yearOfStudy ?? null,
        school: leader.school ?? "",
        program: leader.program ?? "",
        phone: leader.phone ?? "",
        bio: leader.bio ?? "",
        avatarUrl: leader.avatarUrl ?? "",
      });
    }
  }, [leader, open]);

  if (!form) return null;

  function set<K extends keyof EditForm>(key: K, value: EditForm[K]) {
    setForm((f) => (f ? { ...f, [key]: value } : f));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload: Record<string, unknown> = {
      fullName: form.fullName,
      preferredName: form.preferredName || null,
      gender: form.gender,
      yearOfStudy: form.yearOfStudy,
      school: form.school || null,
      program: form.program || null,
      phone: form.phone || null,
      bio: form.bio || null,
      avatarUrl: form.avatarUrl || null,
    };
    onSave(payload);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit leader profile</DialogTitle>
          <DialogDescription>
            Update {leader?.fullName}&apos;s chapter profile. Changes are scoped to your cohort.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Avatar upload */}
          <div className="space-y-1.5">
            <Label>Profile picture</Label>
            <FileUpload
              accept="image/*"
              label="Avatar"
              currentUrl={form.avatarUrl}
              onUpload={(url) => set("avatarUrl", url)}
              onClear={() => set("avatarUrl", "")}
              hint="Upload a profile picture (jpg, png, gif, webp)."
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="edit-fullName">Full name</Label>
              <Input
                id="edit-fullName"
                value={form.fullName}
                onChange={(e) => set("fullName", e.target.value)}
                disabled={saving}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-preferredName">Preferred name</Label>
              <Input
                id="edit-preferredName"
                value={form.preferredName}
                onChange={(e) => set("preferredName", e.target.value)}
                disabled={saving}
                placeholder="What should we call you?"
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="edit-phone">Phone</Label>
              <Input
                id="edit-phone"
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                disabled={saving}
                placeholder="+254712345678"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-gender">Gender</Label>
              <Select value={form.gender} onValueChange={(v) => set("gender", v)} disabled={saving}>
                <SelectTrigger id="edit-gender"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="edit-school">School</Label>
              <Select value={form.school} onValueChange={(v) => set("school", v)} disabled={saving}>
                <SelectTrigger id="edit-school"><SelectValue placeholder="Select school" /></SelectTrigger>
                <SelectContent>
                  {SCHOOLS.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-year">Year of study</Label>
              <Select
                value={form.yearOfStudy ? String(form.yearOfStudy) : "1"}
                onValueChange={(v) => set("yearOfStudy", Number(v))}
                disabled={saving}
              >
                <SelectTrigger id="edit-year"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Year 1</SelectItem>
                  <SelectItem value="2">Year 2</SelectItem>
                  <SelectItem value="3">Year 3</SelectItem>
                  <SelectItem value="4">Year 4</SelectItem>
                  <SelectItem value="5">Year 5</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-program">Programme</Label>
            <Input
              id="edit-program"
              value={form.program}
              onChange={(e) => set("program", e.target.value)}
              disabled={saving}
              placeholder="e.g. BSc Computer Science"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-bio">Bio</Label>
            <Textarea
              id="edit-bio"
              rows={3}
              value={form.bio}
              onChange={(e) => set("bio", e.target.value)}
              disabled={saving}
              placeholder="Tell the chapter about yourself..."
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              <X className="h-4 w-4 mr-1.5" />
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              {saving ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
