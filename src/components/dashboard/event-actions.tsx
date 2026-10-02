"use client";

// EventActions — client buttons for Publish / Archive actions on the
// event detail page. Mutates via existing API endpoints and refreshes
// the page on success.

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

export function EventActions({
  eventId,
  status,
}: {
  eventId: string;
  status: "draft" | "published" | "ongoing" | "completed" | "cancelled" | "archived";
}) {
  const router = useRouter();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [confirmArchive, setConfirmArchive] = React.useState(false);

  const publishMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/events/${eventId}/publish`, { method: "POST" });
      if (!res.ok) {
        const j = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(j?.error ?? "Failed to publish event");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Event published",
        description: "It is now visible on the public site.",
      });
      qc.invalidateQueries({ queryKey: ["events"] });
      router.refresh();
    },
    onError: (e: Error) =>
      toast({ title: "Could not publish", description: e.message, variant: "destructive" }),
  });

  const archiveMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/events/${eventId}`, { method: "DELETE" });
      if (!res.ok) {
        const j = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(j?.error ?? "Failed to archive event");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Event archived",
        description: "It is no longer visible publicly.",
      });
      qc.invalidateQueries({ queryKey: ["events"] });
      setConfirmArchive(false);
      router.refresh();
    },
    onError: (e: Error) =>
      toast({ title: "Could not archive", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="flex flex-wrap items-center gap-2">
      {status !== "published" && status !== "ongoing" && (
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
            <AlertDialogTitle>Archive this event?</AlertDialogTitle>
            <AlertDialogDescription>
              The event will be removed from the public site and moved to the
              archived tab. Registrations are preserved.
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
