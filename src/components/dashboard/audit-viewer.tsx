"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Search,
  ShieldCheck,
  Eye,
  History,
} from "lucide-react";

export interface AuditEntry {
  id: string;
  actorId: string | null;
  action: string;
  target: string | null;
  context: string | null;
  ip: string | null;
  createdAt: string;
  actor: {
    id: string;
    email: string;
    name: string;
  } | null;
}

interface AuditResponse {
  items: AuditEntry[];
  page: number;
  pageSize: number;
  total: number;
  pages: number;
}

interface Props {
  initialItems: AuditEntry[];
  initialPage: number;
  initialPages: number;
  initialTotal: number;
}

// Action category classification → badge styling.
// emerald = create / publish (positive mutations)
// amber/gold = update (caution)
// red/rust = delete / reject / archive / suspend (destructive)
// stone = view / status / login (passive)
function classifyAction(action: string): {
  label: string;
  className: string;
} {
  const a = action.toLowerCase();
  const base = "text-[10px] font-medium border";
  if (a.includes("create") || a.includes("publish") || a.includes("approve") || a.includes("register")) {
    return {
      label: action,
      className: `${base} bg-primary/10 text-primary border-primary/30 dark:bg-primary/20 dark:text-primary dark:border-primary/40`,
    };
  }
  if (a.includes("delete") || a.includes("reject") || a.includes("archive") || a.includes("suspend") || a.includes("cancel")) {
    return {
      label: action,
      className: `${base} bg-red-50 text-red-700 border-red-300 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800`,
    };
  }
  if (a.includes("update") || a.includes("edit") || a.includes("patch") || a.includes("assign")) {
    return {
      label: action,
      className: `${base} bg-accent/20 text-accent-foreground border-accent/30 dark:bg-accent/20 dark:text-accent-foreground dark:border-accent/40`,
    };
  }
  return {
    label: action,
    className: `${base} bg-muted text-muted-foreground border-border dark:bg-muted/30 dark:text-muted-foreground dark:border-border`,
  };
}

// Common action buckets shown in the filter dropdown.
const ACTION_FILTERS = [
  { value: "all", label: "All actions" },
  { value: "user.create", label: "user.create" },
  { value: "user.update", label: "user.update" },
  { value: "user.approve", label: "user.approve" },
  { value: "user.reject", label: "user.reject" },
  { value: "user.suspend", label: "user.suspend" },
  { value: "role.assign", label: "role.assign" },
  { value: "program.create", label: "program.create" },
  { value: "program.update", label: "program.update" },
  { value: "program.publish", label: "program.publish" },
  { value: "program.archive", label: "program.archive" },
  { value: "event.create", label: "event.create" },
  { value: "event.register", label: "event.register" },
  { value: "news.create", label: "news.create" },
  { value: "news.publish", label: "news.publish" },
  { value: "announcement.create", label: "announcement.create" },
  { value: "announcement.publish", label: "announcement.publish" },
  { value: "finance.create", label: "finance.create" },
  { value: "finance.update", label: "finance.update" },
  { value: "finance.delete", label: "finance.delete" },
];

function prettyJson(raw: string | null): string {
  if (!raw) return "";
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
}

function previewContext(raw: string | null, n = 80): string {
  if (!raw) return "";
  const s = raw.replace(/\s+/g, " ").trim();
  return s.length > n ? `${s.slice(0, n)}…` : s;
}

