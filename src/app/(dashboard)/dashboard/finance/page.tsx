// /dashboard/finance — Finance & Treasury module
// finance.view → see transactions, budgets, charts (Treasurer, President, VP, Super Admin)
// finance.manage → create/update/delete records and budgets (Treasurer, President, Super Admin)

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { resolveUser } from "@/lib/rbac/server";
import { db } from "@/lib/db";
import {
  FinanceManager,
  type FinancialRecordItem,
  type BudgetItem,
} from "@/components/dashboard/finance-manager";
import { Card, CardContent } from "@/components/ui/card";
import { ShieldAlert, Wallet } from "lucide-react";
import { redirect } from "next/navigation";

export const metadata = { title: "Finance" };

export default async function FinancePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");
  const user = await resolveUser(session.user.id);
  if (!user) redirect("/login");

  const canView =
    user.permissions.has("finance.view") ||
    user.permissions.has("finance.manage") ||
    user.permissions.has("admin.system");
  if (!canView) {
    return (
      <div className="space-y-6">
        <PageHeader />
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="p-6 flex items-start gap-3">
            <ShieldAlert className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div className="text-sm space-y-1">
              <div className="font-medium">Access restricted</div>
              <p className="text-muted-foreground">
                Financial records are only visible to the Treasurer, President,
                Vice President, and Super Admin. Contact the Treasurer if you
                believe you should have access.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const canManage =
    user.permissions.has("finance.manage") ||
    user.permissions.has("admin.system");

  // Pre-fetch initial datasets for the dashboard so the first render isn't empty.
  const [records, budgets, totalsByType, byCategoryRaw] = await Promise.all([
    db.financialRecord.findMany({
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      take: 200,
      include: {
        recordedBy: {
          select: {
            id: true,
            email: true,
            profile: { select: { fullName: true, preferredName: true } },
          },
        },
      },
    }),
    db.budget.findMany({
      orderBy: [{ fiscalYear: "desc" }, { createdAt: "desc" }],
      take: 100,
    }),
    db.financialRecord.groupBy({
      by: ["type"],
      _sum: { amount: true },
    }),
    db.financialRecord.groupBy({
      by: ["category", "type"],
      _sum: { amount: true },
    }),
  ]);

  const initialRecords: FinancialRecordItem[] = records.map((r) => ({
    id: r.id,
    type: r.type as "income" | "expenditure",
    category: r.category,
    amount: r.amount,
    currency: r.currency,
    description: r.description,
    date: r.date.toISOString(),
    reference: r.reference,
    recordedById: r.recordedById,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    recordedBy: r.recordedBy
      ? {
          id: r.recordedBy.id,
          email: r.recordedBy.email,
          name:
            r.recordedBy.profile?.preferredName ||
            r.recordedBy.profile?.fullName ||
            r.recordedBy.email,
        }
      : null,
  }));

  const initialBudgets: BudgetItem[] = budgets.map((b) => ({
    id: b.id,
    title: b.title,
    fiscalYear: b.fiscalYear,
    quarter: b.quarter,
    category: b.category,
    plannedIncome: b.plannedIncome,
    plannedExpenditure: b.plannedExpenditure,
    notes: b.notes,
    status: b.status as BudgetItem["status"],
    createdAt: b.createdAt.toISOString(),
    updatedAt: b.updatedAt.toISOString(),
  }));

  // Build the summary payload server-side too so charts render immediately.
  const totalIncome = totalsByType.find((t) => t.type === "income")?._sum.amount ?? 0;
  const totalExpenditure =
    totalsByType.find((t) => t.type === "expenditure")?._sum.amount ?? 0;
  const netBalance = totalIncome - totalExpenditure;

  const categoryMap = new Map<
    string,
    { category: string; income: number; expenditure: number }
  >();
  for (const row of byCategoryRaw) {
    const key = row.category ?? "other";
    if (!categoryMap.has(key)) {
      categoryMap.set(key, { category: key, income: 0, expenditure: 0 });
    }
    const bucket = categoryMap.get(key)!;
    if (row.type === "income") bucket.income += row._sum.amount ?? 0;
    else bucket.expenditure += row._sum.amount ?? 0;
  }

  // Last 6 months bucket
  const now = new Date();
  const monthKeys: string[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthKeys.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
    );
  }
  const monthBuckets = new Map(
    monthKeys.map((k) => [k, { month: k, income: 0, expenditure: 0 }]),
  );
  for (const r of records) {
    const key = `${r.date.getFullYear()}-${String(r.date.getMonth() + 1).padStart(2, "0")}`;
    const bucket = monthBuckets.get(key);
    if (!bucket) continue;
    if (r.type === "income") bucket.income += r.amount;
    else bucket.expenditure += r.amount;
  }

  const initialSummary = {
    totalIncome,
    totalExpenditure,
    netBalance,
    currency: "KES",
    byCategory: Array.from(categoryMap.values()).sort(
      (a, b) => b.income + b.expenditure - (a.income + a.expenditure),
    ),
    byMonth: Array.from(monthBuckets.values()),
  };

  return (
    <div className="space-y-6">
      <PageHeader />
      <FinanceManager
        initialRecords={initialRecords}
        initialBudgets={initialBudgets}
        initialSummary={initialSummary}
        canManage={canManage}
      />
    </div>
  );
}

function PageHeader() {
  return (
    <div>
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground mb-1">
        <Wallet className="h-3.5 w-3.5" />
        <span>Treasury &amp; Stewardship</span>
      </div>
      <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Finance</h1>
      <p className="mt-1 text-sm text-muted-foreground max-w-2xl">
        Track chapter income and expenditure, manage annual and quarterly budgets,
        and visualize financial health at a glance. Amounts are in Kenyan Shillings (KES).
      </p>
    </div>
  );
}
