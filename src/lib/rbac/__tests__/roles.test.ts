// Embuni ELC — RBAC role-permission matrix tests.
// Task ID: P6.
//
// These tests treat `src/lib/rbac/roles.ts` as the SINGLE SOURCE OF TRUTH for
// which permissions each of the 13 roles holds. They guard against accidental
// permission drift when the file is edited (e.g. granting a Year-1 Rep cross-
// cohort visibility, or accidentally giving the Leader role an executive perm).
//
// The companion modules (`permissions.ts`, `server.ts`) are also imported to
// verify cross-module consistency (e.g. Super Admin holds every key defined in
// the permission catalogue).

import { test, expect, describe } from "bun:test";
import { ROLES, resolveRolePermissions, getRoleDefinition } from "../roles";
import { PERMISSIONS } from "../permissions";

// ---------- Helpers ----------
// The set of permissions every authenticated Leader gets (the COMMON set,
// duplicated here so tests stay green even if the COMMON export is renamed).
const COMMON_PERMS = [
  "dashboard.view",
  "profile.own.edit",
  "notifications.own.view",
  "concerns.submit",
  "programs.view",
  "events.view",
  "news.view",
  "announcements.view",
  "gallery.view",
  "resources.view",
] as const;

const ADMIN_ONLY_PERMS = ["admin.users", "admin.roles", "admin.system"] as const;

