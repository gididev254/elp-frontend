// Server-side report overview builder.
// Shared by the `/api/reports/overview` route handler and the
// `/dashboard/reports` server component (for first-paint prefetch).
//
// Each function returns the same `ReportOverview` shape so the client
// `ReportsViewer` component can render either the prefetched data or the
// freshly fetched data from the API.

import { db } from "@/lib/db";
import { getLeaderScopeFilter, type ResolvedUser } from "@/lib/rbac/server";

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

export function resolveReportView(
  primaryRole: string | null,
  restrictToCohort: boolean,
): ReportView {
  if (restrictToCohort) return "cohort";
  switch (primaryRole) {
    case "SUPER_ADMIN":
    case "PRESIDENT":
    case "VICE_PRESIDENT":
    case "SECRETARY_GENERAL":
      return "chapter";
    case "TREASURER":
      return "finance";
    case "ORGANIZING_SECRETARY":
      return "events";
    case "COMMUNICATIONS_DIRECTOR":
      return "content";
    case "MENTORSHIP_COORDINATOR":
      return "mentorship";
    case "ALUMNI_MANAGER":
      return "alumni";
    default:
      return "chapter";
  }
}

export function describeScope(
  view: ReportView,
  scope: ReturnType<typeof getLeaderScopeFilter>,
): string {
  if (scope.restrictToCohort) {
    const genderLabel =
      scope.gender === "male" ? "Male" : scope.gender === "female" ? "Female" : "";
    const yearLabel = scope.yearOfStudy ? `Year ${scope.yearOfStudy} ` : "";
    return `${genderLabel} ${yearLabel}cohort`.replace(/\s+/g, " ").trim();
  }
  switch (view) {
    case "finance":
      return "Treasury";
    case "events":
      return "Events & Activities";
    case "content":
      return "Communications";
    case "mentorship":
      return "Mentorship";
    case "alumni":
      return "Alumni Network";
    default:
      return "Chapter-wide";
  }
}

export async function buildReportOverview(
  user: ResolvedUser,
): Promise<ReportOverview> {
  const scope = getLeaderScopeFilter(user);
  const view = resolveReportView(user.primaryRole, scope.restrictToCohort);
  const scopeLabel = describeScope(view, scope);

  switch (view) {
    case "chapter":
      return buildChapterOverview(scopeLabel);
    case "finance":
      return buildFinanceOverview(scopeLabel);
    case "events":
      return buildEventsOverview(scopeLabel);
    case "content":
      return buildContentOverview(scopeLabel);
    case "mentorship":
      return buildMentorshipOverview(scopeLabel);
    case "alumni":
      return buildAlumniOverview(scopeLabel);
    case "cohort":
      return buildCohortOverview(scopeLabel, scope);
  }
}

