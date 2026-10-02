"use client";

// Attendance recording client component.
// Server passes the list of events (published + completed) and the user's
// leader-scope info. The component:
//   1) Lets the user pick an event.
//   2) Fetches /api/events/:id/attendance to get (eligibleLeaders, attendance).
//   3) Renders a per-leader table with a status dropdown + note input.
//   4) Tracks only the rows the user has edited (drafts) — the "Save" button
//      POSTs those rows to /api/attendance/bulk.
//   5) Shows live summary counts (present/absent/late/excused/not marked).

import * as React from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  CalendarCheck,
  ArrowLeft,
  Save,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  StickyNote,
  Users,
  Search,
  ShieldAlert,
} from "lucide-react";

// ---- Types ----

export interface AttendanceEventItem {
  id: string;
  title: string;
  startAt: string;
  venue: string | null;
  status: string;
  attendanceCount: number;
  registrationCount: number;
}

export interface AttendanceScope {
  restrictToCohort: boolean;
  readOnly: boolean;
  gender: string | null;
  yearOfStudy: number | null;
}

interface Props {
  events: AttendanceEventItem[];
  scope: AttendanceScope;
}

type Status = "present" | "absent" | "late" | "excused" | "not_marked";

interface EligibleLeader {
  id: string;
  email: string;
  fullName: string;
  preferredName: string | null;
  gender: string | null;
  yearOfStudy: number | null;
  avatarUrl: string | null;
  school: string | null;
  program: string | null;
  isRegistered: boolean;
  executiveRole: { key: string; name: string } | null;
}

interface ExistingAttendance {
  id: string;
  userId: string;
  status: string;
  note: string | null;
  recordedAt: string;
}

interface EventAttendanceResponse {
  event: {
    id: string;
    title: string;
    slug: string;
    startAt: string;
    venue: string | null;
    status: string;
    program: { id: string; title: string; slug: string } | null;
  };
  attendance: ExistingAttendance[];
  eligibleLeaders: EligibleLeader[];
  registeredCount: number;
  scope: AttendanceScope;
  canManage: boolean;
  canDelete: boolean;
  currentUserId: string;
}

// ---- Constants ----

const STATUS_LABELS: Record<Status, string> = {
  present: "Present",
  absent: "Absent",
  late: "Late",
  excused: "Excused",
  not_marked: "Not marked",
};

const STATUS_COLORS: Record<Status, string> = {
  present: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300",
  absent: "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300",
  late: "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300",
  excused: "bg-violet-100 text-violet-800 dark:bg-violet-950/60 dark:text-violet-300",
  not_marked: "bg-muted text-muted-foreground",
};

// ---- Component ----

