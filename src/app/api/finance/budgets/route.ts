// GET/POST /api/finance/budgets — proxied to Express backend.

import { NextRequest } from "next/server";
import { proxyToBackend } from "@/app/api/_proxy";

export async function GET(req: NextRequest) {
  return proxyToBackend(req, "/finance/budgets", { method: "GET" });
}

export async function POST(req: NextRequest) {
  return proxyToBackend(req, "/finance/budgets", { method: "POST", body: await req.json().catch(() => undefined) });
}