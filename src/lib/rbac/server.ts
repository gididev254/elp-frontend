// Embuni ELC — Server-side RBAC helpers.
// Used by API route handlers and server components to enforce permissions.
//
// The permission set for a user is loaded from the DB (UserRole → Role →
// RolePermission → Permission) and cached in-memory for the request lifetime.

import { db } from "@/lib/db";
import type { User } from "@prisma/client";

export interface ResolvedUser {
  id: string;
  email: string;
  name: string | null;
  roleKeys: string[]; // all assigned role keys
  primaryRole: string | null; // first executive/admin role, or LEADER
  permissions: Set<string>; // flattened permission keys
  status: string;
}

// In-request cache to avoid repeated DB hits for the same user.
const cache = new Map<string, { user: ResolvedUser; expires: number }>();
const TTL_MS = 30_000; // 30s

export function invalidateUserCache(userId: string) {
  cache.delete(userId);
}

export async function resolveUser(
  userId: string | undefined | null,
): Promise<ResolvedUser | null> {
  if (!userId) return null;

  const cached = cache.get(userId);
  if (cached && cached.expires > Date.now()) {
    return cached.user;
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      status: true,
      profile: { select: { fullName: true, preferredName: true } },
      userRoles: {
        include: {
          role: {
            include: {
              permissions: { include: { permission: true } },
            },
          },
        },
      },
    },
  });

  if (!user) return null;

  const roleKeys = user.userRoles.map((ur) => ur.role.key);
  const permissions = new Set<string>();
  for (const ur of user.userRoles) {
    for (const rp of ur.role.permissions) {
      permissions.add(rp.permission.key);
    }
  }

  // Determine primary role: prefer SUPER_ADMIN > executive roles > LEADER.
  let primaryRole: string | null = null;
  if (roleKeys.includes("SUPER_ADMIN")) {
    primaryRole = "SUPER_ADMIN";
  } else {
    const execRoles = [
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
    primaryRole = execRoles.find((r) => roleKeys.includes(r)) ?? "LEADER";
  }

  const resolved: ResolvedUser = {
    id: user.id,
    email: user.email,
    name: user.profile?.preferredName || user.profile?.fullName || null,
    roleKeys,
    primaryRole,
    permissions,
    status: user.status,
  };

  cache.set(userId, { user: resolved, expires: Date.now() + TTL_MS });
  return resolved;
}

// Check if a resolved user has a permission.
export function hasPermission(user: ResolvedUser | null, permission: string): boolean {
  if (!user) return false;
  if (user.status !== "active") return false;
  if (user.permissions.has("admin.system")) return true; // super admin bypass
  return user.permissions.has(permission);
}

// Check ANY of the listed permissions.
export function hasAnyPermission(user: ResolvedUser | null, ...perms: string[]): boolean {
  if (!user) return false;
  if (user.status !== "active") return false;
  if (user.permissions.has("admin.system")) return true;
  return perms.some((p) => user.permissions.has(p));
}

// Check ALL of the listed permissions.
export function hasAllPermissions(user: ResolvedUser | null, ...perms: string[]): boolean {
  if (!user) return false;
  if (user.status !== "active") return false;
  if (user.permissions.has("admin.system")) return true;
  return perms.every((p) => user.permissions.has(p));
}

// For Year-1 Rep scoping: resolve the leader filter the current user is allowed to see.
// Returns a Prisma `where` object fragment to be spread into a leader/profile query.
export function getLeaderScopeFilter(user: ResolvedUser | null): {
  gender?: string;
  yearOfStudy?: number;
  restrictToCohort: boolean;
  readOnly: boolean;
} {
  if (!user) return { restrictToCohort: true, readOnly: true };
  // Super admin & executives with leaders.view (all) see everyone.
  if (user.permissions.has("admin.system") || user.permissions.has("leaders.view")) {
    return { restrictToCohort: false, readOnly: false };
  }
  if (user.permissions.has("leaders.view.male_y1")) {
    return { gender: "male", yearOfStudy: 1, restrictToCohort: true, readOnly: false };
  }
  if (user.permissions.has("leaders.view.female_y1")) {
    return { gender: "female", yearOfStudy: 1, restrictToCohort: true, readOnly: false };
  }
  if (user.permissions.has("leaders.view.female_y1_readonly")) {
    return { gender: "female", yearOfStudy: 1, restrictToCohort: true, readOnly: true };
  }
  // Leader with no leaders.view at all — can only see self.
  return { restrictToCohort: true, readOnly: true };
}

export type { User };
