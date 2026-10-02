// Embuni ELC — Route protection tests (middleware logic).
// Task ID: P6.
//
// These tests verify the pure routing decisions used by `src/middleware.ts`.
// The middleware module wires those decisions into next-auth's `withAuth`
// wrapper; the underlying logic lives in `src/lib/rbac/route-access.ts` and is
// imported here directly so the tests run without booting Next.js.
//
// Three categories are exercised:
//
//   1. Public routes (/, /about, /programs, …) — accessible without a token.
//   2. Protected routes (/dashboard, /profile, /api/leaders, …) — require a
//      token; unauthenticated requests are redirected to /login.
//   3. Static asset prefixes (/_next, /images, /documents, /favicon) — always
//      pass, regardless of auth state.

import { test, expect, describe } from "bun:test";
import {
  PUBLIC_PATHS,
  STATIC_ASSET_PREFIXES,
  isPublic,
  isStaticAssetPath,
  isAuthorized,
} from "@/lib/rbac/route-access";

// ---------- Public path catalogue ----------

describe("PUBLIC_PATHS catalogue", () => {
  test("includes the marketing pages", () => {
    for (const p of ["/", "/about", "/programs", "/events", "/news", "/gallery", "/resources", "/contacts"]) {
      expect(PUBLIC_PATHS).toContain(p);
    }
  });

  test("includes the auth flow pages", () => {
    for (const p of ["/login", "/register", "/forgot-password", "/reset-password"]) {
      expect(PUBLIC_PATHS).toContain(p);
    }
  });

  test("includes the public API mount points", () => {
    expect(PUBLIC_PATHS).toContain("/api/auth");
    expect(PUBLIC_PATHS).toContain("/api/public");
  });

  test("does NOT include protected dashboard routes", () => {
    expect(PUBLIC_PATHS).not.toContain("/dashboard");
    expect(PUBLIC_PATHS).not.toContain("/profile");
    expect(PUBLIC_PATHS).not.toContain("/settings");
  });

  test("does NOT include protected API mounts", () => {
    expect(PUBLIC_PATHS).not.toContain("/api/leaders");
    expect(PUBLIC_PATHS).not.toContain("/api/finance");
  });
});

// ---------- isPublic ----------

describe("isPublic — root and exact matches", () => {
  test("the root path is public", () => {
    expect(isPublic("/")).toBe(true);
  });

  test("each declared PUBLIC_PATH is public", () => {
    for (const p of PUBLIC_PATHS) {
      expect(isPublic(p)).toBe(true);
    }
  });

  test("the auth pages are public", () => {
    expect(isPublic("/login")).toBe(true);
    expect(isPublic("/register")).toBe(true);
    expect(isPublic("/forgot-password")).toBe(true);
    expect(isPublic("/reset-password")).toBe(true);
  });

  test("the marketing pages are public", () => {
    expect(isPublic("/about")).toBe(true);
    expect(isPublic("/programs")).toBe(true);
    expect(isPublic("/events")).toBe(true);
    expect(isPublic("/news")).toBe(true);
    expect(isPublic("/gallery")).toBe(true);
    expect(isPublic("/resources")).toBe(true);
    expect(isPublic("/contacts")).toBe(true);
  });
});

describe("isPublic — nested public paths", () => {
  test("public pages accept nested sub-paths (e.g. /programs/[slug])", () => {
    expect(isPublic("/programs/some-program-slug")).toBe(true);
    expect(isPublic("/events/some-event-slug")).toBe(true);
    expect(isPublic("/news/some-news-slug")).toBe(true);
  });

  test("/api/auth/* is public (NextAuth callback handlers)", () => {
    expect(isPublic("/api/auth/signin")).toBe(true);
    expect(isPublic("/api/auth/callback/credentials")).toBe(true);
    expect(isPublic("/api/auth/session")).toBe(true);
    expect(isPublic("/api/auth/csrf")).toBe(true);
  });

  test("/api/public/* is public", () => {
    expect(isPublic("/api/public/leaders")).toBe(true);
    expect(isPublic("/api/public/events")).toBe(true);
  });

  test("an empty pathname is treated as public (defensive)", () => {
    expect(isPublic("")).toBe(true);
  });
});