// ===========================================================================
// Chapter-wide overview — President / Super Admin / VP / Sec Gen
// ===========================================================================
async function buildChapterOverview(scopeLabel: string): Promise<ReportOverview> {
  const now = new Date();
  const [
    totalLeaders,
    activeEvents,
    publishedNews,
    financeByType,
    mentorshipAssignments,
    alumniCount,
    attendanceCounts,
    upcomingEventsCount,
  ] = await Promise.all([
    db.user.count({
      where: { status: "active", userRoles: { some: { role: { key: "LEADER" } } } },
    }),
    db.event.count({ where: { status: { in: ["published", "ongoing"] } } }),
    db.newsArticle.count({ where: { status: "published" } }),
    db.financialRecord.groupBy({ by: ["type"], _sum: { amount: true } }),
    db.mentorshipAssignment.count({ where: { status: "active" } }),
    db.alumni.count({ where: { status: "active" } }),
    db.attendance.groupBy({ by: ["status"], _count: { _all: true } }),
    db.event.count({
      where: { status: { in: ["published", "ongoing"] }, startAt: { gte: now } },
    }),
  ]);

  const totalIncome = financeByType.find((t) => t.type === "income")?._sum.amount ?? 0;
  const totalExpenditure =
    financeByType.find((t) => t.type === "expenditure")?._sum.amount ?? 0;
  const totalAttendance = attendanceCounts.reduce((s, r) => s + r._count._all, 0);
  const presentCount =
    attendanceCounts.find((a) => a.status === "present")?._count._all ?? 0;
  const attendanceRate =
    totalAttendance > 0 ? Math.round((presentCount / totalAttendance) * 100) : 0;

  const months: { label: string; income: number; expenditure: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      label: d.toLocaleString("en", { month: "short" }),
      income: 0,
      expenditure: 0,
    });
  }
  const records = await db.financialRecord.findMany({
    where: { date: { gte: new Date(now.getFullYear(), now.getMonth() - 5, 1) } },
    select: { type: true, amount: true, date: true },
  });
  for (const r of records) {
    const offset =
      (now.getFullYear() - r.date.getFullYear()) * 12 +
      (now.getMonth() - r.date.getMonth());
    const idx = 5 - offset;
    if (idx >= 0 && idx < 6) {
      if (r.type === "income") months[idx].income += r.amount;
      else months[idx].expenditure += r.amount;
    }
  }

  const topEvents = await db.event.findMany({
    where: { status: { in: ["published", "ongoing", "completed"] } },
    orderBy: { startAt: "desc" },
    take: 5,
    include: { _count: { select: { registrations: true, attendance: true } } },
  });

  return {
    view: "chapter",
    scopeLabel,
    summary: [
      { label: "Active leaders", value: String(totalLeaders) },
      {
        label: "Upcoming events",
        value: String(upcomingEventsCount),
        hint: `${activeEvents} published total`,
      },
      { label: "Published news", value: String(publishedNews) },
      { label: "Total income", value: `KES ${Math.round(totalIncome).toLocaleString()}` },
      {
        label: "Total expenditure",
        value: `KES ${Math.round(totalExpenditure).toLocaleString()}`,
      },
      {
        label: "Net balance",
        value: `KES ${Math.round(totalIncome - totalExpenditure).toLocaleString()}`,
      },
      {
        label: "Attendance rate",
        value: `${attendanceRate}%`,
        hint: `${presentCount} of ${totalAttendance} marks`,
      },
      { label: "Mentorship assignments", value: String(mentorshipAssignments) },
      { label: "Alumni records", value: String(alumniCount) },
    ],
    chart: {
      title: "Income vs Expenditure (last 6 months)",
      series: [
        { key: "value", label: "Income", color: "hsl(var(--chart-1))" },
        { key: "value2", label: "Expenditure", color: "hsl(var(--chart-2))" },
      ],
      data: months.map((m) => ({
        label: m.label,
        value: m.income,
        value2: m.expenditure,
      })),
    },
    table: {
      title: "Recent events",
      columns: ["Title", "Date", "Registrations", "Attendance"],
      rows: topEvents.map((e) => [
        e.title,
        e.startAt.toLocaleDateString(),
        e._count.registrations,
        e._count.attendance,
      ]),
    },
  };
}

