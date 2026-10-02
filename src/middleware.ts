// Next.js middleware for Embuni ELC.
// Protects dashboard and account routes; leaves public routes open.
//
// The pure routing decisions live in `@/lib/rbac/route-access.ts` so they can
// be unit-tested without booting next-auth. This file is a thin adapter that
// wires those decisions into `withAuth`'s `authorized` callback.

import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import { isAuthorized } from "@/lib/rbac/route-access";

export { PUBLIC_PATHS, STATIC_ASSET_PREFIXES, isPublic, isStaticAssetPath } from "@/lib/rbac/route-access";

// Check if the request carries the backend JWT cookie (set after login).
// The backend enforces its own RBAC, so this cookie is a valid auth signal
// for API routes that proxy to the backend.
function hasBackendToken(req: { cookies: { get: (name: string) => { value: string } | undefined } }): boolean {
  return !!req.cookies?.get("embuni-elc-backend-token")?.value;
}

export default withAuth(
  function middleware(req) {
    const pathname = req?.nextUrl?.pathname ?? "";

    // API routes (except NextAuth) are proxied to the Express backend, which
    // enforces its own RBAC independently. Let them through; the backend will
    // return 401/403 as appropriate based on the JWT.
    if (pathname.startsWith("/api/") && !pathname.startsWith("/api/auth")) {
      return NextResponse.next();
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const pathname = req?.nextUrl?.pathname ?? "";

        // API routes handled above — always pass.
        if (pathname.startsWith("/api/") && !pathname.startsWith("/api/auth")) {
          return true;
        }

        // Allow if NextAuth token exists OR backend JWT cookie exists.
        const hasToken = !!token || hasBackendToken(req);
        return isAuthorized(pathname, hasToken);
      },
    },
  },
);

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
