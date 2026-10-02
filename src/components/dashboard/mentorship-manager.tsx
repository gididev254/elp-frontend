"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
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
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
  Users,
  UserCheck,
  CheckCircle2,
  CalendarDays,
  Eye,
  Ban,
  ArrowRight,
  MessageSquare,
} from "lucide-react";

// ---------- Types ----------
export interface UserBrief {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
}

export interface AssignmentItem {
  id: string;
  mentorId: string;
  menteeId: string;
  programId: string | null;
  status: "active" | "completed" | "paused" | "cancelled";
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  mentor: UserBrief;
  mentee: UserBrief;
  sessionCount: number;
}

export interface SessionItem {
  id: string;
  assignmentId: string | null;
  mentorId: string;
  menteeId: string | null;
  title: string;
  notes: string | null;
  heldAt: string;
  createdAt: string;
  updatedAt: string;
  mentor: { id: string; email: string; name: string; avatarUrl?: string | null };
  mentee: { id: string; email: string; name: string; avatarUrl?: string | null } | null;
  assignment?: { id: string; status: string } | null;
}

export interface LeaderOption {
  id: string;
  name: string;
  email: string;
}

interface Props {
  initialAssignments: AssignmentItem[];
  initialSessions: SessionItem[];
  leaders: LeaderOption[];
  canManage: boolean;
}

// ---------- Constants ----------
const STATUS_BADGE: Record<
  AssignmentItem["status"],
  { label: string; className: string }
> = {
  active: {
    label: "Active",
    className:
      "bg-primary/10 text-primary border-primary/30 dark:bg-primary/20 dark:text-primary dark:border-primary/40",
  },
  completed: {
    label: "Completed",
    className:
      "bg-accent/20 text-accent-foreground border-accent/30 dark:bg-accent/20 dark:text-accent-foreground dark:border-accent/40",
  },
  paused: {
    label: "Paused",
    className:
      "bg-muted text-muted-foreground border-border dark:bg-muted/30 dark:text-muted-foreground dark:border-border",
  },
  cancelled: {
    label: "Cancelled",
    className:
      "bg-muted text-muted-foreground border-border",
  },
};

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function toDatetimeLocalValue(iso: string): string {
  try {
    const d = new Date(iso);
    const off = d.getTimezoneOffset();
    const local = new Date(d.getTime() - off * 60_000);
    return local.toISOString().slice(0, 16);
  } catch {
    return "";
  }
}

