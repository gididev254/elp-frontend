// GET/POST /api/mentorship — proxied to Express backend.

import { NextRequest } from "next/server";
import { proxyToBackend } from "@/app/api/_proxy";

export async function GET(req: NextRequest) {
  return proxyToBackend(req, "/mentorship", { method: "GET" });
}

export async function POST(req: NextRequest) {
  return proxyToBackend(req, "/mentorship", { method: "POST", body: await req.json().catch(() => undefined) });
}