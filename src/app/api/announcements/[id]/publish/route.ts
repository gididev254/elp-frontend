// POST /api/announcements/[id]/publish — proxied to Express backend.

import { NextRequest } from "next/server";
import { proxyToBackend } from "@/app/api/_proxy";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyToBackend(req, `/announcements/${id}/publish`, { method: "POST", body: await req.json().catch(() => undefined) });
}