// POST /api/auth/login
// Proxies to the Express backend which verifies credentials and issues a JWT.
// On success, stores the JWT in a cookie so subsequent API calls can be
// forwarded to the backend with the Bearer token.

import { NextRequest } from "next/server";
import { backend } from "@/lib/backend-proxy";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = await backend.post<{ token: string; user: unknown }>(
      "/auth/login",
      body,
    );

    // Store the backend JWT in a cookie so client-side fetch calls can
    // forward it automatically.
    const response = Response.json(data, { status: 200 });
    response.headers.set(
      "Set-Cookie",
      `embuni-elc-backend-token=${data.token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${7 * 24 * 60 * 60}`,
    );
    return response;
  } catch (err) {
    const status = (err as { status?: number }).status ?? 500;
    const message = err instanceof Error ? err.message : "Login failed.";
    return Response.json({ error: message }, { status });
  }
}