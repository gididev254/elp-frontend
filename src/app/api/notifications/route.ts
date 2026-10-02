// GET /api/notifications — proxied to Express backend.

import { NextRequest } from "next/server";
import { proxyToBackend } from "@/app/api/_proxy";

export async function GET(req: NextRequest) {
  return proxyToBackend(req, "/notifications", { method: "GET" });
}