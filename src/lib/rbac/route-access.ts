// Embuni ELC — Pure route-access helpers.
// Extracted from `src/middleware.ts` so the routing decisions can be unit-tested
// without booting Next.js or next-auth.
//
// The middleware module re-exports these via the `authorized` callback; the
// behaviour is unchanged, the helpers are simply testable in isolation.

// Public, unauthenticated paths. Includes marketing pages, auth flows, and
// the public API endpoints (NextAuth handlers + public resource read endpoints).
// API routes that proxy to the backend are NOT listed here because the backend
// enforces its own RBAC independently — the middleware lets them through and
// the backend returns 401/403 as appropriate.
export const PUBLIC_PATHS: readonly string[] = [
  "/",
  "/about",
  "/programs",
  "/events",
  "/news",
  "/gallery",
  "/resources",
  "/contacts",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/api/auth",
  "/api/public",
] as const;

// Static asset prefixes that always pass — regardless of authentication state.
// Next.js handles these via the static file server; the middleware short-circuits.
export const STATIC_ASSET_PREFIXES: readonly string[] = [
  "/_next",
  "/favicon",
  "/images",
  "/documents",
  "/logos",
] as const;

// True if the pathname is on the public allowlist (exact match or nested under
// a public path). The empty / root path is treated as public.
export function isPublic(pathname: string): boolean {
  if (!pathname) return true;
  if (pathname === "/") return true;
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

// True if the pathname is a static asset prefix that should always pass.
//
// Uses loose `startsWith(prefix)` matching (mirrors the original middleware
// semantics) so that file-extension variants are caught — e.g. `/favicon.ico`,
// `/favicon-32x32.png`, `/_next/static/chunks/main.js`, `/_next/image`.
export function isStaticAssetPath(pathname: string): boolean {
  if (!pathname) return false;
  return STATIC_ASSET_PREFIXES.some((p) => pathname.startsWith(p));
}

// Pure decision function used by the `authorized` callback of `withAuth`.
// Returns true when the request may pass without authentication, false when a
// token is required.
//
// Mirrors the exact logic in `src/middleware.ts`:
//   1. Static asset prefixes always pass.
//   2. Public pathnames always pass.
//   3. Everything else requires a token.
export function isAuthorized(pathname: string, hasToken: boolean): boolean {
  if (isStaticAssetPath(pathname)) return true;
  if (isPublic(pathname)) return true;
  return hasToken;
}
