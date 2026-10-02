// Dashboard navigation configuration.
// Each item declares which roles can see it. The shell filters the nav at
// render time based on the current user's primary role. Backend enforcement
// is still required (RBAC server checks) — this is for UI visibility only.

import {
  LayoutDashboard,
  Users,
  CalendarDays,
  CalendarCheck,
  FolderKanban,
  Newspaper,
  Megaphone,
  Images,
  BookOpen,
  GraduationCap,
  Bell,
  FileText,
  Wallet,
  ScrollText,
  ShieldCheck,
  Settings2,
  UserCog,
  AlertCircle,
  BarChart3,
  MessageSquare,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  roles?: string[]; // undefined = visible to all authenticated users
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

// All roles
const ALL: string[] | undefined = undefined;

// Executive + admin (everyone except ordinary Leader)
const EXECUTIVE: string[] = [
  "SUPER_ADMIN",
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
];

const ADMIN_ONLY = ["SUPER_ADMIN"];
const PRESIDENT_OR_ADMIN = ["SUPER_ADMIN", "PRESIDENT"];
const TREASURER_OR_PRESIDENT_OR_ADMIN = ["SUPER_ADMIN", "PRESIDENT", "TREASURER"];
const COMMS_ROLES = ["SUPER_ADMIN", "PRESIDENT", "COMMUNICATIONS_DIRECTOR", "SECRETARY_GENERAL"];
const ORGSEC_ROLES = ["SUPER_ADMIN", "PRESIDENT", "ORGANIZING_SECRETARY"];
const ATTENDANCE_ROLES = [
  "SUPER_ADMIN",
  "PRESIDENT",
  "VICE_PRESIDENT",
  "SECRETARY_GENERAL",
  "ORGANIZING_SECRETARY",
  "MALE_Y1_REPRESENTATIVE",
  "FEMALE_Y1_REPRESENTATIVE",
  "ASSISTANT_FEMALE_Y1_REPRESENTATIVE",
];
const MENTORSHIP_ROLES = ["SUPER_ADMIN", "PRESIDENT", "MENTORSHIP_COORDINATOR"];
const ALUMNI_ROLES = ["SUPER_ADMIN", "PRESIDENT", "ALUMNI_MANAGER"];
const Y1_REP_ROLES = [
  "MALE_Y1_REPRESENTATIVE",
  "FEMALE_Y1_REPRESENTATIVE",
  "ASSISTANT_FEMALE_Y1_REPRESENTATIVE",
];

export const DASHBOARD_NAV: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ALL },
    ],
  },
  {
    label: "Chapter",
    items: [
      { href: "/dashboard/leaders", label: "Leaders", icon: Users, roles: undefined },
      { href: "/dashboard/programs", label: "Programs", icon: FolderKanban, roles: EXECUTIVE },
      { href: "/dashboard/events", label: "Events", icon: CalendarDays, roles: EXECUTIVE },
      // Attendance lives at /attendance (outside the dashboard shell) because it is
      // a focused recording tool; the page includes a back-link to /dashboard.
      { href: "/attendance", label: "Attendance", icon: CalendarCheck, roles: ATTENDANCE_ROLES },
      { href: "/dashboard/news", label: "News", icon: Newspaper, roles: COMMS_ROLES },
      { href: "/dashboard/announcements", label: "Announcements", icon: Megaphone, roles: COMMS_ROLES },
      { href: "/dashboard/gallery", label: "Gallery", icon: Images, roles: [...ORGSEC_ROLES, ...COMMS_ROLES] },
      { href: "/dashboard/resources", label: "Resources", icon: BookOpen, roles: [...COMMS_ROLES, "SECRETARY_GENERAL"] },
    ],
  },
  {
    label: "Engagement",
    items: [
      { href: "/dashboard/mentorship", label: "Mentorship", icon: GraduationCap, roles: MENTORSHIP_ROLES },
      { href: "/dashboard/alumni", label: "Alumni", icon: Users, roles: ALUMNI_ROLES },
      { href: "/dashboard/concerns", label: "Year 1 Concerns", icon: AlertCircle, roles: [...Y1_REP_ROLES, ...EXECUTIVE.filter(r => !Y1_REP_ROLES.includes(r))] },
      { href: "/dashboard/messages", label: "Messages", icon: MessageSquare, roles: ALL },
      { href: "/dashboard/notifications", label: "Notifications", icon: Bell, roles: ALL },
    ],
  },
  {
    label: "Governance",
    items: [
      { href: "/dashboard/finance", label: "Finance", icon: Wallet, roles: TREASURER_OR_PRESIDENT_OR_ADMIN },
      { href: "/dashboard/reports", label: "Reports", icon: BarChart3, roles: EXECUTIVE },
      { href: "/dashboard/audit", label: "Audit Logs", icon: ScrollText, roles: PRESIDENT_OR_ADMIN },
      { href: "/dashboard/admin", label: "Administration", icon: Settings2, roles: ADMIN_ONLY },
    ],
  },
];

// Convenience: get all role keys
export const ALL_ROLE_KEYS = [
  "SUPER_ADMIN",
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
  "LEADER",
] as const;

// Human-friendly role labels
export const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Technical Administrator",
  PRESIDENT: "President",
  VICE_PRESIDENT: "Vice President",
  SECRETARY_GENERAL: "Secretary General",
  ORGANIZING_SECRETARY: "Organizing Secretary",
  TREASURER: "Treasurer",
  COMMUNICATIONS_DIRECTOR: "Communications Director",
  MENTORSHIP_COORDINATOR: "Mentorship Coordinator",
  ALUMNI_MANAGER: "Alumni Manager",
  MALE_Y1_REPRESENTATIVE: "Male Year 1 Representative",
  FEMALE_Y1_REPRESENTATIVE: "Female Year 1 Representative",
  ASSISTANT_FEMALE_Y1_REPRESENTATIVE: "Assistant Female Year 1 Representative",
  LEADER: "Leader",
};
