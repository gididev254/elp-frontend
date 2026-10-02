// Embuni ELC — Year-1 Rep cohort scoping tests.
// Task ID: P6.
//
// These tests verify `getLeaderScopeFilter` — the function that produces the
// Prisma `where` fragment applied to leader/profile queries. It is the single
// enforcement point for the cohort-isolation rule:
//
//   Male Y1 Rep           → only Male Year-1 leaders (read+write)
//   Female Y1 Rep         → only Female Year-1 leaders (read+write)
//   Asst. Female Y1 Rep   → only Female Year-1 leaders (read-only)
//   President / Super Admin / executives with leaders.view → everyone (read+write)
//   Leader without any leaders.view* perm → only self (read-only)
//
// We mock the `ResolvedUser` interface directly so these tests run with zero
// database or network dependencies.

import { test, expect, describe } from "bun:test";
import { getLeaderScopeFilter, type ResolvedUser } from "../server";

// ---------- Mock user factory ----------
//
// `ResolvedUser` carries a `permissions: Set<string>` and a `status: string`.
// The `getLeaderScopeFilter` function only consults those two fields plus the
// user's existence, so we only need to populate those.

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

// Convenience builders for the common role archetypes.
const superAdmin = makeUser(["admin.system"]);
const president = makeUser(["leaders.view", "leaders.manage"]);
const maleY1Rep = makeUser(["leaders.view.male_y1"]);
const femaleY1Rep = makeUser(["leaders.view.female_y1"]);
const assistantFemaleY1Rep = makeUser(["leaders.view.female_y1_readonly"]);
const plainLeader = makeUser([]); // no leaders.view* — COMMON set is irrelevant here

// ---------- Null / unauthenticated ----------

describe("getLeaderScopeFilter — null user", () => {
  test("returns restrictToCohort=true and readOnly=true for a null user", () => {
    const filter = getLeaderScopeFilter(null);
    expect(filter).toEqual({ restrictToCohort: true, readOnly: true });
  });

  test("does not return a gender filter for null user", () => {
    const filter = getLeaderScopeFilter(null);
    expect(filter.gender).toBeUndefined();
    expect(filter.yearOfStudy).toBeUndefined();
  });
});

// ---------- Super Admin & President (full visibility) ----------

describe("getLeaderScopeFilter — unscoped users", () => {
  test("Super Admin (admin.system) sees everyone — restrictToCohort=false", () => {
    const filter = getLeaderScopeFilter(superAdmin);
    expect(filter.restrictToCohort).toBe(false);
    expect(filter.readOnly).toBe(false);
    expect(filter.gender).toBeUndefined();
    expect(filter.yearOfStudy).toBeUndefined();
  });

  test("President (leaders.view) sees everyone — restrictToCohort=false", () => {
    const filter = getLeaderScopeFilter(president);
    expect(filter.restrictToCohort).toBe(false);
    expect(filter.readOnly).toBe(false);
    expect(filter.gender).toBeUndefined();
    expect(filter.yearOfStudy).toBeUndefined();
  });

  test("admin.system bypass takes precedence over leaders.view", () => {
    // A user with BOTH admin.system and leaders.view should hit the admin.system
    // branch first (which returns the same result, but the test documents intent).
    const both = makeUser(["admin.system", "leaders.view"]);
    const filter = getLeaderScopeFilter(both);
    expect(filter.restrictToCohort).toBe(false);
  });
});

// ---------- Male Y1 Rep ----------

describe("getLeaderScopeFilter — Male Y1 Rep", () => {
  test("Male Y1 Rep is restricted to male, year 1, read+write", () => {
    const filter = getLeaderScopeFilter(maleY1Rep);
    expect(filter).toEqual({
      gender: "male",
      yearOfStudy: 1,
      restrictToCohort: true,
      readOnly: false,
    });
  });

  test("Male Y1 Rep gender is exactly 'male'", () => {
    expect(getLeaderScopeFilter(maleY1Rep).gender).toBe("male");
  });

  test("Male Y1 Rep yearOfStudy is exactly 1", () => {
    expect(getLeaderScopeFilter(maleY1Rep).yearOfStudy).toBe(1);
  });

  test("Male Y1 Rep cannot write to other cohorts (readOnly=false is for their OWN cohort only)", () => {
    const filter = getLeaderScopeFilter(maleY1Rep);
    expect(filter.restrictToCohort).toBe(true);
  });
});

// ---------- Female Y1 Rep ----------

describe("getLeaderScopeFilter — Female Y1 Rep", () => {
  test("Female Y1 Rep is restricted to female, year 1, read+write", () => {
    const filter = getLeaderScopeFilter(femaleY1Rep);
    expect(filter).toEqual({
      gender: "female",
      yearOfStudy: 1,
      restrictToCohort: true,
      readOnly: false,
    });
  });

  test("Female Y1 Rep gender is exactly 'female'", () => {
    expect(getLeaderScopeFilter(femaleY1Rep).gender).toBe("female");
  });

  test("Female Y1 Rep yearOfStudy is exactly 1", () => {
    expect(getLeaderScopeFilter(femaleY1Rep).yearOfStudy).toBe(1);
  });

  test("Male Y1 Rep and Female Y1 Rep produce mutually exclusive filters", () => {
    const maleFilter = getLeaderScopeFilter(maleY1Rep);
    const femaleFilter = getLeaderScopeFilter(femaleY1Rep);
    expect(maleFilter.gender).not.toBe(femaleFilter.gender);
    expect(maleFilter.gender).toBe("male");
    expect(femaleFilter.gender).toBe("female");
  });
});

