"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Loader2, Plus, CheckCircle2 } from "lucide-react";

interface ConcernItem {
  id: string;
  title: string;
  body: string;
  cohort: string;
  status: string;
  submittedBy: { id: string; name: string };
  assignedTo: { id: string; name: string } | null;
  createdAt: string;
}

interface Props {
  initialConcerns: ConcernItem[];
  canManage: boolean;
  defaultCohort: string | null;
}

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  open: "default",
  acknowledged: "secondary",
  resolved: "outline",
  closed: "outline",
};

export function ConcernsPanel({ initialConcerns, canManage, defaultCohort }: Props) {
  const { toast } = useToast();
  const qc = useQueryClient();

  const [showForm, setShowForm] = React.useState(false);
  const [title, setTitle] = React.useState("");
  const [body, setBody] = React.useState("");
  const [cohort, setCohort] = React.useState(defaultCohort ?? "male_y1");

  // Use TanStack Query so mutations can invalidate and refetch.
  const { data } = useQuery({
    queryKey: ["concerns"],
    queryFn: async () => {
      const res = await fetch("/api/concerns");
      if (!res.ok) throw new Error("Failed to load concerns");
      return (await res.json()) as { items: ConcernItem[] };
    },
    initialData: { items: initialConcerns },
  });
  const concerns = data?.items ?? initialConcerns;

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/concerns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body, cohort }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Concern submitted", description: "The executive will review it." });
      setTitle("");
      setBody("");
      setShowForm(false);
      qc.invalidateQueries({ queryKey: ["concerns"] });
    },
    onError: (err: Error) => {
      toast({ title: "Submission failed", description: err.message, variant: "destructive" });
    },
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await fetch(`/api/concerns/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Status updated" });
      qc.invalidateQueries({ queryKey: ["concerns"] });
    },
    onError: () => toast({ title: "Update failed", variant: "destructive" }),
  });

  return (
    <div className="space-y-4">
      {!canManage && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Plus className="h-4 w-4 text-primary" />
              Submit a new concern
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {showForm ? (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Brief summary of the concern"
                    disabled={createMutation.isPending}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="body">Details</Label>
                  <Textarea
                    id="body"
                    rows={4}
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="Describe the concern, report or feedback in detail..."
                    disabled={createMutation.isPending}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Cohort</Label>
                  <Select value={cohort} onValueChange={setCohort} disabled={!!defaultCohort || createMutation.isPending}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male_y1">Male Year 1</SelectItem>
                      <SelectItem value="female_y1">Female Year 1</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => createMutation.mutate()}
                    disabled={createMutation.isPending || !title || !body}
                  >
                    {createMutation.isPending ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Plus className="h-4 w-4 mr-1.5" />}
                    Submit concern
                  </Button>
                  <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
                </div>
              </>
            ) : (
              <Button onClick={() => setShowForm(true)}>
                <Plus className="h-4 w-4 mr-1.5" />
                New concern
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {concerns.length === 0 ? (
          <Card>
            <CardContent className="p-10 text-center">
              <CheckCircle2 className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <h3 className="font-medium">No concerns yet</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {canManage ? "No active concerns from Year 1 Representatives." : "Submit your first concern using the form above."}
              </p>
            </CardContent>
          </Card>
        ) : (
          concerns.map((c) => (
            <Card key={c.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{c.title}</span>
                      <Badge variant={STATUS_VARIANT[c.status] ?? "outline"} className="text-[10px] uppercase">
                        {c.status}
                      </Badge>
                      <Badge variant="secondary" className="text-[10px] uppercase">
                        {c.cohort === "male_y1" ? "Male Y1" : "Female Y1"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-3">{c.body}</p>
                    <div className="text-xs text-muted-foreground mt-2">
                      Submitted by {c.submittedBy.name} on {format(new Date(c.createdAt), "d MMM yyyy, h:mm a")}
                      {c.assignedTo && ` • Assigned to ${c.assignedTo.name}`}
                    </div>
                  </div>
                  {canManage && (
                    <Select
                      value={c.status}
                      onValueChange={(v) => statusMutation.mutate({ id: c.id, status: v })}
                      disabled={statusMutation.isPending}
                    >
                      <SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="acknowledged">Acknowledge</SelectItem>
                        <SelectItem value="resolved">Resolve</SelectItem>
                        <SelectItem value="closed">Close</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
