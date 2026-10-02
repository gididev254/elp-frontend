"use client";

import * as React from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Download,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  Wallet,
  CalendarDays,
  GraduationCap,
  Newspaper,
  RefreshCw,
  type LucideIcon,
} from "lucide-react";

// Shape mirrors /api/reports/overview output.
export type ReportView =
  | "chapter"
  | "finance"
  | "events"
  | "content"
  | "mentorship"
  | "alumni"
  | "cohort";

export interface SummaryCard {
  label: string;
  value: string;
  hint?: string;
}

export interface ChartDatum {
  label: string;
  value: number;
  value2?: number;
}

export interface ReportOverview {
  view: ReportView;
  scopeLabel: string;
  summary: SummaryCard[];
  chart: {
    title: string;
    series: { key: string; label: string; color?: string }[];
    data: ChartDatum[];
  };
  table: {
    title: string;
    columns: string[];
    rows: (string | number)[][];
  };
}

type ExportType = "leaders" | "events" | "finance" | "attendance" | "mentorship" | "alumni";

const EXPORT_TYPES: { value: ExportType; label: string }[] = [
  { value: "leaders", label: "Leaders" },
  { value: "events", label: "Events" },
  { value: "finance", label: "Finance" },
  { value: "attendance", label: "Attendance" },
  { value: "mentorship", label: "Mentorship" },
  { value: "alumni", label: "Alumni" },
];

// Map report view → sensible default export type.
const VIEW_TO_DEFAULT_EXPORT: Record<ReportView, ExportType> = {
  chapter: "leaders",
  finance: "finance",
  events: "events",
  content: "leaders",
  mentorship: "mentorship",
  alumni: "alumni",
  cohort: "attendance",
};

interface Props {
  initialOverview: ReportOverview;
}

export function ReportsViewer({ initialOverview }: Props) {
  const { toast } = useToast();
  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["reports", "overview"],
    queryFn: async () => {
      const res = await fetch("/api/reports/overview");
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error ?? "Failed to load report");
      }
      return (await res.json()) as ReportOverview;
    },
    initialData: initialOverview,
  });

  const overview = data ?? initialOverview;

  // Default the export selector to match the report view.
  const [exportType, setExportType] = React.useState<ExportType>(
    VIEW_TO_DEFAULT_EXPORT[overview.view] ?? "leaders",
  );

  // When the overview view changes (after refetch), align the export type to it.
  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setExportType(VIEW_TO_DEFAULT_EXPORT[overview.view] ?? "leaders");
  }, [overview.view]);

  const downloadMutation = useMutation({
    mutationFn: async (type: ExportType) => {
      const res = await fetch(`/api/reports/export?type=${type}`);
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error ?? "Failed to export CSV");
      }
      const blob = await res.blob();
      // Pull the filename from the Content-Disposition header.
      const cd = res.headers.get("Content-Disposition") ?? "";
      const m = cd.match(/filename="?([^";]+)"?/);
      const filename = m?.[1] ?? `${type}-export.csv`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
    onSuccess: (_data, type) => {
      toast({
        title: "Export ready",
        description: `Your ${type} CSV has been downloaded.`,
      });
    },
    onError: (e: Error) =>
      toast({
        title: "Export failed",
        description: e.message,
        variant: "destructive",
      }),
  });

  return (
    <div className="space-y-6">
      {/* Header row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <Badge variant="outline" className="mb-2 capitalize">
            <BarChart3 className="h-3 w-3 mr-1" />
            {overview.scopeLabel}
          </Badge>
          <p className="text-sm text-muted-foreground">
            {isLoading
              ? "Loading report…"
              : "Live summary pulled from across the chapter's modules."}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => refetch()}
          disabled={isFetching}
          aria-label="Refresh report"
        >
          <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* Summary cards */}
      <SummaryCards overview={overview} isLoading={isLoading} />

      {/* Chart card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{overview.chart.title}</CardTitle>
          <CardDescription className="text-xs">
            Visual breakdown of the figures shown above.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-72 w-full" />
          ) : overview.chart.data.length === 0 ? (
            <div className="h-72 flex items-center justify-center text-sm text-muted-foreground">
              No data to chart yet.
            </div>
          ) : (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={overview.chart.data} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11 }}
                    stroke="hsl(var(--muted-foreground))"
                    interval={0}
                    angle={overview.chart.data.length > 6 ? -20 : 0}
                    textAnchor={overview.chart.data.length > 6 ? "end" : "middle"}
                    height={overview.chart.data.length > 6 ? 60 : 30}
                  />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    labelStyle={{ color: "hsl(var(--foreground))" }}
                  />
                  {overview.chart.series.length > 1 && (
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                  )}
                  {overview.chart.series.map((s, i) => (
                    <Bar
                      key={s.key}
                      dataKey={s.key}
                      name={s.label}
                      fill={s.color ?? defaultBarColor(i)}
                      radius={[4, 4, 0, 0]}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Export + Table card */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <CardTitle className="text-base">Export &amp; Raw data</CardTitle>
            <CardDescription className="text-xs">
              Download a CSV of the underlying records (role-scoped).
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={exportType} onValueChange={(v) => setExportType(v as ExportType)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EXPORT_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={() => downloadMutation.mutate(exportType)}
              disabled={downloadMutation.isPending}
            >
              <Download className="h-4 w-4 mr-1.5" />
              {downloadMutation.isPending ? "Preparing…" : "Export CSV"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable overview={overview} isLoading={isLoading} />
        </CardContent>
      </Card>
    </div>
  );
}

function defaultBarColor(i: number): string {
  const palette = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))"];
  return palette[i % palette.length];
}

