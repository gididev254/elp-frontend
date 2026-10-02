// POST /api/notifications/read-all — proxied to Express backend.

import { NextRequest } from "next/server";
import { proxyToBackend } from "@/app/api/_proxy";

export async function POST(req: NextRequest) {
  return proxyToBackend(req, "/notifications/read-all", { method: "POST", body: await req.json().catch(() => undefined) });
}