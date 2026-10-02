// POST /api/auth/forgot-password — proxied to Express backend.

import { NextRequest } from "next/server";
import { proxyToBackend } from "@/app/api/_proxy";

export async function POST(req: NextRequest) {
  return proxyToBackend(req, "/auth/forgot-password", { method: "POST", body: await req.json().catch(() => undefined) });
}