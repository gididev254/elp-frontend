// PATCH /api/concerns/[id]/status — proxied to Express backend.

import { NextRequest } from "next/server";
import { proxyToBackend } from "@/app/api/_proxy";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyToBackend(req, `/concerns/${id}/status`, { method: "PATCH", body: await req.json().catch(() => undefined) });
}