function SummaryCards({ overview, isLoading }: { overview: ReportOverview; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4 space-y-2">
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-6 w-2/3" />
              <Skeleton className="h-3 w-1/3" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
      {overview.summary.map((card, i) => {
        const Icon = pickSummaryIcon(overview.view, card.label);
        return (
          <Card key={i} className="hover:border-primary/30 transition-colors">
            <CardContent className="p-4 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  {card.label}
                </span>
                {Icon && <Icon className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />}
              </div>
              <div className="text-xl font-bold tracking-tight">{card.value}</div>
              {card.hint && (
                <div className="text-[11px] text-muted-foreground">{card.hint}</div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function pickSummaryIcon(view: ReportView, label: string): LucideIcon | null {
  const l = label.toLowerCase();
  if (l.includes("expenditure") || l.includes("deficit")) return TrendingDown;
  if (l.includes("income") || l.includes("balance") || l.includes("variance") || l.includes("planned")) {
    return TrendingUp;
  }
  if (view === "finance") return Wallet;
  if (view === "events") return CalendarDays;
  if (view === "content") return Newspaper;
  if (view === "mentorship") return GraduationCap;
  if (view === "alumni") return Users;
  if (l.includes("leader") || l.includes("member")) return Users;
  if (l.includes("event")) return CalendarDays;
  if (l.includes("mentor")) return GraduationCap;
  return null;
}

function DataTable({ overview, isLoading }: { overview: ReportOverview; isLoading: boolean }) {
  if (isLoading) {
    return <Skeleton className="h-48 w-full" />;
  }
  if (overview.table.rows.length === 0) {
    return (
      <div className="h-32 flex items-center justify-center text-sm text-muted-foreground border border-dashed border-border rounded-md">
        No rows to display.
      </div>
    );
  }
  return (
    <div className="overflow-x-auto -mx-2 max-h-96 overflow-y-auto">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-muted/50 backdrop-blur z-10">
          <tr>
            {overview.table.columns.map((c, i) => (
              <th
                key={i}
                className="text-left font-medium text-muted-foreground px-3 py-2 border-b border-border"
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {overview.table.rows.map((row, ri) => (
            <tr key={ri} className="hover:bg-muted/30">
              {row.map((cell, ci) => (
                <td key={ci} className="px-3 py-2 border-b border-border/60 align-top">
                  {String(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
