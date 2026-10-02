"use client";

import * as React from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Logo } from "@/components/layout/logo";
import { Eye, EyeOff, Loader2, Mail, Lock, AlertCircle, CheckCircle2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";
  const initialError = searchParams.get("error");

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(
    initialError ? "Invalid email or password." : null,
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email || !password) {
      setError("Enter your email and password.");
      return;
    }
    setLoading(true);
    try {
      // Step 1: Authenticate via NextAuth (session management).
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      if (!res || res.error) {
        const message = res?.error ?? "Login failed. Please check your credentials.";
        setError(message);
        toast({ title: "Login failed", description: message, variant: "destructive" });
        return;
      }

      // Step 2: Obtain a backend JWT for API proxying.
      try {
        const backendRes = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        if (backendRes.ok) {
          const data = await backendRes.json();
          // The cookie is set by the API route; nothing else to do here.
          console.log("Backend token obtained for user:", data.user?.email);
        }
      } catch (backendErr) {
        // Non-fatal: session still works, just some API calls may fail.
        console.warn("Backend token fetch failed:", backendErr);
      }

      toast({ title: "Welcome back!", description: "You are now signed in." });
      router.push(callbackUrl);
      router.refresh();
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left: branding panel */}
      <div className="hidden lg:flex flex-col justify-between p-12 bg-primary text-primary-foreground relative overflow-hidden">
        <div className="absolute inset-0 bg-brand-gradient opacity-95" />
        <div className="absolute inset-0 bg-grid-pattern opacity-10" />
        <div className="relative z-10 space-y-8">
          <Link href="/" className="flex items-center gap-2.5 text-primary-foreground">
            <Logo className="h-10 w-10" />
            <div className="leading-tight">
              <div className="text-sm font-bold tracking-tight">Embuni ELC</div>
              <div className="text-[10px] uppercase tracking-wider opacity-80">
                Equity Leaders Chapter
              </div>
            </div>
          </Link>
          <div className="space-y-4 max-w-md">
            <h2 className="text-3xl font-bold leading-tight text-balance">
              The official digital home of the University of Embu Equity Leaders Chapter.
            </h2>
            <p className="text-sm opacity-85 leading-relaxed">
              Centralizing records, programs, events, mentorship and engagement
              for present and future chapter leaders.
            </p>
          </div>
        </div>
        <div className="relative z-10 text-xs opacity-70">
          &copy; {new Date().getFullYear()} Embuni Equity Leaders Chapter
        </div>
      </div>

      {/* Right: form */}
      <div className="flex items-center justify-center p-6 sm:p-10">
        <Card className="w-full max-w-md shadow-sm">
          <CardHeader className="space-y-3">
            <div className="lg:hidden">
              <Link href="/" className="inline-flex items-center gap-2">
                <Logo className="h-8 w-8 text-primary" />
                <span className="font-bold text-sm">Embuni ELC</span>
              </Link>
            </div>
            <CardTitle className="text-2xl">Welcome back</CardTitle>
            <CardDescription>
              Sign in to access your dashboard and chapter modules.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {error && (
                <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="email">Email address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@embuni.ac.ke"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9"
                    required
                    disabled={loading}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <button
                    type="button"
                    className="text-xs text-muted-foreground hover:text-foreground hover:underline"
                    onClick={() =>
                      toast({
                        title: "Password recovery",
                        description: "Please contact the chapter executive to reset your password.",
                      })
                    }
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9 pr-9"
                    required
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-3">
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                {loading ? "Signing in…" : "Sign in"}
              </Button>
              <p className="text-sm text-muted-foreground text-center">
                Don&apos;t have an account?{" "}
                <Link href="/register" className="font-medium text-primary hover:underline">
                  Join the chapter
                </Link>
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
