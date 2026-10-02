// GET/PUT/DELETE /api/mentorship/sessions/[id] — proxied to Express backend.

import { NextRequest } from "next/server";
import { proxyToBackend } from "@/app/api/_proxy";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyToBackend(req, `/mentorship/sessions/${id}`, { method: "GET" });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyToBackend(req, `/mentorship/sessions/${id}`, { method: "PUT", body: await req.json().catch(() => undefined) });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyToBackend(req, `/mentorship/sessions/${id}`, { method: "DELETE" });
}