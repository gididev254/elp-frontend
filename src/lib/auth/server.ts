// Server-side auth helpers for App Router route handlers and server components.

import { getServerSession } from "next-auth";
import { authOptions } from "./auth-options";
import { db } from "@/lib/db";
import { resolveUser, type ResolvedUser, hasPermission as rbacHasPermission } from "@/lib/rbac/server";
import { NextResponse } from "next/server";

export async function getSession() {
  return getServerSession(authOptions);
}

// Returns the resolved user (with permissions) or null if not authenticated.
export async function getCurrentUser(): Promise<ResolvedUser | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  return resolveUser(session.user.id);
}

// Require authentication. Returns { user, error? }. If error is set, return it.
export async function requireAuth(): Promise<
  { user: ResolvedUser } | { error: NextResponse }
> {
  const user = await getCurrentUser();
  if (!user) {
    return {
      error: NextResponse.json(
        { error: "Authentication required." },
        { status: 401 },
      ),
    };
  }
  if (user.status !== "active") {
    return {
      error: NextResponse.json(
        { error: `Account not active (status: ${user.status}).` },
        { status: 403 },
      ),
    };
  }
  return { user };
}

// Require a specific permission. Returns { user, error? }.
export async function requirePermission(
  permission: string,
): Promise<{ user: ResolvedUser } | { error: NextResponse }> {
  const auth = await requireAuth();
  if ("error" in auth) return auth;
  if (!rbacHasPermission(auth.user, permission)) {
    return {
      error: NextResponse.json(
        { error: "You do not have permission to perform this action." },
        { status: 403 },
      ),
    };
  }
  return auth;
}

// Require ANY of the listed permissions.
export async function requireAnyPermission(
  ...permissions: string[]
): Promise<{ user: ResolvedUser } | { error: NextResponse }> {
  const auth = await requireAuth();
  if ("error" in auth) return auth;
  const hasAny = permissions.some((p) => rbacHasPermission(auth.user, p));
  if (!hasAny) {
    return {
      error: NextResponse.json(
        { error: "You do not have permission to perform this action." },
        { status: 403 },
      ),
    };
  }
  return auth;
}

// Helper: record an audit log entry.
export async function recordAudit(params: {
  actorId?: string;
  action: string;
  target?: string;
  context?: Record<string, unknown>;
  ip?: string;
}) {
  try {
    await db.auditLog.create({
      data: {
        actorId: params.actorId,
        action: params.action,
        target: params.target,
        context: params.context ? JSON.stringify(params.context) : null,
        ip: params.ip,
      },
    });
  } catch (err) {
    // Audit failures must never break the request flow.
    console.error("[audit] failed to record:", err);
  }
}
