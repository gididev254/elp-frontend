// Embuni ELC — `hasPermission` family tests.
// Task ID: P6.
//
// These tests verify the three permission-check helpers in `src/lib/rbac/server.ts`:
//
//   - hasPermission(user, perm)        — exactly one permission
//   - hasAnyPermission(user, ...perms) — at least one of the listed
//   - hasAllPermissions(user, ...perms) — every one of the listed
//
// All three short-circuit to `true` when the user holds `admin.system` (the
// Super Admin bypass). All three return `false` for null users and non-active
// users. We exercise every branch here.

import { test, expect, describe } from "bun:test";
import {
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  type ResolvedUser,
} from "../server";

// ---------- Mock user factory ----------

function makeUser(permissions: string[], status = "active"): ResolvedUser {
  return {
    id: "user-test-id",
    email: "test@embuni.ac.ke",
    name: "Test User",
    roleKeys: ["LEADER"],
    primaryRole: "LEADER",
    permissions: new Set(permissions),
    status,
  };
}

// Common archetypes used across tests.
const superAdmin = makeUser(["admin.system"]);
const noPerms = makeUser([]);
const leaderViewer = makeUser(["leaders.view"]);
const financeManager = makeUser(["finance.manage"]);
const treasurer = makeUser(["leaders.view", "finance.view", "finance.manage", "reports.view"]);
const president = makeUser([
  "leaders.view",
  "leaders.manage",
  "finance.view",
  "finance.manage",
  "audit.view",
  "reports.view",
  "reports.generate",
  "reports.export",
  "meetings.view",
  "meetings.manage",
  "meetings.approve",
  "documents.view",
  "documents.upload",
  "documents.approve",
]);

// ---------- hasPermission ----------

describe("hasPermission — null user", () => {
  test("returns false for a null user", () => {
    expect(hasPermission(null, "leaders.view")).toBe(false);
  });

  test("returns false for a null user even for a trivial permission", () => {
    expect(hasPermission(null, "dashboard.view")).toBe(false);
  });
});

describe("hasPermission — admin.system bypass", () => {
  test("a user with admin.system is granted any permission (bypass)", () => {
    expect(hasPermission(superAdmin, "leaders.view")).toBe(true);
    expect(hasPermission(superAdmin, "leaders.manage")).toBe(true);
    expect(hasPermission(superAdmin, "finance.manage")).toBe(true);
    expect(hasPermission(superAdmin, "audit.view")).toBe(true);
    expect(hasPermission(superAdmin, "admin.users")).toBe(true);
    expect(hasPermission(superAdmin, "admin.system")).toBe(true);
  });

  test("a user with admin.system is granted even permissions not in their set", () => {
    // Super Admin only has admin.system in their explicit set, but should be
    // granted everything else via the bypass.
    expect(superAdmin.permissions.has("leaders.view")).toBe(false);
    expect(hasPermission(superAdmin, "leaders.view")).toBe(true);
  });

  test("a user without admin.system and without the perm is denied", () => {
    expect(hasPermission(leaderViewer, "finance.manage")).toBe(false);
  });
});

describe("hasPermission — exact-match grant/deny", () => {
  test("a user with no permissions is denied everything", () => {
    expect(hasPermission(noPerms, "leaders.view")).toBe(false);
    expect(hasPermission(noPerms, "dashboard.view")).toBe(false);
    expect(hasPermission(noPerms, "audit.view")).toBe(false);
  });

  test("a user with leaders.view can view leaders", () => {
    expect(hasPermission(leaderViewer, "leaders.view")).toBe(true);
  });

  test("a user with leaders.view cannot manage leaders", () => {
    expect(hasPermission(leaderViewer, "leaders.manage")).toBe(false);
  });

  test("a user with finance.manage can manage finance", () => {
    expect(hasPermission(financeManager, "finance.manage")).toBe(true);
  });

  test("a user with finance.manage cannot view audit logs", () => {
    expect(hasPermission(financeManager, "audit.view")).toBe(false);
  });

  test("cohort-scoped perms do NOT grant global access", () => {
    const maleRep = makeUser(["leaders.view.male_y1"]);
    expect(hasPermission(maleRep, "leaders.view.male_y1")).toBe(true);
    // The global leaders.view perm is NOT implied by leaders.view.male_y1.
    expect(hasPermission(maleRep, "leaders.view")).toBe(false);
  });

  test("readonly female y1 perm does NOT grant the full female_y1 perm", () => {
    const asst = makeUser(["leaders.view.female_y1_readonly"]);
    expect(hasPermission(asst, "leaders.view.female_y1_readonly")).toBe(true);
    expect(hasPermission(asst, "leaders.view.female_y1")).toBe(false);
  });
});

describe("hasPermission — status checks", () => {
  test("a pending user with the permission is denied (status gate)", () => {
    const pending = makeUser(["leaders.view"], "pending");
    expect(hasPermission(pending, "leaders.view")).toBe(false);
  });

  test("a suspended user with the permission is denied", () => {
    const suspended = makeUser(["leaders.view"], "suspended");
    expect(hasPermission(suspended, "leaders.view")).toBe(false);
  });

  test("a deactivated user with the permission is denied", () => {
    const deactivated = makeUser(["leaders.view"], "deactivated");
    expect(hasPermission(deactivated, "leaders.view")).toBe(false);
  });

  test("an active user with the permission is granted", () => {
    const active = makeUser(["leaders.view"], "active");
    expect(hasPermission(active, "leaders.view")).toBe(true);
  });

  test("a pending Super Admin is STILL denied (status beats bypass)", () => {
    // Important: the bypass is gated behind the status check. A pending super
    // admin should NOT be able to act. This test pins that contract.
    const pendingAdmin = makeUser(["admin.system"], "pending");
    expect(hasPermission(pendingAdmin, "leaders.view")).toBe(false);
  });
});

