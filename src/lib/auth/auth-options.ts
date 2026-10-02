// Embuni ELC — NextAuth configuration
// Credentials provider with bcrypt-hashed passwords and JWT sessions.
// Augments the session with the user's primary role for client-side visibility checks.

import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { resolveUser } from "@/lib/rbac/server";

const ALLOWED_EMAIL_DOMAINS = ["embuni.ac.ke"];

function isAllowedEmailDomain(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase();
  return !!domain && ALLOWED_EMAIL_DOMAINS.includes(domain);
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Embuni ELC Account",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "you@embuni.ac.ke" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const email = credentials.email.trim().toLowerCase();
        if (!isAllowedEmailDomain(email)) {
          throw new Error("Registration and login are restricted to @embuni.ac.ke email addresses.");
        }

        const user = await db.user.findUnique({
          where: { email },
          include: { profile: true },
        });

        if (!user) {
          throw new Error("No account found with that email. Please register first.");
        }

        if (user.status === "pending") {
          throw new Error(
            "Your account is pending administrator approval. Please contact the chapter executive.",
          );
        }
        if (user.status === "suspended") {
          throw new Error("Your account has been suspended. Please contact the chapter executive.");
        }
        if (user.status === "deactivated") {
          throw new Error("This account has been deactivated.");
        }
        if (user.status !== "active") {
          throw new Error(`Account status: ${user.status}. Contact the chapter executive.`);
        }

        const valid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!valid) {
          throw new Error("Incorrect email or password.");
        }

        return {
          id: user.id,
          email: user.email,
          name: user.profile?.fullName ?? user.email,
        };
      },
    }),
  ],

  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 }, // 30 days

  pages: {
    signIn: "/login",
    error: "/login",
  },

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        const resolved = await resolveUser(user.id);
        if (resolved) {
          token.role = resolved.primaryRole;
          token.name = resolved.name ?? token.name;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string }).id = token.id as string;
        (session.user as { role?: string }).role = (token.role as string) ?? "LEADER";
        if (token.name) session.user.name = token.name as string;
      }
      return session;
    },
  },

  secret: process.env.NEXTAUTH_SECRET,
};

// Type augmentation for next-auth
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string | null;
      role: string;
    };
  }
  interface User {
    role?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: string;
  }
}
