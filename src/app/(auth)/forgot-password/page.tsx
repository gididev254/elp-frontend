"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Logo } from "@/components/layout/logo";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Mail, Loader2, CheckCircle2, Bell } from "lucide-react";

export default function ForgotPasswordPage() {
  const { toast } = useToast();
  const [email, setEmail] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [sent, setSent] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      // Always 200 (security best practice — never reveal whether the email exists).
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error ?? "Something went wrong. Please try again.");
      }
      setSent(true);
      toast({
        title: "Recovery request received",
        description: "If the email exists, a reset link has been created.",
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Request failed.";
      toast({ title: "Could not send request", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-section-alt">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center space-y-3">
            <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <CheckCircle2 className="h-7 w-7 text-primary" />
            </div>
            <CardTitle className="text-2xl">Recovery request received</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-3">
            <p className="text-sm text-muted-foreground">
              If an account with that email exists, a reset link has been created.
              Check your notifications or contact the executive.
            </p>
            <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-left text-xs space-y-1.5">
              <div className="flex items-start gap-2">
                <Bell className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                <div>
                  <div className="font-medium">Check your notifications</div>
                  <p className="text-muted-foreground mt-0.5">
                    Sign in (if you can) and visit the notifications inbox — the
                    reset link is delivered as an in-app notification in v1.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2 pt-1">
                <Mail className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                <div>
                  <div className="font-medium">Or contact the executive</div>
                  <p className="text-muted-foreground mt-0.5">
                    Email{" "}
                    <a
                      href="mailto:elc@embuni.ac.ke"
                      className="text-primary hover:underline"
                    >
                      elc@embuni.ac.ke
                    </a>{" "}
                    and the executive can issue a reset link on your behalf.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Button asChild className="w-full">
              <Link href="/login">Back to sign in</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-border bg-background">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Logo className="h-8 w-8 text-primary" />
            <span className="font-bold text-sm">Embuni ELC</span>
          </Link>
          <Button asChild variant="ghost" size="sm">
            <Link href="/login">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to sign in
            </Link>
          </Button>
        </div>
      </header>
      <main className="flex-1 flex items-center justify-center p-6 bg-section-alt">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Forgot password?</CardTitle>
            <CardDescription>
              Enter your email and we&apos;ll create a recovery link for you.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@embuni.ac.ke"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9"
                    required
                    disabled={loading}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                For security, we don&apos;t reveal whether the email is registered.
                If an account exists, a reset link will be delivered as an in-app
                notification.
              </p>
            </CardContent>
            <CardFooter className="flex flex-col gap-3">
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                {loading ? "Sending…" : "Send recovery link"}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </main>
    </div>
  );
}
