"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
  TrendingUp,
  TrendingDown,
  Wallet,
  FileBarChart,
  CalendarDays,
  Receipt,
  PieChart as PieIcon,
  Archive,
  CheckCircle2,
} from "lucide-react";

// ---------- Types ----------
export interface FinancialRecordItem {
  id: string;
  type: "income" | "expenditure";
  category: string | null;
  amount: number;
  currency: string;
  description: string;
  date: string;
  reference: string | null;
  recordedById: string | null;
  recordedBy?: { id: string; email: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface BudgetItem {
  id: string;
  title: string;
  fiscalYear: string;
  quarter: string | null;
  category: string | null;
  plannedIncome: number;
  plannedExpenditure: number;
  notes: string | null;
  status: "draft" | "approved" | "archived";
  createdAt: string;
  updatedAt: string;
}

interface SummaryResponse {
  totalIncome: number;
  totalExpenditure: number;
  netBalance: number;
  currency: string;
  byCategory: { category: string; income: number; expenditure: number }[];
  byMonth: { month: string; income: number; expenditure: number }[];
}

interface Props {
  initialRecords: FinancialRecordItem[];
  initialBudgets: BudgetItem[];
  initialSummary: SummaryResponse | null;
  canManage: boolean;
}

// ---------- Constants ----------
const CATEGORY_LABELS: Record<string, string> = {
  donations: "Donations",
  membership: "Membership",
  events: "Events",
  supplies: "Supplies",
  transport: "Transport",
  other: "Other",
};

const CATEGORY_KEYS = Object.keys(CATEGORY_LABELS);

// Recharts colors — direct oklch strings (matching globals.css --chart-1..5).
const CHART_INCOME = "oklch(0.45 0.11 152)"; // emerald
const CHART_EXPENDITURE = "oklch(0.65 0.18 25)"; // rust
const CATEGORY_COLORS: Record<string, string> = {
  donations: "oklch(0.45 0.11 152)", // emerald
  membership: "oklch(0.75 0.13 90)", // gold
  events: "oklch(0.55 0.10 60)", // amber
  supplies: "oklch(0.50 0.08 180)", // teal
  transport: "oklch(0.65 0.18 25)", // rust
  other: "oklch(0.50 0.015 150)", // stone
};

const KES = new Intl.NumberFormat("en-KE", {
  style: "currency",
  currency: "KES",
  maximumFractionDigits: 0,
});

function formatKES(amount: number): string {
  return KES.format(amount);
}

function toMonthLabel(yyyyMm: string): string {
  // yyyy-mm → "Jan"
  const [y, m] = yyyyMm.split("-").map(Number);
  if (!y || !m) return yyyyMm;
  return format(new Date(y, m - 1, 1), "MMM");
}

// ---------- Component ----------
export function FinanceManager({
  initialRecords,
  initialBudgets,
  initialSummary,
  canManage,
}: Props) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [tab, setTab] = React.useState<"transactions" | "budgets">("transactions");

  // Transactions filters
  const [typeFilter, setTypeFilter] = React.useState<"all" | "income" | "expenditure">("all");
  const [categoryFilter, setCategoryFilter] = React.useState<string>("all");

  // Dialogs
  const [editingTx, setEditingTx] = React.useState<FinancialRecordItem | null>(null);
  const [creatingTx, setCreatingTx] = React.useState(false);
  const [deletingTx, setDeletingTx] = React.useState<FinancialRecordItem | null>(null);

  const [editingBudget, setEditingBudget] = React.useState<BudgetItem | null>(null);
  const [creatingBudget, setCreatingBudget] = React.useState(false);
  const [deletingBudget, setDeletingBudget] = React.useState<BudgetItem | null>(null);

  // ---------- Transactions query ----------
  const txQuery = useQuery<{
    items: FinancialRecordItem[];
    canManage: boolean;
  }>({
    queryKey: ["finance", "transactions", typeFilter, categoryFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (typeFilter !== "all") params.set("type", typeFilter);
      if (categoryFilter !== "all") params.set("category", categoryFilter);
      const res = await fetch(`/api/finance?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load transactions");
      return res.json();
    },
    initialData: { items: initialRecords, canManage },
  });

  // ---------- Summary query ----------
  const summaryQuery = useQuery<SummaryResponse>({
    queryKey: ["finance", "summary"],
    queryFn: async () => {
      const res = await fetch("/api/finance/summary");
      if (!res.ok) throw new Error("Failed to load summary");
      return res.json();
    },
    initialData: initialSummary ?? undefined,
  });

  // ---------- Budgets query ----------
  const budgetsQuery = useQuery<{ items: BudgetItem[]; canManage: boolean }>({
    queryKey: ["finance", "budgets"],
    queryFn: async () => {
      const res = await fetch("/api/finance/budgets");
      if (!res.ok) throw new Error("Failed to load budgets");
      return res.json();
    },
    initialData: { items: initialBudgets, canManage },
  });

  // ---------- Mutations: Transactions ----------
  const saveTxMutation = useMutation({
    mutationFn: async (payload: {
      id?: string;
      type: "income" | "expenditure";
      category: string;
      amount: number;
      description: string;
      date: string;
      reference?: string;
    }) => {
      const body = {
        type: payload.type,
        category: payload.category === "none" ? undefined : payload.category,
        amount: payload.amount,
        description: payload.description,
        date: payload.date,
        reference: payload.reference || undefined,
      };
      if (payload.id) {
        const res = await fetch(`/api/finance/${payload.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => null);
          throw new Error(j?.error ?? "Failed to update record");
        }
        return res.json();
      }
      const res = await fetch("/api/finance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error ?? "Failed to create record");
      }
      return res.json();
    },
    onSuccess: (_data, vars) => {
      toast({
        title: vars.id ? "Record updated" : "Record added",
        description: vars.id
          ? "The transaction has been saved."
          : "The new transaction has been recorded.",
      });
      qc.invalidateQueries({ queryKey: ["finance"] });
    },
    onError: (e: Error) =>
      toast({ title: "Save failed", description: e.message, variant: "destructive" }),
  });

