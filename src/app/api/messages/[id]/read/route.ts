// POST /api/messages/[id]/read — proxied to Express backend.

import { NextRequest } from "next/server";
import { proxyToBackend } from "@/app/api/_proxy";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyToBackend(req, `/messages/${id}/read`, { method: "POST", body: await req.json().catch(() => undefined) });
}