// All 13 role keys defined in the system. If a new role is added, this list
// must be updated — the test `ROLES contains exactly 13 roles` will catch it.
const ALL_ROLE_KEYS = [
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

// ---------- Role catalogue sanity ----------

describe("Role catalogue", () => {
  test("ROLES contains exactly 13 roles", () => {
    expect(ROLES.length).toBe(13);
  });

  test("Every role key is unique", () => {
    const keys = ROLES.map((r) => r.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  test("ROLES contains the expected 13 role keys", () => {
    const keys = ROLES.map((r) => r.key);
    for (const expected of ALL_ROLE_KEYS) {
      expect(keys).toContain(expected);
    }
  });

  test("getRoleDefinition returns the role for a known key", () => {
    const role = getRoleDefinition("TREASURER");
    expect(role?.name).toBe("Treasurer");
  });

  test("getRoleDefinition returns undefined for an unknown key", () => {
    expect(getRoleDefinition("DOES_NOT_EXIST")).toBeUndefined();
  });

  test("resolveRolePermissions returns an empty Set for an unknown role", () => {
    expect(resolveRolePermissions("DOES_NOT_EXIST").size).toBe(0);
  });
});

// ---------- Super Admin ----------

describe("Super Admin", () => {
  const perms = resolveRolePermissions("SUPER_ADMIN");

  test("Super Admin holds every permission defined in the catalogue", () => {
    expect(perms.size).toBe(PERMISSIONS.length);
    for (const p of PERMISSIONS) {
      expect(perms.has(p.key)).toBe(true);
    }
  });

  test("Super Admin has admin.system (the bypass flag)", () => {
    expect(perms.has("admin.system")).toBe(true);
  });

  test("Super Admin has admin.users and admin.roles", () => {
    expect(perms.has("admin.users")).toBe(true);
    expect(perms.has("admin.roles")).toBe(true);
  });

  test("Super Admin has audit.view", () => {
    expect(perms.has("audit.view")).toBe(true);
  });

  test("Super Admin has both cohort-scoped and global leaders.view variants", () => {
    expect(perms.has("leaders.view")).toBe(true);
    expect(perms.has("leaders.view.male_y1")).toBe(true);
    expect(perms.has("leaders.view.female_y1")).toBe(true);
    expect(perms.has("leaders.view.female_y1_readonly")).toBe(true);
  });
});

// ---------- Leader (ordinary member) ----------

describe("Leader (ordinary member)", () => {
  const perms = resolveRolePermissions("LEADER");

  test("Leader has exactly the COMMON set — no more, no less", () => {
    expect(perms.size).toBe(COMMON_PERMS.length);
    for (const p of COMMON_PERMS) {
      expect(perms.has(p)).toBe(true);
    }
  });

  test("Leader does NOT have leaders.view (cannot browse the leader directory)", () => {
    expect(perms.has("leaders.view")).toBe(false);
  });

  test("Leader does NOT have leaders.manage", () => {
    expect(perms.has("leaders.manage")).toBe(false);
  });

  test("Leader does NOT have any year-1 cohort visibility", () => {
    expect(perms.has("leaders.view.male_y1")).toBe(false);
    expect(perms.has("leaders.view.female_y1")).toBe(false);
    expect(perms.has("leaders.view.female_y1_readonly")).toBe(false);
  });

  test("Leader does NOT have audit.view", () => {
    expect(perms.has("audit.view")).toBe(false);
  });

  test("Leader does NOT have any admin.* permissions", () => {
    for (const p of ADMIN_ONLY_PERMS) {
      expect(perms.has(p)).toBe(false);
    }
  });

  test("Leader does NOT have finance.manage", () => {
    expect(perms.has("finance.manage")).toBe(false);
  });
});

// ---------- Year-1 Rep cohort isolation (the most critical security property) ----------

describe("Male Y1 Rep cohort isolation", () => {
  const perms = resolveRolePermissions("MALE_Y1_REPRESENTATIVE");

  test("Male Y1 Rep has leaders.view.male_y1", () => {
    expect(perms.has("leaders.view.male_y1")).toBe(true);
  });

  test("Male Y1 Rep does NOT have leaders.view.female_y1 (no cross-cohort visibility)", () => {
    expect(perms.has("leaders.view.female_y1")).toBe(false);
  });

  test("Male Y1 Rep does NOT have leaders.view.female_y1_readonly", () => {
    expect(perms.has("leaders.view.female_y1_readonly")).toBe(false);
  });

  test("Male Y1 Rep does NOT have the global leaders.view (no chapter-wide visibility)", () => {
    expect(perms.has("leaders.view")).toBe(false);
  });

  test("Male Y1 Rep does NOT have leaders.manage", () => {
    expect(perms.has("leaders.manage")).toBe(false);
  });

  test("Male Y1 Rep can record attendance for their own cohort only", () => {
    expect(perms.has("attendance.manage.male_y1")).toBe(true);
    expect(perms.has("attendance.manage")).toBe(false);
    expect(perms.has("attendance.manage.female_y1")).toBe(false);
  });
});

describe("Female Y1 Rep cohort isolation", () => {
  const perms = resolveRolePermissions("FEMALE_Y1_REPRESENTATIVE");

  test("Female Y1 Rep has leaders.view.female_y1", () => {
    expect(perms.has("leaders.view.female_y1")).toBe(true);
  });

  test("Female Y1 Rep does NOT have leaders.view.male_y1 (no cross-cohort visibility)", () => {
    expect(perms.has("leaders.view.male_y1")).toBe(false);
  });

  test("Female Y1 Rep does NOT have the global leaders.view", () => {
    expect(perms.has("leaders.view")).toBe(false);
  });

  test("Female Y1 Rep does NOT have leaders.manage", () => {
    expect(perms.has("leaders.manage")).toBe(false);
  });

  test("Female Y1 Rep can record attendance for their own cohort only", () => {
    expect(perms.has("attendance.manage.female_y1")).toBe(true);
    expect(perms.has("attendance.manage")).toBe(false);
    expect(perms.has("attendance.manage.male_y1")).toBe(false);
  });
});

describe("Assistant Female Y1 Rep is read-only", () => {
  const perms = resolveRolePermissions("ASSISTANT_FEMALE_Y1_REPRESENTATIVE");

  test("Assistant Female Y1 Rep has leaders.view.female_y1_readonly", () => {
    expect(perms.has("leaders.view.female_y1_readonly")).toBe(true);
  });

  test("Assistant Female Y1 Rep does NOT have the full leaders.view.female_y1", () => {
    expect(perms.has("leaders.view.female_y1")).toBe(false);
  });

  test("Assistant Female Y1 Rep does NOT have leaders.view.male_y1", () => {
    expect(perms.has("leaders.view.male_y1")).toBe(false);
  });

  test("Assistant Female Y1 Rep can view but NOT manage female_y1 attendance", () => {
    expect(perms.has("attendance.view.female_y1")).toBe(true);
    expect(perms.has("attendance.manage.female_y1")).toBe(false);
  });

  test("Assistant Female Y1 Rep does NOT have leaders.manage", () => {
    expect(perms.has("leaders.manage")).toBe(false);
  });
});

// ---------- Admin.* exclusivity (only Super Admin) ----------

describe("admin.* permissions are exclusive to Super Admin", () => {
  test("no non-Super-Admin role has admin.users", () => {
    for (const role of ROLES) {
      if (role.key === "SUPER_ADMIN") continue;
      const perms = resolveRolePermissions(role.key);
      expect(perms.has("admin.users")).toBe(false);
    }
  });

  test("no non-Super-Admin role has admin.roles", () => {
    for (const role of ROLES) {
      if (role.key === "SUPER_ADMIN") continue;
      const perms = resolveRolePermissions(role.key);
      expect(perms.has("admin.roles")).toBe(false);
    }
  });

  test("no non-Super-Admin role has admin.system (the bypass flag)", () => {
    for (const role of ROLES) {
      if (role.key === "SUPER_ADMIN") continue;
      const perms = resolveRolePermissions(role.key);
      expect(perms.has("admin.system")).toBe(false);
    }
  });
});

// ---------- Role-specific permission checks (parity with the matrix in worklog.md) ----------

describe("Role-specific permission parity", () => {
  test("President has audit.view but Leader does not", () => {
    expect(resolveRolePermissions("PRESIDENT").has("audit.view")).toBe(true);
    expect(resolveRolePermissions("LEADER").has("audit.view")).toBe(false);
  });

  test("President has meeting management permissions", () => {
    const perms = resolveRolePermissions("PRESIDENT");
    expect(perms.has("meetings.view")).toBe(true);
    expect(perms.has("meetings.manage")).toBe(true);
    expect(perms.has("meetings.approve")).toBe(true);
  });

  test("President has document management permissions", () => {
    const perms = resolveRolePermissions("PRESIDENT");
    expect(perms.has("documents.view")).toBe(true);
    expect(perms.has("documents.upload")).toBe(true);
    expect(perms.has("documents.approve")).toBe(true);
  });

  test("President has report generate and export but Leader does not", () => {
    const president = resolveRolePermissions("PRESIDENT");
    const leader = resolveRolePermissions("LEADER");
    expect(president.has("reports.generate")).toBe(true);
    expect(president.has("reports.export")).toBe(true);
    expect(leader.has("reports.generate")).toBe(false);
    expect(leader.has("reports.export")).toBe(false);
  });

  test("Treasurer has finance.manage but Communications Director does not", () => {
    expect(resolveRolePermissions("TREASURER").has("finance.manage")).toBe(true);
    expect(resolveRolePermissions("COMMUNICATIONS_DIRECTOR").has("finance.manage")).toBe(false);
  });

  test("Treasurer has reports.generate for financial statements", () => {
    const t = resolveRolePermissions("TREASURER");
    expect(t.has("reports.generate")).toBe(true);
    expect(t.has("reports.export")).toBe(false);
  });

  test("Treasurer restrictions intact", () => {
    const t = resolveRolePermissions("TREASURER");
    expect(t.has("admin.system")).toBe(false);
    expect(t.has("admin.users")).toBe(false);
    expect(t.has("admin.roles")).toBe(false);
    expect(t.has("leaders.manage")).toBe(false);
    expect(t.has("meetings.manage")).toBe(false);
    expect(t.has("documents.approve")).toBe(false);
  });

  test("Treasurer has finance.view but Leader does not", () => {
    expect(resolveRolePermissions("TREASURER").has("finance.view")).toBe(true);
    expect(resolveRolePermissions("LEADER").has("finance.view")).toBe(false);
  });

  test("Secretary General has leaders.manage (records) but Treasurer does not", () => {
    expect(resolveRolePermissions("SECRETARY_GENERAL").has("leaders.manage")).toBe(true);
    expect(resolveRolePermissions("TREASURER").has("leaders.manage")).toBe(false);
  });

  test("Secretary General has meetings and records management", () => {
    const sg = resolveRolePermissions("SECRETARY_GENERAL");
    expect(sg.has("events.manage")).toBe(true);
    expect(sg.has("attendance.manage")).toBe(true);
    expect(sg.has("reports.generate")).toBe(true);
  });

  test("Secretary General restrictions intact", () => {
    const sg = resolveRolePermissions("SECRETARY_GENERAL");
    expect(sg.has("finance.manage")).toBe(false);
    expect(sg.has("finance.view")).toBe(false);
    expect(sg.has("admin.system")).toBe(false);
    expect(sg.has("admin.users")).toBe(false);
    expect(sg.has("admin.roles")).toBe(false);
  });

  test("Organizing Secretary has events.manage but Treasurer does not", () => {
    expect(resolveRolePermissions("ORGANIZING_SECRETARY").has("events.manage")).toBe(true);
    expect(resolveRolePermissions("TREASURER").has("events.manage")).toBe(false);
  });

  test("Organizing Secretary has announcements.manage and resources.manage", () => {
    const os = resolveRolePermissions("ORGANIZING_SECRETARY");
    expect(os.has("announcements.manage")).toBe(true);
    expect(os.has("resources.manage")).toBe(true);
  });

  test("Organizing Secretary lacks finance and admin perms", () => {
    const os = resolveRolePermissions("ORGANIZING_SECRETARY");
    expect(os.has("finance.view")).toBe(false);
    expect(os.has("finance.manage")).toBe(false);
    expect(os.has("admin.system")).toBe(false);
    expect(os.has("admin.users")).toBe(false);
    expect(os.has("admin.roles")).toBe(false);
    expect(os.has("leaders.manage")).toBe(false);
  });

  test("Mentorship Coordinator has mentorship.manage but Alumni Manager does not", () => {
    expect(resolveRolePermissions("MENTORSHIP_COORDINATOR").has("mentorship.manage")).toBe(true);
    expect(resolveRolePermissions("ALUMNI_MANAGER").has("mentorship.manage")).toBe(false);
  });

  test("Alumni Manager has alumni.manage but Mentorship Coordinator does not", () => {
    expect(resolveRolePermissions("ALUMNI_MANAGER").has("alumni.manage")).toBe(true);
    expect(resolveRolePermissions("MENTORSHIP_COORDINATOR").has("alumni.manage")).toBe(false);
  });

  test("Alumni Manager has alumni management and coordination perms", () => {
    const am = resolveRolePermissions("ALUMNI_MANAGER");
    expect(am.has("alumni.view")).toBe(true);
    expect(am.has("alumni.manage")).toBe(true);
    expect(am.has("announcements.manage")).toBe(true);
    expect(am.has("mentorship.view")).toBe(true);
    expect(am.has("resources.manage")).toBe(true);
    expect(am.has("reports.generate")).toBe(true);
  });

  test("Alumni Manager restrictions intact", () => {
    const am = resolveRolePermissions("ALUMNI_MANAGER");
    expect(am.has("finance.manage")).toBe(false);
    expect(am.has("finance.view")).toBe(false);
    expect(am.has("admin.system")).toBe(false);
    expect(am.has("admin.users")).toBe(false);
    expect(am.has("admin.roles")).toBe(false);
    expect(am.has("leaders.manage")).toBe(false);
    expect(am.has("meetings.manage")).toBe(false);
  });

  test("Communications Director has news.manage but Treasurer does not", () => {
    expect(resolveRolePermissions("COMMUNICATIONS_DIRECTOR").has("news.manage")).toBe(true);
    expect(resolveRolePermissions("TREASURER").has("news.manage")).toBe(false);
  });

  test("Vice President has all delegated management perms", () => {
    const vp = resolveRolePermissions("VICE_PRESIDENT");
    expect(vp.has("leaders.view")).toBe(true);
    expect(vp.has("programs.manage")).toBe(true);
    expect(vp.has("events.manage")).toBe(true);
    expect(vp.has("meetings.view")).toBe(true);
    expect(vp.has("meetings.manage")).toBe(true);
    expect(vp.has("announcements.manage")).toBe(true);
    expect(vp.has("reports.generate")).toBe(true);
    expect(vp.has("reports.export")).toBe(true);
    expect(vp.has("documents.view")).toBe(true);
    expect(vp.has("documents.upload")).toBe(true);
  });

  test("Vice President lacks admin, finance.manage, and restricted perms", () => {
    const vp = resolveRolePermissions("VICE_PRESIDENT");
    expect(vp.has("admin.system")).toBe(false);
    expect(vp.has("admin.users")).toBe(false);
    expect(vp.has("admin.roles")).toBe(false);
    expect(vp.has("finance.manage")).toBe(false);
    expect(vp.has("leaders.manage")).toBe(false);
    expect(vp.has("documents.approve")).toBe(false);
    expect(vp.has("meetings.approve")).toBe(false);
  });

  test("Vice President has the second broadest non-admin permission set among executives", () => {
    const vp = resolveRolePermissions("VICE_PRESIDENT");
    const execKeys = [
      "SECRETARY_GENERAL",
      "ORGANIZING_SECRETARY",
      "TREASURER",
      "COMMUNICATIONS_DIRECTOR",
      "MENTORSHIP_COORDINATOR",
      "ALUMNI_MANAGER",
    ];
    for (const key of execKeys) {
      const other = resolveRolePermissions(key);
      expect(vp.size).toBeGreaterThanOrEqual(other.size);
    }
  });

  test("Vice President inherits a delegated subset but lacks finance.manage", () => {
    const vp = resolveRolePermissions("VICE_PRESIDENT");
    expect(vp.has("leaders.view")).toBe(true);
    expect(vp.has("reports.view")).toBe(true);
    // VP is a delegated read-mostly role — does not have finance.manage.
    expect(vp.has("finance.manage")).toBe(false);
    expect(vp.has("leaders.manage")).toBe(false);
  });

  test("President holds leaders.manage", () => {
    expect(resolveRolePermissions("PRESIDENT").has("leaders.manage")).toBe(true);
  });

  test("President has the broadest non-admin permission set among executives", () => {
    const president = resolveRolePermissions("PRESIDENT");
    const execKeys = [
      "VICE_PRESIDENT",
      "SECRETARY_GENERAL",
      "ORGANIZING_SECRETARY",
      "TREASURER",
      "COMMUNICATIONS_DIRECTOR",
      "MENTORSHIP_COORDINATOR",
      "ALUMNI_MANAGER",
    ];
    for (const key of execKeys) {
      const other = resolveRolePermissions(key);
      // President must have AT LEAST as many perms as each other exec.
      expect(president.size).toBeGreaterThanOrEqual(other.size);
    }
  });

  test("Every role includes the COMMON permission set", () => {
    for (const role of ROLES) {
      const perms = resolveRolePermissions(role.key);
      for (const p of COMMON_PERMS) {
        if (!perms.has(p)) {
          throw new Error(`Role ${role.key} is missing COMMON permission: ${p}`);
        }
      }
    }
  });
});