// ---------- hasAnyPermission ----------

describe("hasAnyPermission — semantics", () => {
  test("returns true if ANY of the listed permissions are held", () => {
    // treasurer has finance.manage; not leaders.manage.
    expect(hasAnyPermission(treasurer, "leaders.manage", "finance.manage")).toBe(true);
  });

  test("returns false if NONE of the listed permissions are held", () => {
    expect(hasAnyPermission(treasurer, "leaders.manage", "audit.view", "alumni.manage")).toBe(false);
  });

  test("returns true if the FIRST listed permission is held", () => {
    expect(hasAnyPermission(leaderViewer, "leaders.view", "audit.view")).toBe(true);
  });

  test("returns true if a LATER listed permission is held", () => {
    expect(hasAnyPermission(leaderViewer, "audit.view", "leaders.view")).toBe(true);
  });

  test("returns false for an empty perm list", () => {
    expect(hasAnyPermission(leaderViewer)).toBe(false);
  });

  test("returns false for a null user regardless of the listed perms", () => {
    expect(hasAnyPermission(null, "leaders.view", "finance.manage")).toBe(false);
  });

  test("admin.system bypass returns true for any list", () => {
    expect(hasAnyPermission(superAdmin, "leaders.view", "finance.manage")).toBe(true);
    // Even for perms Super Admin doesn't explicitly hold:
    expect(hasAnyPermission(superAdmin, "leaders.view", "admin.users")).toBe(true);
  });

  test("admin.system bypass returns true even for an empty list (defensive)", () => {
    // Per the source: bypass returns true before reaching the perms.some(...)
    // branch, so an empty list still passes. We pin this behaviour.
    expect(hasAnyPermission(superAdmin)).toBe(true);
  });

  test("a pending user is denied even if they hold a listed perm", () => {
    const pending = makeUser(["leaders.view", "finance.manage"], "pending");
    expect(hasAnyPermission(pending, "leaders.view", "finance.manage")).toBe(false);
  });
});

// ---------- hasAllPermissions ----------

describe("hasAllPermissions — semantics", () => {
  test("returns true only if ALL listed permissions are held", () => {
    expect(hasAllPermissions(president, "leaders.view", "leaders.manage", "finance.manage")).toBe(true);
  });

  test("returns false if at least one permission is missing", () => {
    // treasurer lacks audit.view.
    expect(hasAllPermissions(treasurer, "leaders.view", "finance.manage", "audit.view")).toBe(false);
  });

  test("returns true for a single held permission", () => {
    expect(hasAllPermissions(leaderViewer, "leaders.view")).toBe(true);
  });

  test("returns false for a single missing permission", () => {
    expect(hasAllPermissions(leaderViewer, "leaders.manage")).toBe(false);
  });

  test("returns true for an empty perm list (vacuous truth)", () => {
    // [].every(...) is true. This is consistent with mathematical convention
    // and matches the implementation (perms.every returns true on empty arrays).
    expect(hasAllPermissions(leaderViewer)).toBe(true);
  });

  test("returns false for a null user regardless of the listed perms (unless list is empty)", () => {
    expect(hasAllPermissions(null, "leaders.view", "finance.manage")).toBe(false);
  });

  test("admin.system bypass returns true for any list", () => {
    expect(hasAllPermissions(superAdmin, "leaders.view", "finance.manage", "audit.view")).toBe(true);
    // Even for perms not in the catalogue:
    expect(hasAllPermissions(superAdmin, "does.not.exist", "also.does.not.exist")).toBe(true);
  });

  test("a pending user is denied even if they hold all listed perms", () => {
    const pending = makeUser(["leaders.view", "finance.manage"], "pending");
    expect(hasAllPermissions(pending, "leaders.view", "finance.manage")).toBe(false);
  });
});

// ---------- Cross-helper consistency ----------

describe("Cross-helper consistency", () => {
  test("hasPermission(x) == hasAllPermissions(x) for a single perm", () => {
    for (const user of [superAdmin, leaderViewer, financeManager, treasurer, president, noPerms]) {
      expect(hasPermission(user, "leaders.view")).toBe(hasAllPermissions(user, "leaders.view"));
      expect(hasPermission(user, "finance.manage")).toBe(hasAllPermissions(user, "finance.manage"));
    }
  });

  test("hasPermission(x) <= hasAnyPermission(x) — any is at least as permissive", () => {
    for (const user of [superAdmin, leaderViewer, financeManager, treasurer, president, noPerms]) {
      const single = hasPermission(user, "leaders.view");
      const any = hasAnyPermission(user, "leaders.view");
      // If single is true, any must also be true.
      if (single) expect(any).toBe(true);
    }
  });

  test("hasAllPermissions(x, y) implies hasAnyPermission(x, y) when both perms are non-empty", () => {
    // If a user has ALL of {leaders.view, finance.manage} then they must have
    // ANY of them too (logical implication).
    const all = hasAllPermissions(president, "leaders.view", "finance.manage");
    const any = hasAnyPermission(president, "leaders.view", "finance.manage");
    expect(all).toBe(true);
    expect(any).toBe(true);
  });
});
