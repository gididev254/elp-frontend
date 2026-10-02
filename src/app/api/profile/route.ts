// GET/PUT /api/profile — proxied to Express backend.
// Also PATCH /api/profile?password=true for self-service password change.

import { NextRequest } from "next/server";
import { backend } from "@/lib/backend-proxy";

function extractToken(req: NextRequest): string | undefined {
  const cookie = req.headers.get("cookie");
  if (!cookie) return undefined;
  const match = cookie.match(/(?:^|;\s*)embuni-elc-backend-token=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : undefined;
}

export async function GET(req: NextRequest) {
  const token = extractToken(req);
  try {
    const data = await backend.get<unknown>("/users/me", undefined, token);
    return Response.json(data);
  } catch (err) {
    const status = (err as { status?: number }).status ?? 500;
    return Response.json({ error: err instanceof Error ? err.message : "Failed" }, { status });
  }
}

export async function PUT(req: NextRequest) {
  const token = extractToken(req);
  try {
    const body = await req.json();
    const data = await backend.put<unknown>("/users/me", body, token);
    return Response.json(data);
  } catch (err) {
    const status = (err as { status?: number }).status ?? 500;
    return Response.json({ error: err instanceof Error ? err.message : "Failed" }, { status });
  }
}

export async function PATCH(req: NextRequest) {
  const token = extractToken(req);
  const url = new URL(req.url);
  const isPasswordChange = url.searchParams.get("password") === "true" || url.pathname.endsWith("/password");

  try {
    const body = await req.json();
    if (isPasswordChange) {
      const data = await backend.patch<unknown>("/users/me/password", body, token);
      return Response.json(data);
    }
    const data = await backend.patch<unknown>("/users/me", body, token);
    return Response.json(data);
  } catch (err) {
    const status = (err as { status?: number }).status ?? 500;
    return Response.json({ error: err instanceof Error ? err.message : "Failed" }, { status });
  }
}