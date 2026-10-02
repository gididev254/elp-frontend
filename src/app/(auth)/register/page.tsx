"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Logo } from "@/components/layout/logo";
import { Eye, EyeOff, Loader2, AlertCircle, CheckCircle2, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { SCHOOLS } from "@/lib/constants/schools";

export default function RegisterPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [form, setForm] = React.useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    gender: "male" as "male" | "female" | "other",
    yearOfStudy: "1",
    school: "",
    program: "",
    phone: "",
  });
  const [showPassword, setShowPassword] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (form.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (!form.email.toLowerCase().endsWith("@embuni.ac.ke")) {
      setError("Registration is restricted to @embuni.ac.ke email addresses.");
      return;
    }
    if (!form.school) {
      setError("Please select your school.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: form.fullName,
          email: form.email,
          password: form.password,
          gender: form.gender,
          yearOfStudy: Number(form.yearOfStudy),
          school: form.school,
          program: form.program,
          phone: form.phone || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Registration failed.");
        return;
      }
      setSuccess(
        data.message ??
          "Registration received. Your account is pending administrator approval.",
      );
      toast({
        title: "Registration submitted",
        description: "Please await administrator approval before signing in.",
      });
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-section-alt">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center space-y-3">
            <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <CheckCircle2 className="h-7 w-7 text-primary" />
            </div>
            <CardTitle className="text-2xl">Registration received</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-center">
            <p className="text-sm text-muted-foreground">{success}</p>
            <p className="text-xs text-muted-foreground">
              You will receive in-app notification once your account is approved.
              Please sign in after approval.
            </p>
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Button asChild className="w-full">
              <Link href="/login">Continue to sign in</Link>
            </Button>
            <Button asChild variant="ghost" className="w-full">
              <Link href="/">Back to home</Link>
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

      <main className="flex-1 flex items-start sm:items-center justify-center p-4 sm:p-6 sm:py-12 bg-section-alt">
        <Card className="w-full max-w-2xl shadow-sm">
          <CardHeader className="space-y-2">
            <CardTitle className="text-2xl">Join the chapter</CardTitle>
            <CardDescription>
              Registration is open to University of Embu students with an{" "}
              <code className="text-xs bg-secondary px-1 py-0.5 rounded">@embuni.ac.ke</code>{" "}
              email. Accounts are reviewed by the chapter executive before activation.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-5">
              {error && (
                <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="fullName">Full name <span className="text-destructive">*</span></Label>
                  <Input
                    id="fullName"
                    placeholder="e.g. Brian Kamau Wanjiru"
                    value={form.fullName}
                    onChange={(e) => set("fullName", e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email <span className="text-destructive">*</span></Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@embuni.ac.ke"
                    value={form.email}
                    onChange={(e) => set("email", e.target.value)}
                    required
                    disabled={loading}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Must end with @embuni.ac.ke
                  </p>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="password">Password <span className="text-destructive">*</span></Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="At least 8 characters"
                      value={form.password}
                      onChange={(e) => set("password", e.target.value)}
                      className="pr-9"
                      required
                      minLength={8}
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      tabIndex={-1}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="confirmPassword">Confirm password <span className="text-destructive">*</span></Label>
                  <Input
                    id="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    placeholder="Re-enter password"
                    value={form.confirmPassword}
                    onChange={(e) => set("confirmPassword", e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Gender <span className="text-destructive">*</span></Label>
                  <RadioGroup
                    value={form.gender}
                    onValueChange={(v) => set("gender", v as typeof form.gender)}
                    className="flex gap-4 pt-1"
                    disabled={loading}
                  >
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="male" id="g-male" />
                      <Label htmlFor="g-male" className="cursor-pointer font-normal">Male</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="female" id="g-female" />
                      <Label htmlFor="g-female" className="cursor-pointer font-normal">Female</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="other" id="g-other" />
                      <Label htmlFor="g-other" className="cursor-pointer font-normal">Other</Label>
                    </div>
                  </RadioGroup>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="yearOfStudy">Year of study <span className="text-destructive">*</span></Label>
                  <Select value={form.yearOfStudy} onValueChange={(v) => set("yearOfStudy", v)} disabled={loading}>
                    <SelectTrigger id="yearOfStudy">
                      <SelectValue placeholder="Select year" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Year 1</SelectItem>
                      <SelectItem value="2">Year 2</SelectItem>
                      <SelectItem value="3">Year 3</SelectItem>
                      <SelectItem value="4">Year 4</SelectItem>
                      <SelectItem value="5">Year 5</SelectItem>
                      <SelectItem value="6">Year 6</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="school">School <span className="text-destructive">*</span></Label>
                  <Select value={form.school} onValueChange={(v) => set("school", v)} disabled={loading}>
                    <SelectTrigger id="school">
                      <SelectValue placeholder="Select your school" />
                    </SelectTrigger>
                    <SelectContent>
                      {SCHOOLS.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="program">Programme <span className="text-destructive">*</span></Label>
                  <Input
                    id="program"
                    placeholder="e.g. BSc Computer Science"
                    value={form.program}
                    onChange={(e) => set("program", e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="phone">Phone (optional)</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+254712345678"
                  value={form.phone}
                  onChange={(e) => set("phone", e.target.value)}
                  disabled={loading}
                />
                <p className="text-[11px] text-muted-foreground">
                  Kenyan format: +254712345678 or 0712345678
                </p>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-3">
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                {loading ? "Submitting…" : "Submit registration"}
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                By submitting, you acknowledge that your account will be reviewed
                and activated by the chapter executive.
              </p>
            </CardFooter>
          </form>
        </Card>
      </main>
    </div>
  );
}
