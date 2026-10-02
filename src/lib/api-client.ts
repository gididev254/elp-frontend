// Client-side fetch wrapper that automatically attaches the backend JWT.
// Use this in client components instead of raw `fetch` for API calls.

function getCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : undefined;
}

export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = getCookie("embuni-elc-backend-token");
  const headers = new Headers(init.headers);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (!headers.has("Content-Type") && init.body && typeof init.body === "string") {
    headers.set("Content-Type", "application/json");
  }
  return fetch(`/api${path}`, { ...init, headers });
}

export function useApiFetch() {
  return apiFetch;
}