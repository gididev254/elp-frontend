// GET/POST /api/mentorship/[id]/sessions — proxied to Express backend.

import { NextRequest } from "next/server";
import { proxyToBackend } from "@/app/api/_proxy";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyToBackend(req, `/mentorship/${id}/sessions`, { method: "GET" });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyToBackend(req, `/mentorship/${id}/sessions`, { method: "POST", body: await req.json().catch(() => undefined) });
}