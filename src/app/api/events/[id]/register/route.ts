// POST /api/events/[id]/register — proxied to Express backend.

import { NextRequest } from "next/server";
import { proxyToBackend } from "@/app/api/_proxy";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyToBackend(req, `/events/${id}/register`, { method: "POST", body: await req.json().catch(() => undefined) });
}