export function AttendanceManager({ events, scope: passedScope }: Props) {
  const [selectedEventId, setSelectedEventId] = React.useState<string>(
    events[0]?.id ?? "",
  );
  const [search, setSearch] = React.useState("");
  const [filter, setFilter] = React.useState<"all" | Status>("all");

  // The bulk "drafts" the user has staged. Keyed by userId. Each entry is the
  // (status, note) the user wants to write. Empty initial draft = no changes.
  const [drafts, setDrafts] = React.useState<
    Map<string, { status: Status; note: string }>
  >(new Map());

  const qc = useQueryClient();
  const { toast } = useToast();

  const {
    data,
    isLoading,
    isFetching,
    refetch,
  } = useQuery<EventAttendanceResponse>({
    queryKey: ["event-attendance", selectedEventId],
    queryFn: async () => {
      const res = await fetch(`/api/events/${selectedEventId}/attendance`);
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error ?? "Failed to load attendance");
      }
      return (await res.json()) as EventAttendanceResponse;
    },
    enabled: !!selectedEventId,
  });

  // Reset drafts whenever the event changes.
  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDrafts(new Map());
  }, [selectedEventId]);

  // Use the scope returned from the API (it may be stricter than the page-passed scope,
  // e.g. if a user has multiple roles). Fall back to the passed scope.
  const effectiveScope: AttendanceScope = data?.scope ?? passedScope;
  const readOnly = effectiveScope.readOnly || !data?.canManage;

  // Build the merged row list: each eligible leader + their existing attendance (if any)
  // + their draft (if any).
  const rows = React.useMemo(() => {
    if (!data) return [];
    const attendanceByUserId = new Map(
      data.attendance.map((a) => [a.userId, a]),
    );
    return data.eligibleLeaders.map((leader) => {
      const existing = attendanceByUserId.get(leader.id);
      const draft = drafts.get(leader.id);
      const status: Status = draft
        ? draft.status
        : existing
          ? (existing.status as Status)
          : "not_marked";
      const note = draft?.note ?? existing?.note ?? "";
      const isTouched = !!draft;
      return {
        leader,
        existing,
        status,
        note,
        isTouched,
      };
    });
  }, [data, drafts]);

  // Filtered view (search + status filter).
  const filteredRows = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (filter !== "all" && r.status !== filter) return false;
      if (!q) return true;
      return (
        r.leader.fullName.toLowerCase().includes(q) ||
        r.leader.email.toLowerCase().includes(q) ||
        (r.leader.school ?? "").toLowerCase().includes(q) ||
        (r.leader.program ?? "").toLowerCase().includes(q)
      );
    });
  }, [rows, search, filter]);

  // Summary counts across ALL rows (not filtered).
  const summary = React.useMemo(() => {
    const init: Record<Status, number> = {
      present: 0,
      absent: 0,
      late: 0,
      excused: 0,
      not_marked: 0,
    };
    for (const r of rows) init[r.status]++;
    return init;
  }, [rows]);

  const touchedCount = drafts.size;

  function setStatus(userId: string, status: Status) {
    setDrafts((prev) => {
      const next = new Map(prev);
      const cur = next.get(userId) ?? { status: "not_marked", note: "" };
      next.set(userId, { ...cur, status });
      return next;
    });
  }

  function setNote(userId: string, note: string) {
    setDrafts((prev) => {
      const next = new Map(prev);
      const cur = next.get(userId) ?? { status: "not_marked", note: "" };
      next.set(userId, { ...cur, note });
      return next;
    });
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedEventId || drafts.size === 0) return;
      const records = Array.from(drafts.entries())
        .filter(([, d]) => d.status !== "not_marked")
        .map(([userId, d]) => ({
          userId,
          status: d.status,
          note: d.note.trim() || null,
        }));
      if (records.length === 0) {
        throw new Error(
          "All drafts are set to 'Not marked'. Choose a status (Present, Absent, Late, or Excused) for each leader you want to save.",
        );
      }
      const res = await fetch("/api/attendance/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId: selectedEventId, records }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error ?? "Failed to save attendance");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Attendance saved",
        description: `${touchedCount} record${touchedCount === 1 ? "" : "s"} updated.`,
      });
      setDrafts(new Map());
      qc.invalidateQueries({ queryKey: ["event-attendance", selectedEventId] });
      qc.invalidateQueries({ queryKey: ["attendance"] });
    },
    onError: (e: Error) =>
      toast({
        title: "Could not save attendance",
        description: e.message,
        variant: "destructive",
      }),
  });

  function handleSave() {
    saveMutation.mutate();
  }

  // Render ----

  return (
    <div className="space-y-6">
      {/* Top: event selector + scope warning + back link */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-xs">
          <Button asChild variant="ghost" size="sm" className="h-7 px-2 text-muted-foreground">
            <Link href="/dashboard">
              <ArrowLeft className="h-3.5 w-3.5 mr-1" />
              Back to dashboard
            </Link>
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div className="space-y-1.5 min-w-0 flex-1">
            <Label htmlFor="event" className="text-xs text-muted-foreground">
              Select event
            </Label>
            <Select value={selectedEventId} onValueChange={setSelectedEventId}>
              <SelectTrigger id="event" className="w-full sm:max-w-md">
                <SelectValue placeholder="Pick an event to record attendance" />
              </SelectTrigger>
              <SelectContent>
                {events.length === 0 ? (
                  <SelectItem value="none" disabled>
                    No events available
                  </SelectItem>
                ) : (
                  events.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      <span className="truncate">
                        {e.title} — {format(new Date(e.startAt), "d MMM yyyy")}
                      </span>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            {effectiveScope.restrictToCohort && (
              <Badge variant="secondary" className="text-xs">
                <ShieldAlert className="h-3 w-3 mr-1" />
                Scoped to {effectiveScope.gender === "male" ? "Male" : "Female"}
                {effectiveScope.yearOfStudy ? ` Year ${effectiveScope.yearOfStudy}` : ""}
              </Badge>
            )}
            {readOnly && (
              <Badge variant="outline" className="text-xs">Read-only</Badge>
            )}
          </div>
        </div>
      </div>

      {!selectedEventId ? (
        <EmptyState
          icon={<CalendarCheck className="h-10 w-10" />}
          title="No event selected"
          message="Pick an event above to start recording attendance."
        />
      ) : isLoading ? (
        <AttendanceSkeleton />
      ) : !data ? null : (
        <>
          {/* Summary cards */}
          <SummaryRow summary={summary} total={rows.length} registered={data.registeredCount} />

          {/* Search + filter + Save */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col lg:flex-row lg:items-center gap-3">
                <div className="relative flex-1 min-w-0">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, email, school..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-8"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All statuses</SelectItem>
                      <SelectItem value="present">Present</SelectItem>
                      <SelectItem value="absent">Absent</SelectItem>
                      <SelectItem value="late">Late</SelectItem>
                      <SelectItem value="excused">Excused</SelectItem>
                      <SelectItem value="not_marked">Not marked</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => refetch()}
                    disabled={isFetching}
                    aria-label="Refresh"
                  >
                    <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
                  </Button>
                </div>
              </div>

              {!readOnly && (
                <div className="mt-3 flex items-center justify-between gap-2 pt-3 border-t border-border">
                  <p className="text-xs text-muted-foreground">
                    {touchedCount > 0
                      ? `${touchedCount} change${touchedCount === 1 ? "" : "s"} staged`
                      : "Edit a row's status or note to stage a change."}
                  </p>
                  <Button
                    onClick={handleSave}
                    disabled={touchedCount === 0 || saveMutation.isPending}
                  >
                    <Save className="h-4 w-4 mr-1.5" />
                    {saveMutation.isPending
                      ? "Saving..."
                      : touchedCount > 0
                        ? `Save ${touchedCount} change${touchedCount === 1 ? "" : "s"}`
                        : "Save all"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Table */}
          {filteredRows.length === 0 ? (
            <EmptyState
              icon={<Users className="h-10 w-10" />}
              title={rows.length === 0 ? "No leaders in scope" : "No matches"}
              message={
                rows.length === 0
                  ? effectiveScope.restrictToCohort
                    ? "There are no leaders in your cohort for this event. If registrations exist, ask the Organizing Secretary to verify them."
                    : "There are no eligible leaders for this event yet."
                  : "Try adjusting your search or status filter."
              }
            />
          ) : (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <CalendarCheck className="h-4 w-4 text-primary" />
                  {data.event.title}
                </CardTitle>
                <CardDescription className="text-xs">
                  {format(new Date(data.event.startAt), "EEEE, d MMMM yyyy 'at' h:mm a")}
                  {data.event.venue ? ` • ${data.event.venue}` : ""}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="max-h-[60vh] overflow-y-auto scrollbar-thin">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="pl-4 sticky top-0 bg-card z-10">Leader</TableHead>
                        <TableHead className="hidden md:table-cell sticky top-0 bg-card z-10">Year</TableHead>
                        <TableHead className="sticky top-0 bg-card z-10 min-w-[140px]">Status</TableHead>
                        <TableHead className="min-w-[180px] pr-4 sticky top-0 bg-card z-10">Note</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRows.map(({ leader, status, note, isTouched }) => (
                        <TableRow key={leader.id} className={isTouched ? "bg-accent/30" : undefined}>
                          <TableCell className="pl-4">
                            <div className="flex items-center gap-3 min-w-0">
                              <Avatar className="h-9 w-9 border border-border shrink-0">
                                <AvatarImage src={leader.avatarUrl ?? undefined} alt={leader.fullName} />
                                <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                                  {getInitials(leader.fullName)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <div className="font-medium text-sm truncate flex items-center gap-1.5">
                                  {leader.fullName}
                                  {isTouched && (
                                    <span className="h-1.5 w-1.5 rounded-full bg-accent shrink-0" aria-label="Edited" />
                                  )}
                                </div>
                                <div className="text-xs text-muted-foreground truncate flex items-center gap-1.5">
                                  {leader.executiveRole && (
                                    <Badge variant="default" className="text-[9px] px-1 py-0 uppercase tracking-wide">
                                      {leader.executiveRole.name}
                                    </Badge>
                                  )}
                                  {leader.isRegistered && (
                                    <Badge variant="secondary" className="text-[9px] px-1 py-0">Registered</Badge>
                                  )}
                                  <span className="truncate">{leader.email}</span>
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                            {leader.yearOfStudy ? `Year ${leader.yearOfStudy}` : "—"}
                            {leader.gender ? ` • ${cap(leader.gender)}` : ""}
                          </TableCell>
                          <TableCell>
                            <StatusSelect
                              value={status}
                              disabled={readOnly}
                              onChange={(v) => setStatus(leader.id, v)}
                            />
                          </TableCell>
                          <TableCell className="pr-4">
                            <NoteInput
                              value={note}
                              disabled={readOnly}
                              onChange={(v) => setNote(leader.id, v)}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

// ---- Sub-components ----

function StatusSelect({
  value,
  disabled,
  onChange,
}: {
  value: Status;
  disabled?: boolean;
  onChange: (v: Status) => void;
}) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as Status)} disabled={disabled}>
      <SelectTrigger className="w-[140px] h-8 text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="not_marked">— Not marked —</SelectItem>
        <SelectItem value="present">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Present
          </span>
        </SelectItem>
        <SelectItem value="absent">
          <span className="flex items-center gap-1.5">
            <XCircle className="h-3 w-3 text-rose-600" /> Absent
          </span>
        </SelectItem>
        <SelectItem value="late">
          <span className="flex items-center gap-1.5">
            <Clock className="h-3 w-3 text-amber-600" /> Late
          </span>
        </SelectItem>
        <SelectItem value="excused">
          <span className="flex items-center gap-1.5">
            <StickyNote className="h-3 w-3 text-violet-600" /> Excused
          </span>
        </SelectItem>
      </SelectContent>
    </Select>
  );
}

function NoteInput({
  value,
  disabled,
  onChange,
}: {
  value: string;
  disabled?: boolean;
  onChange: (v: string) => void;
}) {
  return (
    <Input
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Optional note..."
      className="h-8 text-xs"
      maxLength={1000}
    />
  );
}

function SummaryRow({
  summary,
  total,
  registered,
}: {
  summary: Record<Status, number>;
  total: number;
  registered: number;
}) {
  const items: { key: Status; label: string; icon: React.ReactNode }[] = [
    { key: "present", label: "Present", icon: <CheckCircle2 className="h-4 w-4 text-emerald-600" /> },
    { key: "absent", label: "Absent", icon: <XCircle className="h-4 w-4 text-rose-600" /> },
    { key: "late", label: "Late", icon: <Clock className="h-4 w-4 text-amber-600" /> },
    { key: "excused", label: "Excused", icon: <StickyNote className="h-4 w-4 text-violet-600" /> },
    { key: "not_marked", label: "Not marked", icon: <Users className="h-4 w-4 text-muted-foreground" /> },
  ];
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      <Card className="border-border/60">
        <CardContent className="p-3">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">In scope</div>
          <div className="text-2xl font-bold leading-tight mt-1">{total}</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">
            {registered > 0 ? `${registered} registered` : "all leaders"}
          </div>
        </CardContent>
      </Card>
      {items.map((it) => (
        <Card key={it.key} className="border-border/60">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{it.label}</span>
              {it.icon}
            </div>
            <div className="text-2xl font-bold leading-tight mt-1">{summary[it.key] ?? 0}</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">
              {total > 0 ? `${Math.round(((summary[it.key] ?? 0) / total) * 100)}%` : "—"}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function AttendanceSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-3 space-y-2">
              <Skeleton className="h-2.5 w-16" />
              <Skeleton className="h-7 w-12" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardContent className="p-4">
          <Skeleton className="h-9 w-full" />
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-0">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 border-b border-border p-3">
              <Skeleton className="h-9 w-9 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3 w-40" />
                <Skeleton className="h-2.5 w-56" />
              </div>
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-8 w-40" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function EmptyState({
  icon,
  title,
  message,
}: {
  icon: React.ReactNode;
  title: string;
  message: string;
}) {
  return (
    <Card>
      <CardContent className="p-10 text-center">
        <div className="mx-auto mb-3 text-muted-foreground">{icon}</div>
        <h3 className="font-medium">{title}</h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">{message}</p>
      </CardContent>
    </Card>
  );
}

// ---- Utils ----

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
