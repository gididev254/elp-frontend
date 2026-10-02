// POST /api/attendance/bulk — proxied to Express backend.
// The frontend's attendance-manager "Save" button POSTs
// { eventId, records: [{ userId, status, note }] } here.

import { NextRequest } from "next/server";
import { proxyToBackend } from "@/app/api/_proxy";

export async function POST(req: NextRequest) {
  return proxyToBackend(req, "/attendance/bulk", {
    method: "POST",
    body: await req.json().catch(() => undefined),
  });
}