// ---------- Main component ----------
export function MentorshipManager({
  initialAssignments,
  initialSessions,
  leaders,
  canManage,
}: Props) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [tab, setTab] = React.useState<"assignments" | "sessions">("assignments");

  // Assignment filters
  const [statusFilter, setStatusFilter] = React.useState<string>("all");

  // Dialog state
  const [creatingAssignment, setCreatingAssignment] = React.useState(false);
  const [editingAssignment, setEditingAssignment] = React.useState<AssignmentItem | null>(null);
  const [cancellingAssignment, setCancellingAssignment] = React.useState<AssignmentItem | null>(null);
  const [viewingAssignment, setViewingAssignment] = React.useState<AssignmentItem | null>(null);

  // Session dialog state
  const [creatingSession, setCreatingSession] = React.useState(false);
  const [editingSession, setEditingSession] = React.useState<SessionItem | null>(null);
  const [deletingSession, setDeletingSession] = React.useState<SessionItem | null>(null);

  // ---------- Assignments query ----------
  const assignmentsQuery = useQuery<{ items: AssignmentItem[]; canManage: boolean }>({
    queryKey: ["mentorship", "assignments", statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      const res = await fetch(`/api/mentorship?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load assignments");
      return res.json();
    },
    initialData: { items: initialAssignments, canManage },
  });

  // ---------- Sessions query (flat list across all assignments) ----------
  const sessionsQuery = useQuery<{ items: SessionItem[]; canManage: boolean }>({
    queryKey: ["mentorship", "sessions"],
    queryFn: async () => {
      const res = await fetch("/api/mentorship/sessions");
      if (!res.ok) throw new Error("Failed to load sessions");
      return res.json();
    },
    initialData: { items: initialSessions, canManage },
  });

  const assignments = assignmentsQuery.data?.items ?? [];
  const sessions = sessionsQuery.data?.items ?? [];

  const isRefreshing =
    assignmentsQuery.isFetching || sessionsQuery.isFetching;

  // ---------- Summary cards ----------
  const summary = React.useMemo(() => {
    const allAssignments = assignmentsQuery.data?.items ?? [];
    const totalAssignments = allAssignments.length;
    const active = allAssignments.filter((a) => a.status === "active").length;
    const completed = allAssignments.filter((a) => a.status === "completed").length;
    const totalSessions = sessions.length;
    return { totalAssignments, active, completed, totalSessions };
  }, [assignmentsQuery.data, sessions]);

  // ---------- Mutations ----------
  const cancelAssignmentMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/mentorship/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error ?? "Failed to cancel assignment");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Assignment cancelled",
        description: "The mentorship pairing has been marked as cancelled.",
      });
      qc.invalidateQueries({ queryKey: ["mentorship"] });
    },
    onError: (e: Error) =>
      toast({ title: "Could not cancel", description: e.message, variant: "destructive" }),
  });

  const deleteSessionMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/mentorship/sessions/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error ?? "Failed to delete session");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Session deleted",
        description: "The session has been permanently removed.",
      });
      qc.invalidateQueries({ queryKey: ["mentorship"] });
    },
    onError: (e: Error) =>
      toast({ title: "Could not delete", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-4">
      {/* ---------- Summary cards ---------- */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <SummaryCard
          icon={<Users className="h-4 w-4" />}
          label="Total Assignments"
          value={summary.totalAssignments}
          tone="default"
        />
        <SummaryCard
          icon={<UserCheck className="h-4 w-4" />}
          label="Active"
          value={summary.active}
          tone="emerald"
        />
        <SummaryCard
          icon={<CheckCircle2 className="h-4 w-4" />}
          label="Completed"
          value={summary.completed}
          tone="amber"
        />
        <SummaryCard
          icon={<CalendarDays className="h-4 w-4" />}
          label="Total Sessions"
          value={summary.totalSessions}
          tone="stone"
        />
      </div>

      {/* ---------- Tabs ---------- */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <TabsList>
            <TabsTrigger value="assignments">
              <Users className="h-3.5 w-3.5 mr-1.5" />
              Assignments
            </TabsTrigger>
            <TabsTrigger value="sessions">
              <CalendarDays className="h-3.5 w-3.5 mr-1.5" />
              Sessions
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                assignmentsQuery.refetch();
                sessionsQuery.refetch();
              }}
              disabled={isRefreshing}
              aria-label="Refresh"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            </Button>
            {canManage && tab === "assignments" && (
              <Button onClick={() => setCreatingAssignment(true)}>
                <Plus className="h-4 w-4 mr-1.5" />
                New assignment
              </Button>
            )}
            {canManage && tab === "sessions" && (
              <Button onClick={() => setCreatingSession(true)}>
                <Plus className="h-4 w-4 mr-1.5" />
                New session
              </Button>
            )}
          </div>
        </div>

        {/* ---------- Assignments tab ---------- */}
        <TabsContent value="assignments" className="mt-4 space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row sm:items-end gap-3">
                <div className="space-y-1.5 flex-1">
                  <Label htmlFor="status-filter" className="text-xs text-muted-foreground">
                    Status
                  </Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger id="status-filter" className="sm:w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All statuses</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="paused">Paused</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="text-sm text-muted-foreground sm:ml-auto sm:mb-1">
                  {assignmentsQuery.isLoading
                    ? "Loading…"
                    : `${assignments.length} assignment${assignments.length === 1 ? "" : "s"}`}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* List */}
          {assignmentsQuery.isLoading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-4 space-y-3">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                    <Skeleton className="h-3 w-2/3" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : assignments.length === 0 ? (
            <Card>
              <CardContent className="p-10 text-center">
                <Users className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <h3 className="font-medium">No mentorship assignments yet</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {canManage
                    ? "Create a mentor-mentee pairing to get started."
                    : "Check back later for mentorship pairings."}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {assignments.map((a) => (
                <AssignmentCard
                  key={a.id}
                  assignment={a}
                  canManage={canManage}
                  onView={() => setViewingAssignment(a)}
                  onEdit={() => setEditingAssignment(a)}
                  onCancel={() => setCancellingAssignment(a)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* ---------- Sessions tab ---------- */}
        <TabsContent value="sessions" className="mt-4 space-y-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">
                {sessionsQuery.isLoading
                  ? "Loading…"
                  : `${sessions.length} session${sessions.length === 1 ? "" : "s"} (most recent first)`}
              </div>
            </CardContent>
          </Card>

          {sessionsQuery.isLoading ? (
            <Card>
              <CardContent className="p-4 space-y-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </CardContent>
            </Card>
          ) : sessions.length === 0 ? (
            <Card>
              <CardContent className="p-10 text-center">
                <CalendarDays className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <h3 className="font-medium">No sessions recorded</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {canManage
                    ? "Log your first mentorship session by selecting an assignment."
                    : "Mentorship sessions will appear here once recorded."}
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[120px]">Date</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Mentor → Mentee</TableHead>
                      <TableHead className="w-[100px] text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sessions.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="align-top">
                          <div className="text-xs text-muted-foreground">
                            {format(parseISO(s.heldAt), "d MMM yyyy")}
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            {format(parseISO(s.heldAt), "HH:mm")}
                          </div>
                        </TableCell>
                        <TableCell className="align-top">
                          <div className="text-sm font-medium leading-tight">{s.title}</div>
                          {s.notes && (
                            <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {s.notes}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="align-top">
                          <div className="flex items-center gap-1.5 text-xs">
                            <span className="font-medium">{s.mentor.name}</span>
                            <ArrowRight className="h-3 w-3 text-muted-foreground" />
                            <span className="text-muted-foreground">
                              {s.mentee?.name ?? "—"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right align-top">
                          {canManage && (
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label="Edit session"
                                onClick={() => setEditingSession(s)}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label="Delete session"
                                onClick={() => setDeletingSession(s)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* ---------- Dialogs: assignments ---------- */}
      {creatingAssignment && (
        <AssignmentFormDialog
          open={creatingAssignment}
          onOpenChange={setCreatingAssignment}
          mode="create"
          leaders={leaders}
        />
      )}
      {editingAssignment && (
        <AssignmentFormDialog
          open={!!editingAssignment}
          onOpenChange={(o) => !o && setEditingAssignment(null)}
          mode="edit"
          leaders={leaders}
          initial={editingAssignment}
        />
      )}
      {viewingAssignment && (
        <AssignmentDetailDialog
          assignment={viewingAssignment}
          open={!!viewingAssignment}
          onOpenChange={(o) => !o && setViewingAssignment(null)}
          canManage={canManage}
          onEditSession={(s) => setEditingSession(s)}
          onDeleteSession={(s) => setDeletingSession(s)}
        />
      )}

      <AlertDialog open={!!cancellingAssignment} onOpenChange={(o) => !o && setCancellingAssignment(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this assignment?</AlertDialogTitle>
            <AlertDialogDescription>
              {cancellingAssignment?.mentor.name} → {cancellingAssignment?.mentee.name} will be
              marked as cancelled. The pairing history and any recorded sessions are retained.
              This action can be reversed by editing the assignment status.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                cancellingAssignment && cancelAssignmentMutation.mutate(cancellingAssignment.id)
              }
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Cancel assignment
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ---------- Dialogs: sessions ---------- */}
      {creatingSession && (
        <SessionFormDialog
          open={creatingSession}
          onOpenChange={setCreatingSession}
          mode="create"
          assignments={assignments}
        />
      )}
      {editingSession && (
        <SessionFormDialog
          open={!!editingSession}
          onOpenChange={(o) => !o && setEditingSession(null)}
          mode="edit"
          assignments={assignments}
          initial={editingSession}
        />
      )}

      <AlertDialog open={!!deletingSession} onOpenChange={(o) => !o && setDeletingSession(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this session?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{deletingSession?.title}&rdquo; (held {deletingSession && format(parseISO(deletingSession.heldAt), "d MMM yyyy")})
              will be permanently removed. A copy is preserved in the audit log.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingSession && deleteSessionMutation.mutate(deletingSession.id)}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Delete permanently
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

function AssignmentCard({
  assignment,
  canManage,
  onView,
  onEdit,
  onCancel,
}: {
  assignment: AssignmentItem;
  canManage: boolean;
  onView: () => void;
  onEdit: () => void;
  onCancel: () => void;
}) {
  const status = STATUS_BADGE[assignment.status];
  return (
    <Card className="hover:border-primary/30 transition-colors flex flex-col">
      <CardContent className="p-4 space-y-3 flex-1 flex flex-col">
        {/* Mentor → Mentee */}
        <div className="flex items-center gap-2">
          <Avatar className="h-8 w-8">
            {assignment.mentor.avatarUrl && (
              <AvatarImage src={assignment.mentor.avatarUrl} alt={assignment.mentor.name} />
            )}
            <AvatarFallback className="text-[10px]">
              {initials(assignment.mentor.name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="text-xs text-muted-foreground">Mentor</div>
            <div className="text-sm font-medium leading-tight truncate">
              {assignment.mentor.name}
            </div>
          </div>
          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <Avatar className="h-8 w-8">
            {assignment.mentee.avatarUrl && (
              <AvatarImage src={assignment.mentee.avatarUrl} alt={assignment.mentee.name} />
            )}
            <AvatarFallback className="text-[10px]">
              {initials(assignment.mentee.name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="text-xs text-muted-foreground">Mentee</div>
            <div className="text-sm font-medium leading-tight truncate">
              {assignment.mentee.name}
            </div>
          </div>
        </div>

        {/* Status + session count */}
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="outline" className={`text-[10px] ${status.className}`}>
            {status.label}
          </Badge>
          {assignment.sessionCount > 0 && (
            <Badge variant="secondary" className="text-[10px]">
              <MessageSquare className="h-2.5 w-2.5 mr-1" />
              {assignment.sessionCount} session{assignment.sessionCount === 1 ? "" : "s"}
            </Badge>
          )}
        </div>

        {/* Notes */}
        {assignment.notes && (
          <p className="text-xs text-muted-foreground line-clamp-3 flex-1">
            {assignment.notes}
          </p>
        )}

        {/* Actions */}
        <div className="flex items-center gap-1.5 pt-1 border-t border-border">
          <Button size="sm" variant="outline" className="flex-1" onClick={onView}>
            <Eye className="h-3.5 w-3.5 mr-1" />
            View
          </Button>
          {canManage && (
            <>
              <Button size="sm" variant="ghost" onClick={onEdit} aria-label="Edit assignment">
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              {assignment.status !== "cancelled" && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onCancel}
                  aria-label="Cancel assignment"
                >
                  <Ban className="h-3.5 w-3.5" />
                </Button>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ---------- Assignment form dialog ----------
function AssignmentFormDialog({
  open,
  onOpenChange,
  mode,
  leaders,
  initial,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  leaders: LeaderOption[];
  initial?: AssignmentItem;
}) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [mentorId, setMentorId] = React.useState(initial?.mentorId ?? "");
  const [menteeId, setMenteeId] = React.useState(initial?.menteeId ?? "");
  const [notes, setNotes] = React.useState(initial?.notes ?? "");
  const [status, setStatus] = React.useState<AssignmentItem["status"]>(
    initial?.status ?? "active",
  );

  const isEdit = mode === "edit";

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        mentorId: mentorId || undefined,
        menteeId: menteeId || undefined,
        notes: notes.trim() || null,
        status,
      };
      if (isEdit && initial) {
        const res = await fetch(`/api/mentorship/${initial.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => null);
          throw new Error(j?.error ?? "Failed to update assignment");
        }
        return res.json();
      } else {
        const res = await fetch("/api/mentorship", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => null);
          throw new Error(j?.error ?? "Failed to create assignment");
        }
        return res.json();
      }
    },
    onSuccess: () => {
      toast({
        title: isEdit ? "Assignment updated" : "Assignment created",
        description: isEdit
          ? "Your changes have been saved."
          : "The mentor-mentee pairing is now active.",
      });
      qc.invalidateQueries({ queryKey: ["mentorship"] });
      onOpenChange(false);
    },
    onError: (e: Error) =>
      toast({ title: "Save failed", description: e.message, variant: "destructive" }),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isEdit) {
      if (!mentorId || !menteeId) {
        toast({
          title: "Missing fields",
          description: "Please select both a mentor and a mentee.",
          variant: "destructive",
        });
        return;
      }
      if (mentorId === menteeId) {
        toast({
          title: "Invalid pairing",
          description: "Mentor and mentee cannot be the same person.",
          variant: "destructive",
        });
        return;
      }
    }
    mutation.mutate();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit assignment" : "New mentorship assignment"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the mentor-mentee pairing details."
              : "Pair a mentor with a mentee. Both must be active leaders."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="mentor">Mentor</Label>
            <Select
              value={mentorId}
              onValueChange={setMentorId}
              disabled={isEdit}
            >
              <SelectTrigger id="mentor">
                <SelectValue placeholder="Select mentor…" />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {leaders.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.name} — {l.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isEdit && (
              <p className="text-xs text-muted-foreground">
                Mentor cannot be changed after creation.
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="mentee">Mentee</Label>
            <Select
              value={menteeId}
              onValueChange={setMenteeId}
              disabled={isEdit}
            >
              <SelectTrigger id="mentee">
                <SelectValue placeholder="Select mentee…" />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {leaders.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.name} — {l.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="status">Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as AssignmentItem["status"])}>
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Goals, focus areas, agreed cadence…"
              rows={4}
              maxLength={2000}
            />
            <p className="text-xs text-muted-foreground">{notes.length}/2000</p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving…" : isEdit ? "Save changes" : "Create assignment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------- Assignment detail dialog (with sessions list + add session) ----------
function AssignmentDetailDialog({
  assignment,
  open,
  onOpenChange,
  canManage,
  onEditSession,
  onDeleteSession,
}: {
  assignment: AssignmentItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canManage: boolean;
  onEditSession: (s: SessionItem) => void;
  onDeleteSession: (s: SessionItem) => void;
}) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [newTitle, setNewTitle] = React.useState("");
  const [newNotes, setNewNotes] = React.useState("");
  const [newHeldAt, setNewHeldAt] = React.useState(
    toDatetimeLocalValue(new Date().toISOString()),
  );

  // Fetch sessions for this assignment.
  const sessionsQuery = useQuery<{ items: SessionItem[] }>({
    queryKey: ["mentorship", "assignment", assignment.id, "sessions"],
    queryFn: async () => {
      const res = await fetch(`/api/mentorship/${assignment.id}/sessions`);
      if (!res.ok) throw new Error("Failed to load sessions");
      return res.json();
    },
  });

  const sessions = sessionsQuery.data?.items ?? [];
  const status = STATUS_BADGE[assignment.status];

  const createSessionMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/mentorship/${assignment.id}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle.trim(),
          notes: newNotes.trim() || null,
          heldAt: new Date(newHeldAt).toISOString(),
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error ?? "Failed to add session");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Session added", description: "The mentoring session has been logged." });
      setNewTitle("");
      setNewNotes("");
      setNewHeldAt(toDatetimeLocalValue(new Date().toISOString()));
      qc.invalidateQueries({ queryKey: ["mentorship"] });
    },
    onError: (e: Error) =>
      toast({ title: "Could not add session", description: e.message, variant: "destructive" }),
  });

  function handleAddSession(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) {
      toast({
        title: "Missing title",
        description: "Please provide a title for the session.",
        variant: "destructive",
      });
      return;
    }
    if (!newHeldAt) {
      toast({
        title: "Missing date",
        description: "Please select when the session was held.",
        variant: "destructive",
      });
      return;
    }
    createSessionMutation.mutate();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Assignment detail</DialogTitle>
          <DialogDescription>
            Mentorship pairing history and logged sessions.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Mentor → Mentee */}
          <div className="flex items-center gap-3 p-3 rounded-md border border-border bg-secondary/20">
            <Avatar className="h-10 w-10">
              {assignment.mentor.avatarUrl && (
                 
                <img
                  src={assignment.mentor.avatarUrl}
                  alt={assignment.mentor.name}
                  loading="lazy"
                  className="aspect-square size-full rounded-full object-cover"
                />
              )}
              <AvatarFallback>{initials(assignment.mentor.name)}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="text-xs text-muted-foreground">Mentor</div>
              <div className="text-sm font-medium truncate">{assignment.mentor.name}</div>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <Avatar className="h-10 w-10">
              {assignment.mentee.avatarUrl && (
                 
                <img
                  src={assignment.mentee.avatarUrl}
                  alt={assignment.mentee.name}
                  loading="lazy"
                  className="aspect-square size-full rounded-full object-cover"
                />
              )}
              <AvatarFallback>{initials(assignment.mentee.name)}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="text-xs text-muted-foreground">Mentee</div>
              <div className="text-sm font-medium truncate">{assignment.mentee.name}</div>
            </div>
          </div>

          {/* Status + created */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Badge variant="outline" className={status.className}>
              {status.label}
            </Badge>
            <span className="text-muted-foreground">
              Created {format(parseISO(assignment.createdAt), "d MMM yyyy")}
            </span>
          </div>

          {/* Notes */}
          {assignment.notes && (
            <div className="rounded-md border border-border p-3 text-sm bg-background">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                Notes
              </div>
              <p className="whitespace-pre-line">{assignment.notes}</p>
            </div>
          )}

          {/* Sessions list */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold">
                Sessions ({sessions.length})
              </h4>
            </div>
            {sessionsQuery.isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : sessions.length === 0 ? (
              <div className="rounded-md border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
                No sessions logged yet.
              </div>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {sessions.map((s) => (
                  <div
                    key={s.id}
                    className="rounded-md border border-border p-3 bg-background hover:border-primary/30 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium leading-tight">{s.title}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {format(parseISO(s.heldAt), "d MMM yyyy, HH:mm")}
                        </div>
                        {s.notes && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-3 whitespace-pre-line">
                            {s.notes}
                          </p>
                        )}
                      </div>
                      {canManage && (
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Edit session"
                            onClick={() => onEditSession(s)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Delete session"
                            onClick={() => onDeleteSession(s)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add session form */}
          {canManage && (
            <form
              onSubmit={handleAddSession}
              className="rounded-md border border-primary/30 bg-primary/5 p-3 space-y-2"
            >
              <div className="text-xs font-medium text-primary">Log a new session</div>
              <Input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Session title (e.g. Goal-setting meeting)"
                maxLength={200}
              />
              <Textarea
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                placeholder="What was discussed, agreed actions, follow-ups…"
                rows={3}
                maxLength={5000}
              />
              <div className="flex flex-col sm:flex-row sm:items-end gap-2">
                <div className="flex-1 space-y-1.5">
                  <Label htmlFor="heldAt" className="text-xs text-muted-foreground">
                    Held at
                  </Label>
                  <Input
                    id="heldAt"
                    type="datetime-local"
                    value={newHeldAt}
                    onChange={(e) => setNewHeldAt(e.target.value)}
                  />
                </div>
                <Button type="submit" disabled={createSessionMutation.isPending}>
                  {createSessionMutation.isPending ? "Adding…" : "Add session"}
                </Button>
              </div>
            </form>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------- Session form dialog ----------
function SessionFormDialog({
  open,
  onOpenChange,
  mode,
  assignments,
  initial,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  assignments: AssignmentItem[];
  initial?: SessionItem;
}) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [assignmentId, setAssignmentId] = React.useState(initial?.assignmentId ?? "");
  const [title, setTitle] = React.useState(initial?.title ?? "");
  const [notes, setNotes] = React.useState(initial?.notes ?? "");
  const [heldAt, setHeldAt] = React.useState(
    initial ? toDatetimeLocalValue(initial.heldAt) : toDatetimeLocalValue(new Date().toISOString()),
  );

  const isEdit = mode === "edit";

  const mutation = useMutation({
    mutationFn: async () => {
      const body = {
        title: title.trim(),
        notes: notes.trim() || null,
        heldAt: new Date(heldAt).toISOString(),
      };
      if (isEdit && initial) {
        const res = await fetch(`/api/mentorship/sessions/${initial.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => null);
          throw new Error(j?.error ?? "Failed to update session");
        }
        return res.json();
      } else {
        if (!assignmentId) throw new Error("Please select an assignment first.");
        const res = await fetch(`/api/mentorship/${assignmentId}/sessions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => null);
          throw new Error(j?.error ?? "Failed to create session");
        }
        return res.json();
      }
    },
    onSuccess: () => {
      toast({
        title: isEdit ? "Session updated" : "Session added",
        description: isEdit
          ? "The session has been saved."
          : "The session has been logged against the assignment.",
      });
      qc.invalidateQueries({ queryKey: ["mentorship"] });
      onOpenChange(false);
    },
    onError: (e: Error) =>
      toast({ title: "Save failed", description: e.message, variant: "destructive" }),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      toast({ title: "Missing title", description: "Please provide a session title.", variant: "destructive" });
      return;
    }
    if (!heldAt) {
      toast({ title: "Missing date", description: "Please select when the session was held.", variant: "destructive" });
      return;
    }
    if (!isEdit && !assignmentId) {
      toast({ title: "Missing assignment", description: "Please select an assignment first.", variant: "destructive" });
      return;
    }
    mutation.mutate();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit session" : "New mentoring session"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the session details."
              : "Log a mentorship session. The mentor and mentee are auto-filled from the assignment."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isEdit && (
            <div className="space-y-1.5">
              <Label htmlFor="assignment">Assignment</Label>
              <Select value={assignmentId} onValueChange={setAssignmentId}>
                <SelectTrigger id="assignment">
                  <SelectValue placeholder="Select assignment…" />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {assignments.length === 0 ? (
                    <SelectItem value="_none" disabled>
                      No assignments available
                    </SelectItem>
                  ) : (
                    assignments
                      .filter((a) => a.status === "active" || a.status === "paused" || a.status === "completed")
                      .map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.mentor.name} → {a.mentee.name}
                        </SelectItem>
                      ))
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Goal-setting meeting"
              maxLength={200}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="heldAt">Held at</Label>
            <Input
              id="heldAt"
              type="datetime-local"
              value={heldAt}
              onChange={(e) => setHeldAt(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="session-notes">Notes</Label>
            <Textarea
              id="session-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Agenda, key discussions, agreed actions…"
              rows={4}
              maxLength={5000}
            />
            <p className="text-xs text-muted-foreground">{notes.length}/5000</p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving…" : isEdit ? "Save changes" : "Add session"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
