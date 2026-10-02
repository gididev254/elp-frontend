// GET /api/leaders — proxied to Express backend.
// The backend enforces cohort scoping at the service layer.

import { NextRequest } from "next/server";
import { proxyToBackend } from "@/app/api/_proxy";

export async function GET(req: NextRequest) {
  return proxyToBackend(req, "/leaders", { method: "GET" });
}