"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { ROLE_LABELS } from "@/components/dashboard/nav-config";
import { format } from "date-fns";
import {
  CheckCircle2,
  X,
  Loader2,
  Users,
  Clock,
  ShieldCheck,
  UserCog,
  AlertCircle,
  KeyRound,
  Plus,
  Trash2,
  Crown,
} from "lucide-react";

interface PendingUser {
  id: string;
  email: string;
  status: string;
  fullName: string;
  gender: string | null;
  yearOfStudy: number | null;
  school: string | null;
  program: string | null;
  phone: string | null;
  createdAt: string;
  roleKeys: string[];
}

interface UserRow {
  id: string;
  email: string;
  status: string;
  fullName: string;
  avatarUrl: string | null;
  primaryRole: string;
  primaryRoleName: string;
  roleKeys: string[];
  createdAt: string;
}

// Roles that can be selected for assignment via the UI.
// LEADER is the automatic base role; SUPER_ADMIN is seeded-only.
const ASSIGNABLE_ROLE_KEYS = new Set<string>([
  "PRESIDENT",
  "VICE_PRESIDENT",
  "SECRETARY_GENERAL",
  "ORGANIZING_SECRETARY",
  "TREASURER",
  "COMMUNICATIONS_DIRECTOR",
  "MENTORSHIP_COORDINATOR",
  "ALUMNI_MANAGER",
  "MALE_Y1_REPRESENTATIVE",
  "FEMALE_Y1_REPRESENTATIVE",
  "ASSISTANT_FEMALE_Y1_REPRESENTATIVE",
]);

interface RoleRow {
  id: string;
  key: string;
  name: string;
  description: string | null;
  category: string;
  isExecutive: boolean;
  isSystem: boolean;
  permissionsCount: number;
}

function isAssignableRole(r: RoleRow): boolean {
  return ASSIGNABLE_ROLE_KEYS.has(r.key);
}

interface Props {
  pendingUsers: PendingUser[];
  recentUsers: UserRow[];
  roles: RoleRow[];
}

export function AdminPanel({ pendingUsers, recentUsers, roles }: Props) {
  const [tab, setTab] = React.useState("pending");

  return (
    <Tabs value={tab} onValueChange={setTab}>
      <TabsList>
        <TabsTrigger value="pending" className="gap-1.5">
          <Clock className="h-3.5 w-3.5" />
          Pending ({pendingUsers.length})
        </TabsTrigger>
        <TabsTrigger value="users" className="gap-1.5">
          <Users className="h-3.5 w-3.5" />
          Users
        </TabsTrigger>
        <TabsTrigger value="roles" className="gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5" />
          Roles
        </TabsTrigger>
      </TabsList>

      <TabsContent value="pending" className="mt-4">
        <PendingUsersPanel initialPending={pendingUsers} />
      </TabsContent>

      <TabsContent value="users" className="mt-4">
        <UsersPanel initialUsers={recentUsers} roles={roles} />
      </TabsContent>

      <TabsContent value="roles" className="mt-4">
        <RolesPanel roles={roles} />
      </TabsContent>
    </Tabs>
  );
}

