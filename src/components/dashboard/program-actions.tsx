"use client";

// ProgramActions — client buttons for Publish / Archive actions on the
// program detail page. Mutates via the existing API endpoints and calls
// `onSuccess` when the action succeeds so the parent can refresh.

import * as React from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Send, Archive, Loader2 } from "lucide-react";

export function ProgramActions({
  programId,
  status,
}: {
  programId: string;
  status: "draft" | "published" | "archived";
}) {
  const router = useRouter();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [confirmArchive, setConfirmArchive] = React.useState(false);

  const publishMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/programs/${programId}/publish`, {
        method: "POST",
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(j?.error ?? "Failed to publish program");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Program published",
        description: "It is now visible on the public site.",
      });
      qc.invalidateQueries({ queryKey: ["programs"] });
      router.refresh();
    },
    onError: (e: Error) =>
      toast({ title: "Could not publish", description: e.message, variant: "destructive" }),
  });

  const archiveMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/programs/${programId}`, { method: "DELETE" });
      if (!res.ok) {
        const j = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(j?.error ?? "Failed to archive program");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Program archived",
        description: "It is no longer visible publicly.",
      });
      qc.invalidateQueries({ queryKey: ["programs"] });
      setConfirmArchive(false);
      router.refresh();
    },
    onError: (e: Error) =>
      toast({ title: "Could not archive", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="flex flex-wrap items-center gap-2">
      {status !== "published" && (
        <Button
          onClick={() => publishMutation.mutate()}
          disabled={publishMutation.isPending}
        >
          {publishMutation.isPending ? (
            <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
          ) : (
            <Send className="h-4 w-4 mr-1.5" />
          )}
          Publish
        </Button>
      )}
      {status !== "archived" && (
        <Button
          variant="outline"
          onClick={() => setConfirmArchive(true)}
          disabled={archiveMutation.isPending}
        >
          <Archive className="h-4 w-4 mr-1.5" />
          Archive
        </Button>
      )}

      <AlertDialog open={confirmArchive} onOpenChange={setConfirmArchive}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive this program?</AlertDialogTitle>
            <AlertDialogDescription>
              The program will be removed from the public site and moved to the
              archived tab. You can restore it later by editing its status.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => archiveMutation.mutate()}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Archive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
