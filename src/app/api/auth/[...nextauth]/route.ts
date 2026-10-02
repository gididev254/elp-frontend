// Embuni ELC — NextAuth route handler (App Router).
// Mounts NextAuth at /api/auth/[...nextauth].

import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