// ===========================================================================
// Finance overview — Treasurer
// ===========================================================================
async function buildFinanceOverview(scopeLabel: string): Promise<ReportOverview> {
  const [totalsByType, byCategoryRaw, budgets] = await Promise.all([
    db.financialRecord.groupBy({ by: ["type"], _sum: { amount: true } }),
    db.financialRecord.groupBy({ by: ["category", "type"], _sum: { amount: true } }),
    db.budget.findMany({ where: { status: "approved" } }),
  ]);

  const totalIncome = totalsByType.find((t) => t.type === "income")?._sum.amount ?? 0;
  const totalExpenditure =
    totalsByType.find((t) => t.type === "expenditure")?._sum.amount ?? 0;
  const net = totalIncome - totalExpenditure;
  const plannedIncome = budgets.reduce((s, b) => s + b.plannedIncome, 0);
  const plannedExpenditure = budgets.reduce((s, b) => s + b.plannedExpenditure, 0);
  const incomeVariance = plannedIncome - totalIncome;
  const expenditureVariance = plannedExpenditure - totalExpenditure;

  const categoryMap = new Map<string, { income: number; expenditure: number }>();
  for (const row of byCategoryRaw) {
    const key = row.category ?? "other";
    if (!categoryMap.has(key)) categoryMap.set(key, { income: 0, expenditure: 0 });
    const bucket = categoryMap.get(key)!;
    if (row.type === "income") bucket.income += row._sum.amount ?? 0;
    else bucket.expenditure += row._sum.amount ?? 0;
  }
  const categoryData = Array.from(categoryMap.entries())
    .map(([label, v]) => ({ label, value: v.income, value2: v.expenditure }))
    .sort((a, b) => b.value + b.value2 - (a.value + a.value2))
    .slice(0, 6);

  const recentTx = await db.financialRecord.findMany({
    orderBy: { date: "desc" },
    take: 8,
    include: { recordedBy: { include: { profile: { select: { fullName: true } } } } },
  });

  return {
    view: "finance",
    scopeLabel,
    summary: [
      { label: "Total income", value: `KES ${Math.round(totalIncome).toLocaleString()}` },
      {
        label: "Total expenditure",
        value: `KES ${Math.round(totalExpenditure).toLocaleString()}`,
      },
      {
        label: "Net balance",
        value: `KES ${Math.round(net).toLocaleString()}`,
        hint: net >= 0 ? "Surplus" : "Deficit",
      },
      { label: "Approved budgets", value: String(budgets.length) },
      {
        label: "Planned income",
        value: `KES ${Math.round(plannedIncome).toLocaleString()}`,
      },
      {
        label: "Planned expenditure",
        value: `KES ${Math.round(plannedExpenditure).toLocaleString()}`,
      },
      {
        label: "Income variance",
        value: `KES ${Math.round(incomeVariance).toLocaleString()}`,
        hint: incomeVariance >= 0 ? "Under plan" : "Over plan",
      },
      {
        label: "Expenditure variance",
        value: `KES ${Math.round(expenditureVariance).toLocaleString()}`,
        hint: expenditureVariance >= 0 ? "Under budget" : "Over budget",
      },
    ],
    chart: {
      title: "Transactions by category",
      series: [
        { key: "value", label: "Income", color: "hsl(var(--chart-1))" },
        { key: "value2", label: "Expenditure", color: "hsl(var(--chart-2))" },
      ],
      data: categoryData,
    },
    table: {
      title: "Recent transactions",
      columns: ["Date", "Type", "Category", "Description", "Amount"],
      rows: recentTx.map((t) => [
        t.date.toLocaleDateString(),
        t.type,
        t.category ?? "—",
        t.description.length > 40 ? t.description.slice(0, 40) + "…" : t.description,
        `KES ${Math.round(t.amount).toLocaleString()}`,
      ]),
    },
  };
}

// ===========================================================================
// Events overview — Organizing Secretary
// ===========================================================================
async function buildEventsOverview(scopeLabel: string): Promise<ReportOverview> {
  const now = new Date();
  const [upcoming, pastEvents, totalRegistrations, attendanceCounts, byCategory] =
    await Promise.all([
      db.event.count({
        where: { status: { in: ["published", "ongoing"] }, startAt: { gte: now } },
      }),
      db.event.count({ where: { status: "completed" } }),
      db.eventRegistration.count(),
      db.attendance.groupBy({ by: ["status"], _count: { _all: true } }),
      db.event.groupBy({ by: ["category"], _count: { _all: true } }),
    ]);

  const totalAttendance = attendanceCounts.reduce((s, r) => s + r._count._all, 0);
  const presentCount =
    attendanceCounts.find((a) => a.status === "present")?._count._all ?? 0;
  const attendanceRate =
    totalAttendance > 0 ? Math.round((presentCount / totalAttendance) * 100) : 0;

  const recentEvents = await db.event.findMany({
    where: { status: { in: ["published", "ongoing", "completed"] } },
    orderBy: { startAt: "desc" },
    take: 8,
    include: { _count: { select: { registrations: true, attendance: true } } },
  });

  return {
    view: "events",
    scopeLabel,
    summary: [
      { label: "Upcoming events", value: String(upcoming) },
      { label: "Past (completed) events", value: String(pastEvents) },
      { label: "Total registrations", value: String(totalRegistrations) },
      {
        label: "Attendance rate",
        value: `${attendanceRate}%`,
        hint: `${presentCount} of ${totalAttendance} marks`,
      },
    ],
    chart: {
      title: "Events by category",
      series: [{ key: "value", label: "Events", color: "hsl(var(--chart-1))" }],
      data: byCategory.map((c) => ({
        label: c.category ?? "uncategorised",
        value: c._count._all,
      })),
    },
    table: {
      title: "Recent events",
      columns: ["Title", "Date", "Category", "Registrations", "Attendance"],
      rows: recentEvents.map((e) => [
        e.title,
        e.startAt.toLocaleDateString(),
        e.category ?? "—",
        e._count.registrations,
        e._count.attendance,
      ]),
    },
  };
}

