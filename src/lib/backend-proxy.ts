// HTTP client for proxying Next.js API routes to the Express backend.
// The backend is the authority for business rules and protected data operations.
// This client forwards the authenticated user's JWT so the backend can
// re-verify identity and enforce its own RBAC independently.

const BACKEND_URL = process.env.BACKEND_URL;
if (!BACKEND_URL) {
  throw new Error("BACKEND_URL environment variable is required");
}

type ProxyOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  query?: Record<string, string>;
  headers?: Record<string, string>;
  token?: string; // optional JWT override
};

export class BackendProxy {
  constructor(private baseUrl: string = BACKEND_URL) {}

  async request<T>(path: string, options: ProxyOptions = {}): Promise<T> {
    const url = new URL(`${this.baseUrl}/api${path}`);
    if (options.query) {
      for (const [k, v] of Object.entries(options.query)) {
        url.searchParams.set(k, v);
      }
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...options.headers,
    };

    // Forward the JWT as a Bearer token so the backend can authenticate.
    if (options.token) {
      headers["Authorization"] = `Bearer ${options.token}`;
    }

    const init: RequestInit = {
      method: options.method ?? "GET",
      headers,
      credentials: "include",
    };

    if (options.body !== undefined) {
      init.body = JSON.stringify(options.body);
    }

    const res = await fetch(url.toString(), init);
    const text = await res.text();
    let data: unknown;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { error: text || `HTTP ${res.status}` };
    }

    if (!res.ok) {
      const err = new Error(
        (data as { error?: string })?.error ?? `Backend request failed: ${res.status}`,
      );
      (err as any).status = res.status;
      if ((data as { details?: unknown }).details) {
        (err as any).details = (data as { details?: unknown }).details;
      }
      throw err;
    }

    return data as T;
  }

  get<T>(path: string, query?: Record<string, string>, token?: string) {
    return this.request<T>(path, { method: "GET", query, token });
  }
  post<T>(path: string, body?: unknown, token?: string) {
    return this.request<T>(path, { method: "POST", body, token });
  }
  put<T>(path: string, body?: unknown, token?: string) {
    return this.request<T>(path, { method: "PUT", body, token });
  }
  patch<T>(path: string, body?: unknown, token?: string) {
    return this.request<T>(path, { method: "PATCH", body, token });
  }
  delete<T>(path: string, token?: string) {
    return this.request<T>(path, { method: "DELETE", token });
  }
}

export const backend = new BackendProxy();

// Helper: get the backend JWT from the NextAuth session cookie if present.
// The login flow stores it in a separate cookie; we read it via this helper.
export function getStoredBackendToken(): string | undefined {
  // The token is stored in a cookie named "embuni-elc-backend-token".
  // We can't read cookies server-side without the request context, so
  // client-side callers should pass the token explicitly.
  if (typeof document === "undefined") return undefined;
  const match = document.cookie.match(/(?:^|;\s*)embuni-elc-backend-token=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : undefined;
}