describe("isPublic — protected routes", () => {
  test("dashboard routes are NOT public", () => {
    expect(isPublic("/dashboard")).toBe(false);
    expect(isPublic("/dashboard/leaders")).toBe(false);
    expect(isPublic("/dashboard/finance")).toBe(false);
  });

  test("account routes are NOT public", () => {
    expect(isPublic("/profile")).toBe(false);
    expect(isPublic("/settings")).toBe(false);
    expect(isPublic("/attendance")).toBe(false);
  });

  test("protected API routes are NOT public", () => {
    expect(isPublic("/api/leaders")).toBe(false);
    expect(isPublic("/api/finance")).toBe(false);
    expect(isPublic("/api/admin/users")).toBe(false);
    expect(isPublic("/api/audit")).toBe(false);
    expect(isPublic("/api/notifications")).toBe(false);
    expect(isPublic("/api/attendance")).toBe(false);
  });

  test("a path that merely STARTS WITH a public prefix but is NOT nested under it is NOT public", () => {
    // /loginpage is NOT /login (it doesn't start with "/login/").
    // This guards against a common typo where a public path is used as a
    // string prefix and accidentally whitelists a similar-looking route.
    expect(isPublic("/loginpage")).toBe(false);
    expect(isPublic("/aboutus")).toBe(false);
    expect(isPublic("/programsx")).toBe(false);
  });

  test("/api/authxxx is NOT public (only /api/auth/* is)", () => {
    // /api/auth is public, but /api/authentication is NOT (different prefix).
    expect(isPublic("/api/authentication")).toBe(false);
    expect(isPublic("/api/authz")).toBe(false);
  });

  test("/api/publicxxx is NOT public (only /api/public/* is)", () => {
    expect(isPublic("/api/publications")).toBe(false);
  });
});

// ---------- Static asset prefixes ----------

describe("STATIC_ASSET_PREFIXES catalogue", () => {
  test("includes _next, favicon, images, documents", () => {
    expect(STATIC_ASSET_PREFIXES).toContain("/_next");
    expect(STATIC_ASSET_PREFIXES).toContain("/favicon");
    expect(STATIC_ASSET_PREFIXES).toContain("/images");
    expect(STATIC_ASSET_PREFIXES).toContain("/documents");
  });
});

describe("isStaticAssetPath", () => {
  test("returns true for each declared prefix", () => {
    for (const p of STATIC_ASSET_PREFIXES) {
      expect(isStaticAssetPath(p)).toBe(true);
    }
  });

  test("returns true for nested asset paths", () => {
    expect(isStaticAssetPath("/_next/static/chunks/main.js")).toBe(true);
    expect(isStaticAssetPath("/_next/image")).toBe(true);
    expect(isStaticAssetPath("/favicon.ico")).toBe(true);
    expect(isStaticAssetPath("/images/avatars/avatar-1.png")).toBe(true);
    expect(isStaticAssetPath("/documents/policy.pdf")).toBe(true);
  });

  test("returns false for non-asset paths", () => {
    expect(isStaticAssetPath("/dashboard")).toBe(false);
    expect(isStaticAssetPath("/api/leaders")).toBe(false);
    expect(isStaticAssetPath("/login")).toBe(false);
    expect(isStaticAssetPath("/")).toBe(false);
  });

  test("returns false for an empty pathname", () => {
    expect(isStaticAssetPath("")).toBe(false);
  });

  test("uses loose prefix matching (matches original middleware semantics)", () => {
    // The middleware intentionally uses `startsWith(prefix)` for static assets
    // so that file-extension variants are caught without enumerating each one
    // (e.g. `/favicon.ico`, `/favicon-32x32.png`, `/_next/static/chunks/main.js`).
    // This means `/_nextstatic` is ALSO caught — a harmless false-positive
    // because no real route starts with `/_nextstatic`.
    expect(isStaticAssetPath("/_nextstatic")).toBe(true);
    expect(isStaticAssetPath("/imagesfoo")).toBe(true);
  });
});

// ---------- isAuthorized — the composite decision ----------

describe("isAuthorized — public routes (no token required)", () => {
  test("public marketing pages are authorized without a token", () => {
    expect(isAuthorized("/", false)).toBe(true);
    expect(isAuthorized("/about", false)).toBe(true);
    expect(isAuthorized("/programs", false)).toBe(true);
    expect(isAuthorized("/events", false)).toBe(true);
    expect(isAuthorized("/news", false)).toBe(true);
    expect(isAuthorized("/gallery", false)).toBe(true);
    expect(isAuthorized("/resources", false)).toBe(true);
    expect(isAuthorized("/contacts", false)).toBe(true);
  });

  test("auth flow pages are authorized without a token", () => {
    expect(isAuthorized("/login", false)).toBe(true);
    expect(isAuthorized("/register", false)).toBe(true);
    expect(isAuthorized("/forgot-password", false)).toBe(true);
    expect(isAuthorized("/reset-password", false)).toBe(true);
  });

  test("public API routes are authorized without a token", () => {
    expect(isAuthorized("/api/auth/signin", false)).toBe(true);
    expect(isAuthorized("/api/auth/callback/credentials", false)).toBe(true);
    expect(isAuthorized("/api/public/leaders", false)).toBe(true);
  });
});

