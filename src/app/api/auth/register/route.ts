// POST /api/auth/register — proxied to Express backend.

import { NextRequest } from "next/server";
import { proxyToBackend } from "@/app/api/_proxy";

export async function POST(req: NextRequest) {
  return proxyToBackend(req, "/auth/register", {
    method: "POST",
    body: await req.json().catch(() => undefined),
  });
}