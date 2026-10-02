// PATCH /api/leaders/[id] — proxied to Express backend.

import { NextRequest } from "next/server";
import { backend } from "@/lib/backend-proxy";

function extractToken(req: NextRequest): string | undefined {
  const cookie = req.headers.get("cookie");
  if (!cookie) return undefined;
  const match = cookie.match(/(?:^|;\s*)embuni-elc-backend-token=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : undefined;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = extractToken(req);
  try {
    const body = await req.json().catch(() => undefined);
    const data = await backend.patch<unknown>(`/leaders/${id}`, body, token);
    return Response.json(data);
  } catch (err) {
    const status = (err as { status?: number }).status ?? 500;
    return Response.json({ error: err instanceof Error ? err.message : "Failed" }, { status });
  }
}