describe("isAuthorized — protected routes (token required)", () => {
  test("dashboard routes redirect to /login without a token", () => {
    expect(isAuthorized("/dashboard", false)).toBe(false);
    expect(isAuthorized("/dashboard/leaders", false)).toBe(false);
    expect(isAuthorized("/dashboard/finance", false)).toBe(false);
    expect(isAuthorized("/dashboard/admin/users", false)).toBe(false);
  });

  test("account routes redirect to /login without a token", () => {
    expect(isAuthorized("/profile", false)).toBe(false);
    expect(isAuthorized("/settings", false)).toBe(false);
    expect(isAuthorized("/attendance", false)).toBe(false);
  });

  test("protected API routes reject requests without a token", () => {
    expect(isAuthorized("/api/leaders", false)).toBe(false);
    expect(isAuthorized("/api/finance", false)).toBe(false);
    expect(isAuthorized("/api/admin/users", false)).toBe(false);
    expect(isAuthorized("/api/audit", false)).toBe(false);
    expect(isAuthorized("/api/notifications", false)).toBe(false);
    expect(isAuthorized("/api/attendance", false)).toBe(false);
    expect(isAuthorized("/api/messages", false)).toBe(false);
    expect(isAuthorized("/api/mentorship", false)).toBe(false);
    expect(isAuthorized("/api/alumni", false)).toBe(false);
    expect(isAuthorized("/api/gallery", false)).toBe(false);
    expect(isAuthorized("/api/events", false)).toBe(false);
    expect(isAuthorized("/api/programs", false)).toBe(false);
    expect(isAuthorized("/api/news", false)).toBe(false);
    expect(isAuthorized("/api/announcements", false)).toBe(false);
    expect(isAuthorized("/api/concerns", false)).toBe(false);
    expect(isAuthorized("/api/reports/overview", false)).toBe(false);
    expect(isAuthorized("/api/search", false)).toBe(false);
    expect(isAuthorized("/api/profile", false)).toBe(false);
  });

  test("protected routes pass when a token is present", () => {
    expect(isAuthorized("/dashboard", true)).toBe(true);
    expect(isAuthorized("/profile", true)).toBe(true);
    expect(isAuthorized("/api/leaders", true)).toBe(true);
    expect(isAuthorized("/api/finance/summary", true)).toBe(true);
  });
});

describe("isAuthorized — static assets always pass", () => {
  test("static assets pass without a token", () => {
    expect(isAuthorized("/_next/static/chunks/main.js", false)).toBe(true);
    expect(isAuthorized("/_next/image", false)).toBe(true);
    expect(isAuthorized("/favicon.ico", false)).toBe(true);
    expect(isAuthorized("/images/avatars/avatar-1.png", false)).toBe(true);
    expect(isAuthorized("/documents/policy.pdf", false)).toBe(true);
  });

  test("static assets pass WITH a token too", () => {
    expect(isAuthorized("/_next/static/chunks/main.js", true)).toBe(true);
    expect(isAuthorized("/images/avatars/avatar-1.png", true)).toBe(true);
  });

  test("static asset prefix takes precedence over protected route semantics", () => {
    // Even if a path LOOKS protected, if it's under a static asset prefix,
    // it passes. This pins the precedence: static > public > token-required.
    expect(isAuthorized("/_next/dashboard", false)).toBe(true);
  });
});

describe("isAuthorized — precedence and edge cases", () => {
  test("static asset check happens before public check", () => {
    // /images lives only in STATIC_ASSET_PREFIXES, not in PUBLIC_PATHS.
    // The fact that it's authorized proves the static check runs first.
    expect(isPublic("/images")).toBe(false);
    expect(isAuthorized("/images", false)).toBe(true);
  });

  test("an empty pathname is authorized (defensive)", () => {
    // Matches the isPublic("")[true] contract — empty path is treated as
    // public, and never reaches the token-required branch.
    expect(isAuthorized("", false)).toBe(true);
  });

  test("pathname does NOT include the query string — caller is responsible for stripping it", () => {
    // The middleware extracts `pathname` from `req.nextUrl.pathname` which
    // already strips the query string. The pure helpers operate on the path
    // only, so a path WITH a query string is treated literally — i.e. the
    // matcher will not match `/login?foo=bar` against `/login` because the
    // string doesn't start with `/login/`. This test pins that contract.
    expect(isPublic("/login")).toBe(true);
    expect(isPublic("/login?callbackUrl=/dashboard")).toBe(false);
    // Callers should strip the query string before invoking the helpers:
    expect(isPublic("/login")).toBe(true);
  });

  test("case sensitivity: /Dashboard is NOT public (Next.js routes are case-sensitive)", () => {
    expect(isAuthorized("/Dashboard", false)).toBe(false);
    expect(isAuthorized("/LOGIN", false)).toBe(false);
  });
});
