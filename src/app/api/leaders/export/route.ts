// POST /api/leaders/export — proxied to Express backend.
// Returns a CSV file download. The backend sends the file directly, so we
// forward the raw response with appropriate headers.

import { NextRequest } from "next/server";

function extractToken(req: NextRequest): string | undefined {
  const cookie = req.headers.get("cookie");
  if (!cookie) return undefined;
  const match = cookie.match(/(?:^|;\s*)embuni-elc-backend-token=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : undefined;
}

export async function POST(req: NextRequest) {
  const token = extractToken(req);
  const BACKEND_URL = process.env.BACKEND_URL;
  if (!BACKEND_URL) {
    return Response.json({ error: "BACKEND_URL not configured" }, { status: 500 });
  }

  try {
    const res = await fetch(`${BACKEND_URL}/api/leaders/export`, {
      method: "POST",
      headers: {
        Authorization: token ? `Bearer ${token}` : "",
      },
    });

    if (!res.ok) {
      const text = await res.text();
      let data: unknown;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        data = { error: text || `HTTP ${res.status}` };
      }
      return Response.json(data, { status: res.status });
    }

    // Forward the CSV file with its original headers.
    const csv = await res.arrayBuffer();
    const response = new Response(csv, { status: 200 });
    response.headers.set("Content-Type", res.headers.get("Content-Type") ?? "text/csv; charset=utf-8");
    response.headers.set(
      "Content-Disposition",
      res.headers.get("Content-Disposition") ?? 'attachment; filename="leaders.csv"',
    );
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Export failed" },
      { status: 500 },
    );
  }
}