// ---------- Assistant Female Y1 Rep (read-only) ----------

describe("getLeaderScopeFilter — Assistant Female Y1 Rep (read-only)", () => {
  test("Assistant Female Y1 Rep is restricted to female, year 1, READ-ONLY", () => {
    const filter = getLeaderScopeFilter(assistantFemaleY1Rep);
    expect(filter).toEqual({
      gender: "female",
      yearOfStudy: 1,
      restrictToCohort: true,
      readOnly: true,
    });
  });

  test("Assistant Female Y1 Rep has readOnly=true (cannot mutate)", () => {
    expect(getLeaderScopeFilter(assistantFemaleY1Rep).readOnly).toBe(true);
  });

  test("Assistant Female Y1 Rep has the same cohort as Female Y1 Rep (female, year 1)", () => {
    const assistant = getLeaderScopeFilter(assistantFemaleY1Rep);
    const full = getLeaderScopeFilter(femaleY1Rep);
    expect(assistant.gender).toBe(full.gender);
    expect(assistant.yearOfStudy).toBe(full.yearOfStudy);
    expect(assistant.restrictToCohort).toBe(full.restrictToCohort);
    // But the read/write flag differs — assistant is read-only.
    expect(assistant.readOnly).toBe(true);
    expect(full.readOnly).toBe(false);
  });
});

// ---------- Plain Leader (self-only) ----------

describe("getLeaderScopeFilter — Leader without leaders.view", () => {
  test("A Leader with no leaders.view* permission is restricted and read-only (can only see self)", () => {
    const filter = getLeaderScopeFilter(plainLeader);
    expect(filter.restrictToCohort).toBe(true);
    expect(filter.readOnly).toBe(true);
    expect(filter.gender).toBeUndefined();
    expect(filter.yearOfStudy).toBeUndefined();
  });

  test("A Leader with only unrelated permissions (e.g. reports.view) is still self-only for leaders", () => {
    // Per roles.ts: the COMMON set does NOT include any leaders.view* perm,
    // so a plain Leader falls into the catch-all self-only branch even if they
    // happen to hold other module perms via additional roles.
    const leaderWithReports = makeUser(["dashboard.view", "reports.view"]);
    const filter = getLeaderScopeFilter(leaderWithReports);
    expect(filter.restrictToCohort).toBe(true);
    expect(filter.readOnly).toBe(true);
  });
});

// ---------- Status / inactive users ----------

describe("getLeaderScopeFilter — inactive users", () => {
  test("a pending Male Y1 Rep still receives the male_y1 filter (status is checked elsewhere)", () => {
    // getLeaderScopeFilter does NOT consult `status` — that's an intentional
    // design choice: the auth layer (requireAuth) rejects non-active users
    // BEFORE getLeaderScopeFilter is consulted. We verify that here so the
    // contract is explicit.
    const pendingMaleRep = makeUser(["leaders.view.male_y1"], "pending");
    const filter = getLeaderScopeFilter(pendingMaleRep);
    expect(filter).toEqual({
      gender: "male",
      yearOfStudy: 1,
      restrictToCohort: true,
      readOnly: false,
    });
  });
});

// ---------- Precedence ----------

describe("getLeaderScopeFilter — permission precedence", () => {
  test("admin.system bypass wins over any cohort-scoped perm", () => {
    // A user who somehow holds both admin.system and a y1 scoped perm should
    // be treated as Super Admin (unscoped).
    const mixed = makeUser(["admin.system", "leaders.view.male_y1"]);
    const filter = getLeaderScopeFilter(mixed);
    expect(filter.restrictToCohort).toBe(false);
    expect(filter.gender).toBeUndefined();
  });

  test("global leaders.view wins over cohort-scoped perms", () => {
    // A user with both leaders.view and leaders.view.male_y1 should see everyone.
    const mixed = makeUser(["leaders.view", "leaders.view.male_y1"]);
    const filter = getLeaderScopeFilter(mixed);
    expect(filter.restrictToCohort).toBe(false);
    expect(filter.gender).toBeUndefined();
  });

  test("male_y1 takes precedence over female_y1_readonly when both are present", () => {
    // This is an edge case — the function checks male_y1 first. The result
    // documents the precedence order: male_y1 > female_y1 > female_y1_readonly.
    // (In practice no role holds two of these, but we lock the precedence here.)
    const mixed = makeUser(["leaders.view.male_y1", "leaders.view.female_y1_readonly"]);
    const filter = getLeaderScopeFilter(mixed);
    expect(filter.gender).toBe("male");
    expect(filter.readOnly).toBe(false);
  });

  test("female_y1 (full) takes precedence over female_y1_readonly", () => {
    const mixed = makeUser(["leaders.view.female_y1", "leaders.view.female_y1_readonly"]);
    const filter = getLeaderScopeFilter(mixed);
    expect(filter.gender).toBe("female");
    expect(filter.readOnly).toBe(false); // full access wins over readonly
  });
});
