// GET /api/attendance/event/[eventId] — proxied to Express backend.

import { NextRequest } from "next/server";
import { proxyToBackend } from "@/app/api/_proxy";

export async function GET(req: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  return proxyToBackend(req, `/attendance/event/${eventId}`, { method: "GET" });
}