// GET /api/events/[id]/attendance — proxied to Express backend.
// Returns { event, attendance, eligibleLeaders, registeredCount, scope,
// canManage, canDelete, currentUserId } for the event.
// (The frontend's attendance-manager.tsx calls this with GET; the POST
//  mutation path is /api/attendance/bulk, proxied separately.)

import { NextRequest } from "next/server";
import { proxyToBackend } from "@/app/api/_proxy";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyToBackend(req, `/attendance/event/${id}`, { method: "GET" });
}