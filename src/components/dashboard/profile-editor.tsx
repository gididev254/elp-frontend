"use client";

import * as React from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SCHOOLS } from "@/lib/constants/schools";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, Key, Eye, EyeOff } from "lucide-react";

interface Props {
  profile: {
    fullName: string;
    preferredName: string;
    gender: string;
    yearOfStudy: number | null;
    school: string;
    program: string;
    phone: string;
    bio: string;
    avatarUrl: string;
  };
}

export function ProfileEditor({ profile }: Props) {
  const { data: session } = useSession();
  const { toast } = useToast();
  const [form, setForm] = React.useState(profile);
  const [saving, setSaving] = React.useState(false);

  // Password change state
  const [pwForm, setPwForm] = React.useState({
    currentPassword: "",
    newPath: "",
    confirmPath: "",
  });
  const [pwSaving, setPwSaving] = React.useState(false);
  const [showCurrent, setShowCurrent] = React.useState(false);
  const [showNew, setShowNew] = React.useState(false);
  const [showConfirm, setShowConfirm] = React.useState(false);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast({
          title: "Update failed",
          description: err.error ?? "Could not save changes.",
          variant: "destructive",
        });
        return;
      }
      toast({ title: "Profile updated", description: "Your changes have been saved." });
    } catch {
      toast({
        title: "Network error",
        description: "Could not reach the server.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pwForm.newPath !== pwForm.confirmPath) {
      toast({ title: "Passwords do not match", description: "Please check your new password and confirmation.", variant: "destructive" });
      return;
    }
    if (pwForm.newPath.length < 8) {
      toast({ title: "Password too short", description: "New password must be at least 8 characters.", variant: "destructive" });
      return;
    }
    setPwSaving(true);
    try {
      const res = await fetch("/api/profile?password=true", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pwForm),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast({ title: "Password change failed", description: err.error ?? "Could not update password.", variant: "destructive" });
        return;
      }
      toast({ title: "Password updated", description: "Your password has been changed. You remain signed in." });
      setPwForm({ currentPassword: "", newPath: "", confirmPath: "" });
    } catch {
      toast({ title: "Network error", description: "Could not reach the server.", variant: "destructive" });
    } finally {
      setPwSaving(false);
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Edit profile</CardTitle>
        <CardDescription>
          Update your personal and academic information visible to chapter leadership.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-5">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="fullName">Full name</Label>
              <Input
                id="fullName"
                value={form.fullName}
                onChange={(e) => set("fullName", e.target.value)}
                disabled={saving}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="preferredName">Preferred name</Label>
              <Input
                id="preferredName"
                value={form.preferredName}
                onChange={(e) => set("preferredName", e.target.value)}
                disabled={saving}
                placeholder="What should we call you?"
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                disabled={saving}
                placeholder="+254712345678"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="gender">Gender</Label>
              <Select value={form.gender || "other"} onValueChange={(v) => set("gender", v)} disabled={saving}>
                <SelectTrigger id="gender"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="school">School</Label>
              <Select value={form.school} onValueChange={(v) => set("school", v)} disabled={saving}>
                <SelectTrigger id="school"><SelectValue placeholder="Select school" /></SelectTrigger>
                <SelectContent>
                  {SCHOOLS.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="year">Year of study</Label>
              <Select
                value={form.yearOfStudy ? String(form.yearOfStudy) : "1"}
                onValueChange={(v) => set("yearOfStudy", Number(v))}
                disabled={saving}
              >
                <SelectTrigger id="year"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Year 1</SelectItem>
                  <SelectItem value="2">Year 2</SelectItem>
                  <SelectItem value="3">Year 3</SelectItem>
                  <SelectItem value="4">Year 4</SelectItem>
                  <SelectItem value="5">Year 5</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="program">Programme</Label>
            <Input
              id="program"
              value={form.program}
              onChange={(e) => set("program", e.target.value)}
              disabled={saving}
              placeholder="e.g. BSc Computer Science"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              rows={4}
              value={form.bio}
              onChange={(e) => set("bio", e.target.value)}
              disabled={saving}
              placeholder="Tell the chapter about yourself..."
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              {saving ? "Saving..." : "Save changes"}
            </Button>
          </div>
        </CardContent>
      </form>
    </Card>

    {/* Password change card */}
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Key className="h-4 w-4" />
          Change password
        </CardTitle>
        <CardDescription>
          Update your account password. You will remain signed in after changing it.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handlePasswordSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="currentPassword">Current password</Label>
            <div className="relative">
              <Input
                id="currentPassword"
                type={showCurrent ? "text" : "password"}
                value={pwForm.currentPassword}
                onChange={(e) => setPwForm((f) => ({ ...f, currentPassword: e.target.value }))}
                disabled={pwSaving}
                required
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowCurrent((v) => !v)}
                tabIndex={-1}
              >
                {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="newPath">New password</Label>
              <div className="relative">
                <Input
                  id="newPath"
                  type={showNew ? "text" : "password"}
                  value={pwForm.newPath}
                  onChange={(e) => setPwForm((f) => ({ ...f, newPath: e.target.value }))}
                  disabled={pwSaving}
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowNew((v) => !v)}
                  tabIndex={-1}
                >
                  {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirmPath">Confirm new password</Label>
              <div className="relative">
                <Input
                  id="confirmPath"
                  type={showConfirm ? "text" : "password"}
                  value={pwForm.confirmPath}
                  onChange={(e) => setPwForm((f) => ({ ...f, confirmPath: e.target.value }))}
                  disabled={pwSaving}
                  required
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowConfirm((v) => !v)}
                  tabIndex={-1}
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="submit" disabled={pwSaving}>
              {pwSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Key className="h-4 w-4 mr-2" />}
              {pwSaving ? "Updating..." : "Update password"}
            </Button>
          </div>
        </CardContent>
      </form>
    </Card>
    </>
  );
}