export function AuditViewer({
  initialItems,
  initialPage,
  initialPages,
  initialTotal,
}: Props) {
  const [action, setAction] = React.useState("all");
  const [search, setSearch] = React.useState("");
  const [page, setPage] = React.useState(initialPage);
  const [pageSize] = React.useState(20);
  const [selected, setSelected] = React.useState<AuditEntry | null>(null);

  // Debounce search to avoid hammering the API on every keystroke.
  const [debouncedSearch, setDebouncedSearch] = React.useState(search);
  React.useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading, isFetching, refetch } = useQuery<AuditResponse>({
    queryKey: ["audit", action, debouncedSearch, page, pageSize],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (action !== "all") params.set("action", action);
      if (debouncedSearch) params.set("search", debouncedSearch);
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));
      const res = await fetch(`/api/audit?${params.toString()}`);
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error ?? "Failed to load audit logs");
      }
      return res.json();
    },
    initialData:
      page === initialPage && action === "all" && !debouncedSearch
        ? {
            items: initialItems,
            page: initialPage,
            pageSize,
            total: initialTotal,
            pages: initialPages,
          }
        : undefined,
  });

  const items = data?.items ?? [];
  const total = data?.total ?? initialTotal;
  const pages = data?.pages ?? initialPages;
  const currentPage = data?.page ?? page;

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-end gap-3">
            <div className="space-y-1.5 flex-1">
              <Label htmlFor="audit-action" className="text-xs text-muted-foreground">
                Action
              </Label>
              <Select value={action} onValueChange={(v) => { setAction(v); setPage(1); }}>
                <SelectTrigger id="audit-action" className="sm:w-64">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-80">
                  {ACTION_FILTERS.map((f) => (
                    <SelectItem key={f.value} value={f.value}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 flex-1">
              <Label htmlFor="audit-search" className="text-xs text-muted-foreground">
                Actor (name or email)
              </Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="audit-search"
                  placeholder="e.g. Brian or president.elc"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 sm:w-72"
                />
              </div>
            </div>
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
        </CardContent>
      </Card>

      <p className="text-sm text-muted-foreground">
        {isLoading
          ? "Loading…"
          : `${total.toLocaleString()} entr${total === 1 ? "y" : "ies"} · page ${currentPage} of ${pages}`}
      </p>

      {isLoading ? (
        <Card>
          <CardContent className="p-0">
            <div className="p-4 space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center">
            <History className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <h3 className="font-medium">No audit entries</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Try clearing filters or selecting a different action.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[140px]">Timestamp</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead className="w-[180px]">Action</TableHead>
                  <TableHead className="w-[180px]">Target</TableHead>
                  <TableHead>Context</TableHead>
                  <TableHead className="w-[80px] text-right">View</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((a) => {
                  const cls = classifyAction(a.action);
                  return (
                    <TableRow key={a.id}>
                      <TableCell className="text-xs text-muted-foreground align-top">
                        {format(new Date(a.createdAt), "d MMM yyyy HH:mm")}
                      </TableCell>
                      <TableCell className="align-top">
                        <div className="flex flex-col">
                          <span className="font-medium text-sm">
                            {a.actor?.name ?? "System"}
                          </span>
                          {a.actor?.email && (
                            <span className="text-xs text-muted-foreground">
                              {a.actor.email}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="align-top">
                        <Badge variant="outline" className={cls.className}>
                          {cls.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="align-top">
                        <code className="text-xs font-mono text-muted-foreground break-all">
                          {a.target ?? "—"}
                        </code>
                      </TableCell>
                      <TableCell className="align-top max-w-[320px]">
                        {a.context ? (
                          <span className="text-xs text-muted-foreground font-mono break-all">
                            {previewContext(a.context)}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right align-top">
                        {a.context ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="View context"
                            onClick={() => setSelected(a)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground">
            Page {currentPage} of {pages}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1 || isFetching}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= pages || isFetching}
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Context viewer dialog */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Audit context
            </DialogTitle>
            <DialogDescription>
              {selected && (
                <span>
                  <span className="font-mono">{selected.action}</span>
                  {selected.target ? ` · ${selected.target}` : ""}
                  {` · ${format(new Date(selected.createdAt), "d MMM yyyy HH:mm:ss")}`}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="space-y-0.5">
                  <div className="text-muted-foreground">Actor</div>
                  <div className="font-medium truncate">
                    {selected.actor?.name ?? "System"}
                  </div>
                </div>
                <div className="space-y-0.5">
                  <div className="text-muted-foreground">Email</div>
                  <div className="font-medium truncate">
                    {selected.actor?.email ?? "—"}
                  </div>
                </div>
                <div className="space-y-0.5">
                  <div className="text-muted-foreground">IP</div>
                  <div className="font-medium truncate font-mono">
                    {selected.ip ?? "—"}
                  </div>
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="text-xs text-muted-foreground">Context payload</div>
                <pre className="text-xs font-mono bg-muted/60 rounded-md p-3 overflow-x-auto scrollbar-thin max-h-[50vh]">
                  {prettyJson(selected.context)}
                </pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