  const deleteTxMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/finance/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error ?? "Failed to delete record");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Record deleted", description: "The transaction has been removed." });
      qc.invalidateQueries({ queryKey: ["finance"] });
    },
    onError: (e: Error) =>
      toast({ title: "Delete failed", description: e.message, variant: "destructive" }),
  });

  // ---------- Mutations: Budgets ----------
  const saveBudgetMutation = useMutation({
    mutationFn: async (payload: {
      id?: string;
      title: string;
      fiscalYear: string;
      quarter: string;
      category: string;
      plannedIncome: number;
      plannedExpenditure: number;
      notes: string;
      status: "draft" | "approved" | "archived";
    }) => {
      const body = {
        title: payload.title,
        fiscalYear: payload.fiscalYear,
        quarter: payload.quarter === "none" ? undefined : payload.quarter,
        category: payload.category === "none" ? null : payload.category,
        plannedIncome: payload.plannedIncome,
        plannedExpenditure: payload.plannedExpenditure,
        notes: payload.notes || undefined,
        status: payload.status,
      };
      if (payload.id) {
        const res = await fetch(`/api/finance/budgets/${payload.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => null);
          throw new Error(j?.error ?? "Failed to update budget");
        }
        return res.json();
      }
      const res = await fetch("/api/finance/budgets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error ?? "Failed to create budget");
      }
      return res.json();
    },
    onSuccess: (_data, vars) => {
      toast({
        title: vars.id ? "Budget updated" : "Budget created",
        description: vars.id
          ? "Your changes have been saved."
          : "The budget has been added.",
      });
      qc.invalidateQueries({ queryKey: ["finance"] });
    },
    onError: (e: Error) =>
      toast({ title: "Save failed", description: e.message, variant: "destructive" }),
  });

  const deleteBudgetMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/finance/budgets/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error ?? "Failed to delete budget");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Budget deleted" });
      qc.invalidateQueries({ queryKey: ["finance"] });
    },
    onError: (e: Error) =>
      toast({ title: "Delete failed", description: e.message, variant: "destructive" }),
  });

  // ---------- Derived ----------
  const summary = summaryQuery.data;
  const txItems = txQuery.data?.items ?? [];
  const budgetItems = budgetsQuery.data?.items ?? [];

  const monthData = (summary?.byMonth ?? []).map((m) => ({
    month: toMonthLabel(m.month),
    income: m.income,
    expenditure: m.expenditure,
  }));

  const pieData = (summary?.byCategory ?? [])
    .filter((c) => c.expenditure > 0)
    .map((c) => ({
      name: CATEGORY_LABELS[c.category] ?? c.category,
      value: c.expenditure,
      key: c.category,
    }));

  const isRefreshing = summaryQuery.isFetching || txQuery.isFetching || budgetsQuery.isFetching;

  return (
    <div className="space-y-6">
      {/* ---------- Summary cards ---------- */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <SummaryCard
          label="Total Income"
          value={summary ? formatKES(summary.totalIncome) : "—"}
          icon={<TrendingUp className="h-4 w-4" />}
          accent="emerald"
          loading={summaryQuery.isLoading}
        />
        <SummaryCard
          label="Total Expenditure"
          value={summary ? formatKES(summary.totalExpenditure) : "—"}
          icon={<TrendingDown className="h-4 w-4" />}
          accent="rust"
          loading={summaryQuery.isLoading}
        />
        <SummaryCard
          label="Net Balance"
          value={summary ? formatKES(summary.netBalance) : "—"}
          icon={<Wallet className="h-4 w-4" />}
          accent={summary ? (summary.netBalance >= 0 ? "emerald" : "rust") : "gold"}
          loading={summaryQuery.isLoading}
        />
      </div>

      {/* ---------- Charts ---------- */}
      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileBarChart className="h-4 w-4 text-primary" />
              Income vs Expenditure
              <span className="text-xs font-normal text-muted-foreground">· last 6 months</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {summaryQuery.isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : monthData.length === 0 ? (
              <EmptyChart label="No data yet" />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={monthData} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.90 0.01 95)" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="oklch(0.50 0.015 150)" />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    stroke="oklch(0.50 0.015 150)"
                    tickFormatter={(v: number) => {
                      if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
                      if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
                      return String(v);
                    }}
                  />
                  <Tooltip
                    formatter={(value: number) => formatKES(value)}
                    contentStyle={{
                      borderRadius: 8,
                      border: "1px solid oklch(0.90 0.01 95)",
                      fontSize: 12,
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="income" name="Income" fill={CHART_INCOME} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expenditure" name="Expenditure" fill={CHART_EXPENDITURE} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <PieIcon className="h-4 w-4 text-primary" />
              Expenditure by Category
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {summaryQuery.isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : pieData.length === 0 ? (
              <EmptyChart label="No expenditure recorded" />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    innerRadius={45}
                    paddingAngle={2}
                  >
                    {pieData.map((entry) => (
                      <Cell
                        key={entry.key}
                        fill={CATEGORY_COLORS[entry.key] ?? "oklch(0.50 0.015 150)"}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => formatKES(value)}
                    contentStyle={{
                      borderRadius: 8,
                      border: "1px solid oklch(0.90 0.01 95)",
                      fontSize: 12,
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ---------- Tabs: Transactions + Budgets ---------- */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <TabsList>
            <TabsTrigger value="transactions">
              <Receipt className="h-3.5 w-3.5 mr-1.5" />
              Transactions
            </TabsTrigger>
            <TabsTrigger value="budgets">
              <Wallet className="h-3.5 w-3.5 mr-1.5" />
              Budgets
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                txQuery.refetch();
                budgetsQuery.refetch();
                summaryQuery.refetch();
              }}
              disabled={isRefreshing}
              aria-label="Refresh"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            </Button>
            {canManage && tab === "transactions" && (
              <Button onClick={() => setCreatingTx(true)}>
                <Plus className="h-4 w-4 mr-1.5" />
                New transaction
              </Button>
            )}
            {canManage && tab === "budgets" && (
              <Button onClick={() => setCreatingBudget(true)}>
                <Plus className="h-4 w-4 mr-1.5" />
                New budget
              </Button>
            )}
          </div>
        </div>

        {/* ---------- Transactions tab ---------- */}
        <TabsContent value="transactions" className="mt-4 space-y-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row sm:items-end gap-3">
                <div className="space-y-1.5 flex-1">
                  <Label htmlFor="tx-type" className="text-xs text-muted-foreground">
                    Type
                  </Label>
                  <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as typeof typeFilter)}>
                    <SelectTrigger id="tx-type" className="sm:w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="income">Income</SelectItem>
                      <SelectItem value="expenditure">Expenditure</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5 flex-1">
                  <Label htmlFor="tx-cat" className="text-xs text-muted-foreground">
                    Category
                  </Label>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger id="tx-cat" className="sm:w-44">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All categories</SelectItem>
                      {CATEGORY_KEYS.map((k) => (
                        <SelectItem key={k} value={k}>
                          {CATEGORY_LABELS[k]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="text-sm text-muted-foreground sm:ml-auto sm:mb-1">
                  {txQuery.isLoading ? "Loading…" : `${txItems.length} record${txItems.length === 1 ? "" : "s"}`}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              {txQuery.isLoading ? (
                <div className="p-4 space-y-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-8 w-full" />
                  ))}
                </div>
              ) : txItems.length === 0 ? (
                <div className="p-10 text-center">
                  <Receipt className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                  <h3 className="font-medium">No transactions</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {canManage
                      ? "Record your first income or expenditure to get started."
                      : "No transactions match the current filters."}
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[110px]">Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="w-[120px]">Category</TableHead>
                      <TableHead className="w-[100px]">Type</TableHead>
                      <TableHead className="w-[140px] text-right">Amount</TableHead>
                      <TableHead className="w-[120px]">Reference</TableHead>
                      <TableHead className="w-[100px] text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {txItems.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="text-xs text-muted-foreground align-top">
                          {format(parseISO(r.date), "d MMM yyyy")}
                        </TableCell>
                        <TableCell className="align-top">
                          <div className="text-sm font-medium leading-tight">
                            {r.description}
                          </div>
                          {r.recordedBy?.name && (
                            <div className="text-xs text-muted-foreground">
                              Recorded by {r.recordedBy.name}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="align-top">
                          {r.category ? (
                            <Badge variant="outline" className="text-[10px]">
                              {CATEGORY_LABELS[r.category] ?? r.category}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="align-top">
                          <Badge
                            variant="outline"
                            className={
                              r.type === "income"
                                ? "bg-primary/10 text-primary border-primary/30 dark:bg-primary/20 dark:text-primary dark:border-primary/40"
                                : "bg-red-50 text-red-700 border-red-300 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800"
                            }
                          >
                            {r.type === "income" ? "Income" : "Expense"}
                          </Badge>
                        </TableCell>
                        <TableCell className="align-top text-right font-mono text-sm">
                          <span className={r.type === "income" ? "text-primary dark:text-primary" : "text-red-700 dark:text-red-300"}>
                            {r.type === "income" ? "+" : "−"} {formatKES(r.amount)}
                          </span>
                        </TableCell>
                        <TableCell className="align-top">
                          {r.reference ? (
                            <code className="text-xs font-mono text-muted-foreground">
                              {r.reference}
                            </code>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right align-top">
                          {canManage && (
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label="Edit"
                                onClick={() => setEditingTx(r)}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label="Delete"
                                onClick={() => setDeletingTx(r)}
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
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---------- Budgets tab ---------- */}
        <TabsContent value="budgets" className="mt-4 space-y-4">
          {budgetsQuery.isLoading ? (
            <div className="grid sm:grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-40 w-full" />
              ))}
            </div>
          ) : budgetItems.length === 0 ? (
            <Card>
              <CardContent className="p-10 text-center">
                <Wallet className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <h3 className="font-medium">No budgets yet</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {canManage
                    ? "Plan your chapter's first budget for the fiscal year."
                    : "Check back later for chapter budgets."}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {budgetItems.map((b) => {
                const net = b.plannedIncome - b.plannedExpenditure;
                const status = BUDGET_STATUS[b.status] ?? BUDGET_STATUS.draft;
                return (
                  <Card key={b.id} className="hover:border-primary/30 transition-colors">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-0.5">
                          <h3 className="font-semibold leading-tight">{b.title}</h3>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <Badge variant="outline" className="text-[10px]">
                              <CalendarDays className="h-2.5 w-2.5 mr-1" />
                              FY {b.fiscalYear}
                              {b.quarter ? ` · ${b.quarter}` : ""}
                            </Badge>
                            {b.category && (
                              <Badge variant="outline" className="text-[10px]">
                                {CATEGORY_LABELS[b.category] ?? b.category}
                              </Badge>
                            )}
                            <Badge
                              variant="outline"
                              className={`text-[10px] ${status.className}`}
                            >
                              {status.label}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="space-y-0.5">
                          <div className="text-muted-foreground">Planned income</div>
                          <div className="font-mono text-primary dark:text-primary font-medium">
                            {formatKES(b.plannedIncome)}
                          </div>
                        </div>
                        <div className="space-y-0.5">
                          <div className="text-muted-foreground">Planned expense</div>
                          <div className="font-mono text-red-700 dark:text-red-300 font-medium">
                            {formatKES(b.plannedExpenditure)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Net planned</span>
                        <span
                          className={`font-mono font-medium ${net >= 0 ? "text-primary dark:text-primary" : "text-red-700 dark:text-red-300"}`}
                        >
                          {formatKES(net)}
                        </span>
                      </div>
                      {b.notes && (
                        <p className="text-xs text-muted-foreground italic border-t border-border pt-2">
                          {b.notes}
                        </p>
                      )}
                      {canManage && (
                        <div className="flex items-center gap-1.5 pt-1 border-t border-border">
                          <Button size="sm" variant="outline" className="flex-1" onClick={() => setEditingBudget(b)}>
                            <Pencil className="h-3.5 w-3.5 mr-1" />
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            aria-label="Delete"
                            onClick={() => setDeletingBudget(b)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ---------- Transaction dialogs ---------- */}
      {creatingTx && (
        <TransactionFormDialog
          open={creatingTx}
          onOpenChange={setCreatingTx}
          mode="create"
        />
      )}
      {editingTx && (
        <TransactionFormDialog
          open={!!editingTx}
          onOpenChange={(o) => !o && setEditingTx(null)}
          mode="edit"
          initial={editingTx}
        />
      )}
      <AlertDialog open={!!deletingTx} onOpenChange={(o) => !o && setDeletingTx(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this transaction?</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingTx?.description} ({formatKES(deletingTx?.amount ?? 0)}) will be permanently removed.
              This action is irreversible — a copy is kept in the audit log.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => deletingTx && deleteTxMutation.mutate(deletingTx.id)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ---------- Budget dialogs ---------- */}
      {creatingBudget && (
        <BudgetFormDialog
          open={creatingBudget}
          onOpenChange={setCreatingBudget}
          mode="create"
        />
      )}
      {editingBudget && (
        <BudgetFormDialog
          open={!!editingBudget}
          onOpenChange={(o) => !o && setEditingBudget(null)}
          mode="edit"
          initial={editingBudget}
        />
      )}
      <AlertDialog open={!!deletingBudget} onOpenChange={(o) => !o && setDeletingBudget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this budget?</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingBudget?.title} will be permanently removed.
              A copy is kept in the audit log for accountability.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => deletingBudget && deleteBudgetMutation.mutate(deletingBudget.id)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ---------- Subcomponents ----------

const BUDGET_STATUS: Record<
  string,
  { label: string; className: string }
> = {
  draft: {
    label: "Draft",
    className: "bg-muted text-muted-foreground border-border dark:bg-muted/30 dark:text-muted-foreground dark:border-border",
  },
  approved: {
    label: "Approved",
    className: "bg-primary/10 text-primary border-primary/30 dark:bg-primary/20 dark:text-primary dark:border-primary/40",
  },
  archived: {
    label: "Archived",
    className: "bg-accent/20 text-accent-foreground border-accent/30 dark:bg-accent/20 dark:text-accent-foreground dark:border-accent/40",
  },
};

function SummaryCard({
  label,
  value,
  icon,
  accent,
  loading,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  accent: "emerald" | "rust" | "gold";
  loading?: boolean;
}) {
  const accentMap = {
    emerald: {
      bg: "bg-primary/10 dark:bg-primary/20",
      border: "border-emerald-200 dark:border-emerald-900",
      fg: "text-primary dark:text-primary",
    },
    rust: {
      bg: "bg-red-50 dark:bg-red-950/30",
      border: "border-red-200 dark:border-red-900",
      fg: "text-red-700 dark:text-red-300",
    },
    gold: {
      bg: "bg-accent/20 dark:bg-accent/20",
      border: "border-amber-200 dark:border-amber-900",
      fg: "text-accent-foreground dark:text-accent-foreground",
    },
  };
  const a = accentMap[accent];
  return (
    <Card className={`border ${a.border}`}>
      <CardContent className="p-5 flex items-start gap-3">
        <div className={`h-9 w-9 rounded-md ${a.bg} ${a.fg} flex items-center justify-center shrink-0`}>
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">
            {label}
          </div>
          {loading ? (
            <Skeleton className="h-7 w-32 mt-1" />
          ) : (
            <div className={`text-xl md:text-2xl font-bold tabular-nums truncate ${a.fg}`}>
              {value}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">
      {label}
    </div>
  );
}

// ---------- Transaction form ----------
interface TxFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  initial?: FinancialRecordItem;
}

function TransactionFormDialog({ open, onOpenChange, mode, initial }: TxFormProps) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const isEdit = mode === "edit";

  const [type, setType] = React.useState<"income" | "expenditure">(initial?.type ?? "income");
  const [category, setCategory] = React.useState<string>(initial?.category ?? "none");
  const [amount, setAmount] = React.useState<string>(
    initial ? String(initial.amount) : "",
  );
  const [description, setDescription] = React.useState(initial?.description ?? "");
  const [date, setDate] = React.useState<string>(
    initial ? format(parseISO(initial.date), "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
  );
  const [reference, setReference] = React.useState(initial?.reference ?? "");

  const mutation = useMutation({
    mutationFn: async () => {
      const amt = parseFloat(amount);
      if (!Number.isFinite(amt) || amt <= 0) {
        throw new Error("Amount must be a positive number.");
      }
      const iso = new Date(date).toISOString();
      const payload = {
        id: isEdit ? initial?.id : undefined,
        type,
        category,
        amount: amt,
        description: description.trim(),
        date: iso,
        reference: reference.trim(),
      };
      if (isEdit && initial) {
        const res = await fetch(`/api/finance/${initial.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: payload.type,
            category: payload.category === "none" ? null : payload.category,
            amount: payload.amount,
            description: payload.description,
            date: payload.date,
            reference: payload.reference || null,
          }),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => null);
          throw new Error(j?.error ?? "Failed to update record");
        }
        return res.json();
      }
      const res = await fetch("/api/finance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: payload.type,
          category: payload.category === "none" ? undefined : payload.category,
          amount: payload.amount,
          description: payload.description,
          date: payload.date,
          reference: payload.reference || undefined,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error ?? "Failed to create record");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: isEdit ? "Record updated" : "Record added",
        description: isEdit
          ? "Your changes have been saved."
          : "The transaction has been recorded.",
      });
      qc.invalidateQueries({ queryKey: ["finance"] });
      onOpenChange(false);
    },
    onError: (e: Error) =>
      toast({ title: "Save failed", description: e.message, variant: "destructive" }),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!description.trim() || !amount || !date) {
      toast({
        title: "Missing fields",
        description: "Description, amount, and date are required.",
        variant: "destructive",
      });
      return;
    }
    mutation.mutate();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit transaction" : "New transaction"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the financial record below."
              : "Record a new income or expenditure entry for the chapter."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Type</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setType("income")}
                className={`flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors ${
                  type === "income"
                    ? "border-primary/40 bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary"
                    : "border-border hover:bg-muted/50"
                }`}
              >
                <TrendingUp className="h-4 w-4" />
                Income
              </button>
              <button
                type="button"
                onClick={() => setType("expenditure")}
                className={`flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors ${
                  type === "expenditure"
                    ? "border-red-400 bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300"
                    : "border-border hover:bg-muted/50"
                }`}
              >
                <TrendingDown className="h-4 w-4" />
                Expenditure
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="tx-amount">Amount (KES)</Label>
              <Input
                id="tx-amount"
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tx-date">Date</Label>
              <Input
                id="tx-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tx-category">Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger id="tx-category">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— None —</SelectItem>
                {CATEGORY_KEYS.map((k) => (
                  <SelectItem key={k} value={k}>
                    {CATEGORY_LABELS[k]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tx-desc">Description</Label>
            <Textarea
              id="tx-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Chapter monthly dues collection"
              rows={2}
              maxLength={500}
              required
            />
            <p className="text-xs text-muted-foreground">{description.length}/500</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tx-ref">Reference (receipt no. / M-Pesa code)</Label>
            <Input
              id="tx-ref"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="e.g. MPESA-ABC123XYZ"
              maxLength={120}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving…" : isEdit ? "Save changes" : "Add transaction"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------- Budget form ----------
interface BudgetFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  initial?: BudgetItem;
}

function BudgetFormDialog({ open, onOpenChange, mode, initial }: BudgetFormProps) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const isEdit = mode === "edit";

  const [title, setTitle] = React.useState(initial?.title ?? "");
  const [fiscalYear, setFiscalYear] = React.useState(
    initial?.fiscalYear ?? String(new Date().getFullYear()),
  );
  const [quarter, setQuarter] = React.useState<string>(initial?.quarter ?? "none");
  const [category, setCategory] = React.useState<string>(initial?.category ?? "none");
  const [plannedIncome, setPlannedIncome] = React.useState<string>(
    initial ? String(initial.plannedIncome) : "",
  );
  const [plannedExpenditure, setPlannedExpenditure] = React.useState<string>(
    initial ? String(initial.plannedExpenditure) : "",
  );
  const [notes, setNotes] = React.useState(initial?.notes ?? "");
  const [status, setStatus] = React.useState<"draft" | "approved" | "archived">(
    initial?.status ?? "draft",
  );

  const mutation = useMutation({
    mutationFn: async () => {
      const fy = fiscalYear.trim();
      if (!/^\d{4}$/.test(fy)) {
        throw new Error("Fiscal year must be a 4-digit year, e.g. 2026.");
      }
      const body = {
        title: title.trim(),
        fiscalYear: fy,
        quarter: quarter === "none" ? null : quarter,
        category: category === "none" ? null : category,
        plannedIncome: Number.parseFloat(plannedIncome) || 0,
        plannedExpenditure: Number.parseFloat(plannedExpenditure) || 0,
        notes: notes.trim() || null,
        status,
      };
      if (isEdit && initial) {
        const res = await fetch(`/api/finance/budgets/${initial.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => null);
          throw new Error(j?.error ?? "Failed to update budget");
        }
        return res.json();
      }
      const res = await fetch("/api/finance/budgets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error ?? "Failed to create budget");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: isEdit ? "Budget updated" : "Budget created",
        description: isEdit
          ? "Your changes have been saved."
          : "The budget has been added.",
      });
      qc.invalidateQueries({ queryKey: ["finance"] });
      onOpenChange(false);
    },
    onError: (e: Error) =>
      toast({ title: "Save failed", description: e.message, variant: "destructive" }),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !fiscalYear.trim()) {
      toast({
        title: "Missing fields",
        description: "Title and fiscal year are required.",
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
          <DialogTitle className="flex items-center gap-2">
            {isEdit ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {isEdit ? "Edit budget" : "New budget"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the budget plan below."
              : "Plan income and expenditure for a fiscal year or quarter."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="b-title">Title</Label>
            <Input
              id="b-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. FY 2026 Annual Operating Budget"
              required
              maxLength={160}
            />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="b-fy">Fiscal year</Label>
              <Input
                id="b-fy"
                value={fiscalYear}
                onChange={(e) => setFiscalYear(e.target.value)}
                placeholder="2026"
                maxLength={4}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="b-q">Quarter</Label>
              <Select value={quarter} onValueChange={setQuarter}>
                <SelectTrigger id="b-q">
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Full year —</SelectItem>
                  <SelectItem value="Q1">Q1</SelectItem>
                  <SelectItem value="Q2">Q2</SelectItem>
                  <SelectItem value="Q3">Q3</SelectItem>
                  <SelectItem value="Q4">Q4</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="b-cat">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger id="b-cat">
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— All —</SelectItem>
                  {CATEGORY_KEYS.map((k) => (
                    <SelectItem key={k} value={k}>
                      {CATEGORY_LABELS[k]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="b-pi">Planned income (KES)</Label>
              <Input
                id="b-pi"
                type="number"
                min="0"
                step="0.01"
                value={plannedIncome}
                onChange={(e) => setPlannedIncome(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="b-pe">Planned expenditure (KES)</Label>
              <Input
                id="b-pe"
                type="number"
                min="0"
                step="0.01"
                value={plannedExpenditure}
                onChange={(e) => setPlannedExpenditure(e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="b-status">Status</Label>
            <div className="flex flex-wrap gap-2">
              {(["draft", "approved", "archived"] as const).map((s) => {
                const icons = {
                  draft: <Archive className="h-3.5 w-3.5" />,
                  approved: <CheckCircle2 className="h-3.5 w-3.5" />,
                  archived: <Archive className="h-3.5 w-3.5" />,
                };
                const cls = {
                  draft: "border-border bg-muted/50 text-muted-foreground dark:bg-muted/30 dark:text-muted-foreground",
                  approved: "border-primary/30 bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary",
                  archived: "border-accent/30 bg-accent/20 text-accent-foreground dark:bg-accent/20 dark:text-accent-foreground",
                };
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStatus(s)}
                    className={`flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs capitalize transition-colors ${
                      status === s ? cls[s] : "border-border hover:bg-muted/50"
                    }`}
                  >
                    {icons[s]}
                    {s}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="b-notes">Notes</Label>
            <Textarea
              id="b-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Assumptions, remarks, or strategic priorities…"
              rows={3}
              maxLength={2000}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving…" : isEdit ? "Save changes" : "Create budget"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