// ===========================================================================
// Content overview — Communications Director
// ===========================================================================
async function buildContentOverview(scopeLabel: string): Promise<ReportOverview> {
  const [news, announcements, gallery, resources, newsByCategory] = await Promise.all([
    db.newsArticle.count({ where: { status: "published" } }),
    db.announcement.count({ where: { status: "published" } }),
    db.galleryMedia.count({ where: { status: "published" } }),
    db.resource.count({ where: { status: "published" } }),
    db.newsArticle.groupBy({
      by: ["category"],
      where: { status: "published" },
      _count: { _all: true },
    }),
  ]);

  const recentNews = await db.newsArticle.findMany({
    where: { status: "published" },
    orderBy: { publishedAt: "desc" },
    take: 8,
    include: { author: { include: { profile: { select: { fullName: true } } } } },
  });

  return {
    view: "content",
    scopeLabel,
    summary: [
      { label: "Published news", value: String(news) },
      { label: "Published announcements", value: String(announcements) },
      { label: "Gallery items", value: String(gallery) },
      { label: "Resources", value: String(resources) },
    ],
    chart: {
      title: "News by category",
      series: [{ key: "value", label: "Articles", color: "hsl(var(--chart-1))" }],
      data: newsByCategory.map((c) => ({
        label: c.category ?? "uncategorised",
        value: c._count._all,
      })),
    },
    table: {
      title: "Recent articles",
      columns: ["Title", "Category", "Author", "Published"],
      rows: recentNews.map((n) => [
        n.title.length > 50 ? n.title.slice(0, 50) + "…" : n.title,
        n.category ?? "—",
        n.author?.profile?.fullName ?? "—",
        n.publishedAt ? n.publishedAt.toLocaleDateString() : "—",
      ]),
    },
  };
}

// ===========================================================================
// Mentorship overview — Mentorship Coordinator
// ===========================================================================
async function buildMentorshipOverview(scopeLabel: string): Promise<ReportOverview> {
  const [assignments, sessions, byStatus, activeAssignments] = await Promise.all([
    db.mentorshipAssignment.count(),
    db.mentorshipSession.count(),
    db.mentorshipAssignment.groupBy({ by: ["status"], _count: { _all: true } }),
    db.mentorshipAssignment.count({ where: { status: "active" } }),
  ]);

  const completed = byStatus.find((s) => s.status === "completed")?._count._all ?? 0;
  const completionRate =
    assignments > 0 ? Math.round((completed / assignments) * 100) : 0;

  const recentSessions = await db.mentorshipSession.findMany({
    orderBy: { heldAt: "desc" },
    take: 8,
    include: {
      mentor: { include: { profile: { select: { fullName: true } } } },
      mentee: { include: { profile: { select: { fullName: true } } } },
    },
  });

  return {
    view: "mentorship",
    scopeLabel,
    summary: [
      { label: "Total assignments", value: String(assignments) },
      { label: "Active assignments", value: String(activeAssignments) },
      { label: "Sessions logged", value: String(sessions) },
      {
        label: "Completion rate",
        value: `${completionRate}%`,
        hint: `${completed} completed`,
      },
    ],
    chart: {
      title: "Assignments by status",
      series: [{ key: "value", label: "Assignments", color: "hsl(var(--chart-1))" }],
      data: byStatus.map((s) => ({ label: s.status, value: s._count._all })),
    },
    table: {
      title: "Recent sessions",
      columns: ["Title", "Date", "Mentor", "Mentee"],
      rows: recentSessions.map((s) => [
        s.title,
        s.heldAt.toLocaleDateString(),
        s.mentor.profile?.fullName ?? "—",
        s.mentee?.profile?.fullName ?? "—",
      ]),
    },
  };
}

