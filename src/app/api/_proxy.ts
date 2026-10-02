// Shared helper for proxying Next.js API routes to the Express backend.
// Reads the backend JWT from the request cookie and forwards it as a
// Bearer token so the backend can re-verify identity and enforce RBAC.

import { NextRequest, NextResponse } from "next/server";
import { backend } from "@/lib/backend-proxy";

function extractToken(req: NextRequest): string | undefined {
  const cookie = req.headers.get("cookie");
  if (!cookie) return undefined;
  const match = cookie.match(/(?:^|;\s*)embuni-elc-backend-token=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : undefined;
}

export async function proxyToBackend<T>(
  req: NextRequest,
  path: string,
  options: { method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"; body?: unknown } = {},
): Promise<NextResponse> {
  const token = extractToken(req);
  const method = options.method ?? "GET";

  try {
    let data: T;
    if (method === "GET") {
      // Forward query string params.
      const url = new URL(req.url);
      const query: Record<string, string> = {};
      url.searchParams.forEach((v, k) => (query[k] = v));
      data = await backend.get<T>(path, query, token);
    } else if (method === "POST") {
      let body: unknown = options.body;
      if (body === undefined) {
        if (req.headers.get("content-type")?.includes("multipart/form-data")) {
          // For multipart uploads, forward the FormData directly.
          body = await req.formData();
          const res = await fetch(`${backend["baseUrl"]}/api${path}`, {
            method: "POST",
            body: body as FormData,
            headers: { Authorization: `Bearer ${token}` },
          });
          const text = await res.text();
          try {
            data = text ? JSON.parse(text) : null;
          } catch {
            data = { error: text || `HTTP ${res.status}` };
          }
          if (!res.ok) {
            return NextResponse.json(data, { status: res.status });
          }
        } else {
          body = await req.json().catch(() => undefined);
        }
      }
      data = await backend.post<T>(path, body, token);
    } else if (method === "PUT") {
      const body = options.body ?? (await req.json().catch(() => undefined));
      data = await backend.put<T>(path, body, token);
    } else if (method === "PATCH") {
      const body = options.body ?? (await req.json().catch(() => undefined));
      data = await backend.patch<T>(path, body, token);
    } else if (method === "DELETE") {
      data = await backend.delete<T>(path, token);
    } else {
      return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
    }

    return NextResponse.json(data, { status: 200 });
  } catch (err) {
    const status = (err as { status?: number }).status ?? 500;
    const message = err instanceof Error ? err.message : "Backend request failed.";
    return NextResponse.json({ error: message }, { status });
  }
}