function PendingUsersPanel({ initialPending }: { initialPending: PendingUser[] }) {
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data } = useQuery({
    queryKey: ["admin", "pending"],
    queryFn: async () => {
      const res = await fetch("/api/admin/users?status=pending");
      if (!res.ok) throw new Error("Failed");
      return (await res.json()) as { items: PendingUser[] };
    },
    initialData: { items: initialPending },
  });

  const actionMutation = useMutation({
    mutationFn: async ({ userId, action }: { userId: string; action: "approve" | "reject" }) => {
      const res = await fetch(`/api/admin/users/${userId}/${action}`, {
        method: "POST",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed");
      }
      return res.json();
    },
    onSuccess: (_data, vars) => {
      toast({
        title: vars.action === "approve" ? "Account approved" : "Registration rejected",
        description:
          vars.action === "approve"
            ? "The user can now sign in."
            : "The pending account has been rejected.",
      });
      qc.invalidateQueries({ queryKey: ["admin", "pending"] });
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
    },
    onError: (err: Error) => {
      toast({
        title: "Action failed",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const items = data?.items ?? [];

  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="p-10 text-center">
          <CheckCircle2 className="h-10 w-10 mx-auto text-primary mb-3" />
          <h3 className="font-medium">No pending registrations</h3>
          <p className="text-sm text-muted-foreground mt-1">
            All incoming registrations have been reviewed.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((u) => {
        const initials = u.fullName.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();
        return (
          <Card key={u.id}>
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row md:items-center gap-4 md:justify-between">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <Avatar className="h-11 w-11 border border-border shrink-0">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{u.fullName}</span>
                      <Badge variant="outline" className="text-[10px] uppercase">Pending</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground truncate">{u.email}</div>
                    <div className="mt-1.5 flex flex-wrap gap-2 text-xs text-muted-foreground">
                      {u.gender && <span className="capitalize">{u.gender}</span>}
                      {u.yearOfStudy && <span>• Year {u.yearOfStudy}</span>}
                      {u.school && <span>• {u.school}</span>}
                      {u.program && <span>• {u.program}</span>}
                    </div>
                    {u.phone && (
                      <div className="text-xs text-muted-foreground mt-1">Phone: {u.phone}</div>
                    )}
                    <div className="text-[11px] text-muted-foreground mt-1">
                      Submitted {format(new Date(u.createdAt), "d MMM yyyy, h:mm a")}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button
                    size="sm"
                    onClick={() => actionMutation.mutate({ userId: u.id, action: "approve" })}
                    disabled={actionMutation.isPending}
                  >
                    {actionMutation.isPending && actionMutation.variables?.userId === u.id ? (
                      <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 mr-1.5" />
                    )}
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => actionMutation.mutate({ userId: u.id, action: "reject" })}
                    disabled={actionMutation.isPending}
                  >
                    <X className="h-4 w-4 mr-1.5" />
                    Reject
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function UsersPanel({ initialUsers, roles }: { initialUsers: UserRow[]; roles: RoleRow[] }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [rolesTarget, setRolesTarget] = React.useState<UserRow | null>(null);

  const { data } = useQuery({
    queryKey: ["admin", "users"],
    queryFn: async () => {
      const res = await fetch("/api/admin/users");
      if (!res.ok) throw new Error("Failed");
      return (await res.json()) as { items: UserRow[] };
    },
    initialData: { items: initialUsers },
  });

  const statusMutation = useMutation({
    mutationFn: async ({ userId, status }: { userId: string; status: string }) => {
      const res = await fetch(`/api/admin/users/${userId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed");
      }
      return res.json();
    },
    onSuccess: (_d, vars) => {
      toast({
        title: "Status updated",
        description: `Account is now ${vars.status}.`,
      });
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
    },
    onError: (err: Error) => {
      toast({ title: "Update failed", description: err.message, variant: "destructive" });
    },
  });

  const items = data?.items ?? [];

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            All Users ({items.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {items.map((u) => {
              const initials = u.fullName.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();
              const extraRoles = (u.roleKeys ?? []).filter((k) => k !== "LEADER").length;
              return (
                <div key={u.id} className="flex items-center gap-3 p-3 hover:bg-secondary/40 transition-colors">
                  <Avatar className="h-9 w-9 border border-border shrink-0">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm truncate">{u.fullName}</span>
                      <Badge
                        variant={
                          u.status === "active" ? "default" :
                          u.status === "pending" ? "secondary" :
                          "outline"
                        }
                        className="text-[10px] uppercase"
                      >
                        {u.status}
                      </Badge>
                      {extraRoles > 0 && (
                        <Badge variant="secondary" className="text-[10px] gap-1">
                          <KeyRound className="h-3 w-3" />
                          {extraRoles} role{extraRoles > 1 ? "s" : ""}
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">{u.email}</div>
                  </div>
                  <div className="hidden md:block text-xs text-muted-foreground">
                    {ROLE_LABELS[u.primaryRole] ?? u.primaryRoleName}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 gap-1.5"
                    onClick={() => setRolesTarget(u)}
                  >
                    <KeyRound className="h-3.5 w-3.5" />
                    Manage roles
                  </Button>
                  <Select
                    value={u.status}
                    onValueChange={(v) => statusMutation.mutate({ userId: u.id, status: v })}
                    disabled={statusMutation.isPending}
                  >
                    <SelectTrigger className="h-8 w-28 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="suspended">Suspend</SelectItem>
                      <SelectItem value="deactivated">Deactivate</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <ManageRolesDialog
        user={rolesTarget}
        roles={roles}
        onClose={() => setRolesTarget(null)}
      />
    </>
  );
}

function RolesPanel({ roles }: { roles: RoleRow[] }) {
  return (
    <div className="space-y-3">
      <Card>
        <CardContent className="p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div className="text-sm space-y-1">
            <div className="font-medium">Role-permission matrix is fixed in code</div>
            <p className="text-muted-foreground">
              The role-to-permission assignments are defined in{" "}
              <code className="text-xs bg-secondary px-1 py-0.5 rounded">src/lib/rbac/roles.ts</code>.
              To add or remove a permission from a role, edit that file and re-run{" "}
              <code className="text-xs bg-secondary px-1 py-0.5 rounded">bun run db:seed</code>.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {roles.map((r) => (
          <Card key={r.id}>
            <CardContent className="p-4 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-sm">{r.name}</span>
                {r.isSystem && (
                  <Badge variant="outline" className="text-[10px] uppercase">System</Badge>
                )}
              </div>
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{r.category}</div>
              <p className="text-xs text-muted-foreground line-clamp-3">
                {r.description ?? "—"}
              </p>
              <div className="pt-1.5 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{r.permissionsCount} permissions</span>
                {r.isExecutive && (
                  <Badge variant="secondary" className="text-[10px] uppercase">Executive</Badge>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ManageRolesDialog — assign/remove executive roles for a single user.
// Fetches the user's current roles via GET /api/admin/users/:id/roles, and
// uses TanStack mutations for assign (POST) and remove (DELETE).
// ---------------------------------------------------------------------------
interface AssignedRole {
  id: string;
  key: string;
  name: string;
  description: string | null;
  category: string;
  isExecutive: boolean;
  isSystem: boolean;
  permissionsCount: number;
  assignedAt: string | null;
}

function ManageRolesDialog({
  user,
  roles,
  onClose,
}: {
  user: UserRow | null;
  roles: RoleRow[];
  onClose: () => void;
}) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [selectedRoleKey, setSelectedRoleKey] = React.useState<string>("");
  const [open, setOpen] = React.useState(false);

  // Open / close the dialog in sync with the `user` prop. When a user is set,
  // the dialog opens and the dropdown resets; when cleared, it closes.
  React.useEffect(() => {
    if (user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOpen(true);
      setSelectedRoleKey("");
    } else {
       
      setOpen(false);
    }
  }, [user]);

  // Fetch the user's current roles whenever the dialog target changes.
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin", "user-roles", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const res = await fetch(`/api/admin/users/${user.id}/roles`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed to load roles");
      }
      return (await res.json()) as { user: { id: string; email: string; fullName: string }; roles: AssignedRole[] };
    },
    enabled: !!user,
  });

  const assignedRoles = data?.roles ?? [];
  const assignedKeys = new Set(assignedRoles.map((r) => r.key));

  // Roles that can be added: assignable (excludes LEADER + SUPER_ADMIN) and
  // not already held by the user.
  const availableRoles = roles.filter(
    (r) => isAssignableRole(r) && !assignedKeys.has(r.key),
  );

  const assignMutation = useMutation({
    mutationFn: async (roleKey: string) => {
      const res = await fetch(`/api/admin/users/${user!.id}/roles`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roleKey }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed to assign role");
      }
      return res.json();
    },
    onSuccess: (_d, roleKey) => {
      const roleDef = roles.find((r) => r.key === roleKey);
      toast({
        title: "Role assigned",
        description: `${roleDef?.name ?? roleKey} has been added to ${user?.fullName ?? "the user"}.`,
      });
      setSelectedRoleKey("");
      qc.invalidateQueries({ queryKey: ["admin", "user-roles", user?.id] });
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
    },
    onError: (err: Error) => {
      toast({ title: "Assignment failed", description: err.message, variant: "destructive" });
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (roleKey: string) => {
      const res = await fetch(
        `/api/admin/users/${user!.id}/roles?roleKey=${encodeURIComponent(roleKey)}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed to remove role");
      }
      return res.json();
    },
    onSuccess: (data, roleKey) => {
      const roleDef = roles.find((r) => r.key === roleKey);
      toast({
        title: "Role removed",
        description: `${roleDef?.name ?? roleKey} has been removed from ${user?.fullName ?? "the user"}.`,
      });
      // Surface the soft warning returned by the API (last holder of exec role).
      if (data?.warning) {
        toast({
          title: "Heads up",
          description: data.warning,
          variant: "destructive",
        });
      }
      qc.invalidateQueries({ queryKey: ["admin", "user-roles", user?.id] });
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
    },
    onError: (err: Error) => {
      toast({ title: "Removal failed", description: err.message, variant: "destructive" });
    },
  });

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setOpen(false);
      // Defer close so the closing animation doesn't get cut.
      setTimeout(onClose, 0);
    } else {
      setOpen(true);
    }
  };

  const isBusy = assignMutation.isPending || removeMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-primary" />
            Manage roles
          </DialogTitle>
          <DialogDescription>
            Assign or remove executive roles for{" "}
            <span className="font-medium text-foreground">{user?.fullName}</span>
            {user ? <span className="block text-xs mt-0.5">{user.email}</span> : null}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current roles */}
          <div className="space-y-2">
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Current roles
            </div>
            {isLoading ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Loading…
              </div>
            ) : isError ? (
              <div className="text-xs text-destructive flex items-center gap-2">
                <AlertCircle className="h-3.5 w-3.5" />
                Failed to load.{" "}
                <button
                  className="underline underline-offset-2"
                  onClick={() => refetch()}
                >
                  Retry
                </button>
              </div>
            ) : assignedRoles.length === 0 ? (
              <div className="text-xs text-muted-foreground">No roles assigned.</div>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {assignedRoles.map((r) => {
                  const isLeader = r.key === "LEADER";
                  const isSuperAdmin = r.key === "SUPER_ADMIN";
                  const removable = !isLeader && !isSuperAdmin;
                  return (
                    <div
                      key={r.id}
                      className="inline-flex items-center gap-1 rounded-md border bg-secondary/60 px-2 py-1 text-xs"
                    >
                      {isSuperAdmin ? (
                        <Crown className="h-3 w-3 text-primary" />
                      ) : isLeader ? (
                        <Users className="h-3 w-3 text-muted-foreground" />
                      ) : r.isExecutive ? (
                        <ShieldCheck className="h-3 w-3 text-primary" />
                      ) : null}
                      <span className="font-medium">{r.name}</span>
                      {r.isExecutive && (
                        <span className="text-[9px] uppercase tracking-wide text-muted-foreground ml-0.5">
                          exec
                        </span>
                      )}
                      {removable ? (
                        <button
                          type="button"
                          aria-label={`Remove ${r.name}`}
                          className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          disabled={isBusy}
                          onClick={() => removeMutation.mutate(r.key)}
                        >
                          {removeMutation.isPending &&
                          removeMutation.variables === r.key ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Trash2 className="h-3 w-3" />
                          )}
                        </button>
                      ) : (
                        <span
                          className="ml-1 text-[9px] uppercase tracking-wide text-muted-foreground"
                          title={
                            isLeader
                              ? "Base role — automatic"
                              : "Restricted — seeded only"
                          }
                        >
                          locked
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Add role */}
          <div className="space-y-2">
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Add a role
            </div>
            {availableRoles.length === 0 ? (
              <div className="text-xs text-muted-foreground rounded-md border border-dashed p-3">
                No additional roles available to assign.
              </div>
            ) : (
              <div className="flex gap-2">
                <Select
                  value={selectedRoleKey}
                  onValueChange={setSelectedRoleKey}
                  disabled={isBusy}
                >
                  <SelectTrigger className="h-9 flex-1 text-sm">
                    <SelectValue placeholder="Select a role…" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableRoles.map((r) => (
                      <SelectItem key={r.key} value={r.key} className="text-sm">
                        <span className="flex items-center gap-2">
                          {r.isExecutive ? (
                            <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                          ) : null}
                          <span>{r.name}</span>
                          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                            {r.category}
                          </span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  className="h-9 shrink-0"
                  disabled={!selectedRoleKey || isBusy}
                  onClick={() => selectedRoleKey && assignMutation.mutate(selectedRoleKey)}
                >
                  {assignMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4 mr-1.5" />
                  )}
                  Add
                </Button>
              </div>
            )}
          </div>

          <div className="rounded-md border border-primary/20 bg-primary/5 p-3 text-xs flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p>
                Executive roles can only be assigned by the Technical
                Administrator.
              </p>
              <p className="text-muted-foreground">
                <strong className="text-foreground">Leader</strong> is the base role
                automatically held by every member and cannot be removed.{" "}
                <strong className="text-foreground">Technical Administrator</strong>{" "}
                accounts are seeded and cannot be assigned here.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isBusy}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