// ===========================================================================
// Alumni overview — Alumni Manager
// ===========================================================================
async function buildAlumniOverview(scopeLabel: string): Promise<ReportOverview> {
  const [total, byEngagement, byGradYear] = await Promise.all([
    db.alumni.count({ where: { status: "active" } }),
    db.alumni.groupBy({
      by: ["engagementLevel"],
      where: { status: "active" },
      _count: { _all: true },
    }),
    db.alumni.groupBy({
      by: ["graduationYear"],
      where: { status: "active" },
      _count: { _all: true },
      orderBy: { graduationYear: "desc" },
      take: 12,
    }),
  ]);

  const recentAlumni = await db.alumni.findMany({
    where: { status: "active" },
    orderBy: { createdAt: "desc" },
    take: 8,
  });

  return {
    view: "alumni",
    scopeLabel,
    summary: [
      { label: "Total alumni", value: String(total) },
      {
        label: "Active engagement",
        value: String(
          byEngagement.find((e) => e.engagementLevel === "active")?._count._all ?? 0,
        ),
      },
      {
        label: "Mentors",
        value: String(
          byEngagement.find((e) => e.engagementLevel === "mentor")?._count._all ?? 0,
        ),
      },
      {
        label: "Passive",
        value: String(
          byEngagement.find((e) => e.engagementLevel === "passive")?._count._all ?? 0,
        ),
      },
    ],
    chart: {
      title: "Alumni by graduation year",
      series: [{ key: "value", label: "Graduates", color: "hsl(var(--chart-1))" }],
      data: byGradYear.map((g) => ({
        label: String(g.graduationYear),
        value: g._count._all,
      })),
    },
    table: {
      title: "Recent alumni records",
      columns: ["Name", "Graduation", "Engagement", "Occupation"],
      rows: recentAlumni.map((a) => [
        a.fullName,
        String(a.graduationYear),
        a.engagementLevel,
        a.currentOccupation ?? "—",
      ]),
    },
  };
}

// ===========================================================================
// Cohort overview — Year-1 Reps (Male / Female / Asst. Female)
// ===========================================================================
async function buildCohortOverview(
  scopeLabel: string,
  scope: ReturnType<typeof getLeaderScopeFilter>,
): Promise<ReportOverview> {
  const profileWhere: Record<string, unknown> = {};
  if (scope.gender) profileWhere.gender = scope.gender;
  if (scope.yearOfStudy) profileWhere.yearOfStudy = scope.yearOfStudy;

  const totalLeaders = await db.user.count({
    where: {
      status: "active",
      userRoles: { some: { role: { key: "LEADER" } } },
      profile: profileWhere,
    },
  });

  const cohortKey = scope.gender === "male" ? "male_y1" : "female_y1";
  const concerns = await db.concern.groupBy({
    by: ["status"],
    where: { cohort: cohortKey },
    _count: { _all: true },
  });
  const totalConcerns = concerns.reduce((s, c) => s + c._count._all, 0);

  const cohortUserIds = await db.user.findMany({
    where: {
      status: "active",
      userRoles: { some: { role: { key: "LEADER" } } },
      profile: profileWhere,
    },
    select: { id: true },
  });
  const cohortIdList = cohortUserIds.map((u) => u.id);

  const attendanceRows = cohortIdList.length
    ? await db.attendance.groupBy({
        by: ["status"],
        where: { userId: { in: cohortIdList } },
        _count: { _all: true },
      })
    : [];
  const totalAttendance = attendanceRows.reduce((s, r) => s + r._count._all, 0);
  const presentCount =
    attendanceRows.find((a) => a.status === "present")?._count._all ?? 0;
  const attendanceRate =
    totalAttendance > 0 ? Math.round((presentCount / totalAttendance) * 100) : 0;

  const bySchool = await db.profile.groupBy({
    by: ["school"],
    where: profileWhere,
    _count: { _all: true },
  });

  const cohortMembers = await db.user.findMany({
    where: {
      status: "active",
      userRoles: { some: { role: { key: "LEADER" } } },
      profile: profileWhere,
    },
    include: { profile: true },
    orderBy: { profile: { fullName: "asc" } },
    take: 12,
  });

  return {
    view: "cohort",
    scopeLabel,
    summary: [
      { label: "Leaders in cohort", value: String(totalLeaders) },
      {
        label: "Attendance rate",
        value: `${attendanceRate}%`,
        hint: `${presentCount} of ${totalAttendance} marks`,
      },
      {
        label: "Concerns submitted",
        value: String(totalConcerns),
        hint: "Your cohort",
      },
      {
        label: "Open concerns",
        value: String(concerns.find((c) => c.status === "open")?._count._all ?? 0),
      },
    ],
    chart: {
      title: "Cohort by school",
      series: [{ key: "value", label: "Leaders", color: "hsl(var(--chart-1))" }],
      data: bySchool.map((s) => ({ label: s.school ?? "Unknown", value: s._count._all })),
    },
    table: {
      title: "Cohort members",
      columns: ["Name", "Year", "School", "Email"],
      rows: cohortMembers.map((u) => [
        u.profile?.fullName ?? u.email,
        u.profile?.yearOfStudy ? `Year ${u.profile.yearOfStudy}` : "—",
        u.profile?.school ?? "—",
        u.email,
      ]),
    },
  };
}
