"use client";

// MessagesManager — client component for the direct-messaging module.
// Two tabs (Inbox / Sent), a Compose dialog, and a message detail dialog.
// Uses TanStack Query for fetching + mutations, shadcn/ui for chrome,
// date-fns for timestamps, lucide-react for icons.
//
// Conventions enforced (project-wide):
// - NO indigo/blue. Uses primary (maroon #8B0000), accent (gold #F7C744),
//   and muted grays.
// - Plain <img loading="lazy"> where images are used.
// - Toast on every success/error.
// - Audit logging happens server-side (recordAudit in the API routes).

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, formatDistanceToNow } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  MessageSquare,
  Send,
  Inbox as InboxIcon,
  Trash2,
  RefreshCw,
  PenSquare,
  Check,
  Mail,
  MailOpen,
  ArrowLeft,
  User as UserIcon,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types — mirror the API route response shapes.
// ---------------------------------------------------------------------------

export interface MessageUser {
  id: string;
  email: string;
  name: string;
  primaryRole: string | null;
  primaryRoleLabel: string | null;
}

export interface MessageItem {
  id: string;
  senderId: string;
  recipientId: string;
  subject: string;
  body: string;
  read: boolean;
  createdAt: string;
  sender: MessageUser;
  recipient: MessageUser;
}

export interface Recipient {
  id: string;
  name: string;
  email: string;
  role: string;
  roleLabel: string;
}

interface MessagesResponse {
  box: "inbox" | "sent";
  items: MessageItem[];
}

interface RecipientsResponse {
  items: Recipient[];
}

interface Props {
  initialInbox: MessageItem[];
  initialSent: MessageItem[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function preview(body: string, max = 110): string {
  const trimmed = body.trim().replace(/\s+/g, " ");
  if (trimmed.length <= max) return trimmed;
  return trimmed.slice(0, max).trimEnd() + "…";
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function MessagesManager({ initialInbox, initialSent }: Props) {
  const qc = useQueryClient();
  const { toast } = useToast();

  const [box, setBox] = React.useState<"inbox" | "sent">("inbox");
  const [composing, setComposing] = React.useState(false);
  const [openMessage, setOpenMessage] = React.useState<MessageItem | null>(null);
  const [deleting, setDeleting] = React.useState<MessageItem | null>(null);

  // Inbox + sent queries. Both are pre-fetched by the server component so
  // we have initial data; refetch stays cheap via React Query cache.
  const inboxQuery = useQuery<MessagesResponse>({
    queryKey: ["messages", "inbox"],
    queryFn: async () => {
      const res = await fetch("/api/messages?box=inbox");
      if (!res.ok) throw new Error("Failed to load inbox");
      return (await res.json()) as MessagesResponse;
    },
    initialData: { box: "inbox", items: initialInbox },
  });

  const sentQuery = useQuery<MessagesResponse>({
    queryKey: ["messages", "sent"],
    queryFn: async () => {
      const res = await fetch("/api/messages?box=sent");
      if (!res.ok) throw new Error("Failed to load sent messages");
      return (await res.json()) as MessagesResponse;
    },
    initialData: { box: "sent", items: initialSent },
  });

  const activeQuery = box === "inbox" ? inboxQuery : sentQuery;
  const items = activeQuery.data?.items ?? [];
  const unreadCount = (inboxQuery.data?.items ?? []).filter((m) => !m.read).length;

  // ----- Mark as read -----------------------------------------------------
  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/messages/${id}/read`, { method: "POST" });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error ?? "Failed to mark as read");
      }
      return res.json();
    },
    onSuccess: (_data, id) => {
      // Optimistic update: flip the read flag in the cache.
      qc.setQueryData<MessagesResponse>(["messages", "inbox"], (old) =>
        old
          ? { ...old, items: old.items.map((m) => (m.id === id ? { ...m, read: true } : m)) }
          : old,
      );
      setOpenMessage((cur) => (cur ? { ...cur, read: true } : cur));
    },
    onError: (e: Error) =>
      toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  // ----- Delete -----------------------------------------------------------
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/messages/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error ?? "Failed to delete");
      }
      return res.json();
    },
    onSuccess: (_data, id) => {
      toast({ title: "Message deleted" });
      // Remove from both caches (the message may appear in inbox OR sent).
      qc.setQueryData<MessagesResponse>(["messages", "inbox"], (old) =>
        old ? { ...old, items: old.items.filter((m) => m.id !== id) } : old,
      );
      qc.setQueryData<MessagesResponse>(["messages", "sent"], (old) =>
        old ? { ...old, items: old.items.filter((m) => m.id !== id) } : old,
      );
      setOpenMessage((cur) => (cur?.id === id ? null : cur));
      setDeleting(null);
    },
    onError: (e: Error) =>
      toast({ title: "Could not delete", description: e.message, variant: "destructive" }),
  });

  // ----- Refresh ----------------------------------------------------------
  function refresh() {
    qc.invalidateQueries({ queryKey: ["messages"] });
  }

  // ---------------------------------------------------------------------
  // When a message is opened from the inbox, auto-mark it as read.
  // ---------------------------------------------------------------------
  function handleOpenMessage(m: MessageItem) {
    setOpenMessage(m);
    if (box === "inbox" && !m.read) {
      markReadMutation.mutate(m.id);
    }
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <Tabs value={box} onValueChange={(v) => setBox(v as "inbox" | "sent")}>
          <TabsList>
            <TabsTrigger value="inbox" className="relative">
              <InboxIcon className="h-4 w-4 mr-1.5" />
              Inbox
              {unreadCount > 0 && (
                <Badge
                  variant="default"
                  className="ml-2 h-5 px-1.5 text-[10px] bg-primary text-primary-foreground"
                >
                  {unreadCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="sent">
              <Send className="h-4 w-4 mr-1.5" />
              Sent
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={refresh}
            disabled={activeQuery.isFetching}
            aria-label="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${activeQuery.isFetching ? "animate-spin" : ""}`} />
          </Button>
          <Button onClick={() => setComposing(true)}>
            <PenSquare className="h-4 w-4 mr-1.5" />
            Compose
          </Button>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        {activeQuery.isLoading
          ? "Loading…"
          : `${items.length} message${items.length === 1 ? "" : "s"}${
              box === "inbox" && unreadCount > 0 ? ` · ${unreadCount} unread` : ""
            }`}
      </p>

      {/* List */}
      {activeQuery.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4 flex items-start gap-3">
                <Skeleton className="h-9 w-9 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-3 w-2/3" />
                  <Skeleton className="h-3 w-1/4" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center">
            {box === "inbox" ? (
              <InboxIcon className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            ) : (
              <Send className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            )}
            <h3 className="font-medium">
              {box === "inbox" ? "No messages in your inbox" : "Nothing sent yet"}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              {box === "inbox"
                ? "Direct messages from other chapter leaders will appear here."
                : "Use Compose to send a message to another chapter leader."}
            </p>
            <Button className="mt-4" onClick={() => setComposing(true)}>
              <PenSquare className="h-4 w-4 mr-1.5" />
              Compose a message
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {items.map((m) => (
            <MessageRow
              key={m.id}
              message={m}
              box={box}
              onOpen={() => handleOpenMessage(m)}
              onDelete={() => setDeleting(m)}
            />
          ))}
        </div>
      )}

      {/* Compose dialog */}
      {composing && (
        <ComposeDialog
          open={composing}
          onOpenChange={setComposing}
          onSent={() => {
            // After sending, switch to Sent so the user can see their message.
            setBox("sent");
            qc.invalidateQueries({ queryKey: ["messages"] });
          }}
        />
      )}

      {/* Detail dialog */}
      {openMessage && (
        <MessageDetailDialog
          open={!!openMessage}
          onOpenChange={(o) => !o && setOpenMessage(null)}
          message={openMessage}
          box={box}
          canMarkRead={box === "inbox"}
          onMarkRead={() => markReadMutation.mutate(openMessage.id)}
          onDelete={() => {
            setDeleting(openMessage);
            setOpenMessage(null);
          }}
          isMarkingRead={markReadMutation.isPending}
        />
      )}

      {/* Delete confirmation */}
      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this message?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting && (
                <>
                  <span className="font-medium text-foreground">“{deleting.subject}”</span>{" "}
                  will be permanently deleted. This action cannot be undone.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleting && deleteMutation.mutate(deleting.id)}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ---------------------------------------------------------------------------
// MessageRow — a single message in the list
// ---------------------------------------------------------------------------

function MessageRow({
  message,
  box,
  onOpen,
  onDelete,
}: {
  message: MessageItem;
  box: "inbox" | "sent";
  onOpen: () => void;
  onDelete: () => void;
}) {
  const counterpart = box === "inbox" ? message.sender : message.recipient;
  const unread = box === "inbox" && !message.read;

  return (
    <Card
      className={`hover:border-primary/30 transition-colors cursor-pointer ${
        unread ? "border-primary/30 bg-primary/[0.03]" : ""
      }`}
      onClick={onOpen}
    >
      <CardContent className="p-4 flex items-start gap-3">
        <Avatar className="size-9">
          <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
            {initials(counterpart.name)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-sm truncate ${unread ? "font-semibold" : "font-medium"}`}>
                  {counterpart.name}
                </span>
                {counterpart.primaryRoleLabel && (
                  <Badge variant="outline" className="text-[10px] py-0 px-1.5">
                    {counterpart.primaryRoleLabel}
                  </Badge>
                )}
                {unread && (
                  <Badge variant="default" className="text-[10px] py-0 px-1.5 bg-primary text-primary-foreground">
                    New
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                {box === "inbox" ? (
                  unread ? (
                    <Mail className="h-3 w-3 text-primary" />
                  ) : (
                    <MailOpen className="h-3 w-3 text-muted-foreground" />
                  )
                ) : (
                  <Send className="h-3 w-3 text-muted-foreground" />
                )}
                <span className="text-sm font-medium truncate">{message.subject}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                {preview(message.body, 140)}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0">
              <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                {format(new Date(message.createdAt), "d MMM yyyy")}
              </span>
              <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
              </span>
            </div>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0 h-8 w-8 text-muted-foreground hover:text-destructive"
          aria-label="Delete message"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// MessageDetailDialog — full message view
// ---------------------------------------------------------------------------

function MessageDetailDialog({
  open,
  onOpenChange,
  message,
  box,
  canMarkRead,
  onMarkRead,
  onDelete,
  isMarkingRead,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  message: MessageItem;
  box: "inbox" | "sent";
  canMarkRead: boolean;
  onMarkRead: () => void;
  onDelete: () => void;
  isMarkingRead: boolean;
}) {
  const counterpart = box === "inbox" ? message.sender : message.recipient;
  const counterpartRole =
    counterpart.primaryRoleLabel ?? (box === "inbox" ? "Sender" : "Recipient");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="pr-8">{message.subject}</DialogTitle>
          <DialogDescription>
            {box === "inbox" ? "Received" : "Sent"}{" "}
            {format(new Date(message.createdAt), "d MMM yyyy, h:mm a")}
          </DialogDescription>
        </DialogHeader>

        {/* Counterpart info */}
        <div className="flex items-center gap-3 py-2 border-y border-border">
          <Avatar className="size-10">
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
              {initials(counterpart.name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-sm">{counterpart.name}</span>
              <Badge variant="secondary" className="text-[10px] py-0 px-1.5">
                {counterpartRole}
              </Badge>
            </div>
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <UserIcon className="h-3 w-3" />
              {box === "inbox" ? "From" : "To"} {counterpart.email}
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="py-3">
          <p className="text-sm whitespace-pre-wrap leading-relaxed">
            {message.body}
          </p>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Close
          </Button>
          {canMarkRead && !message.read && (
            <Button
              type="button"
              variant="secondary"
              onClick={onMarkRead}
              disabled={isMarkingRead}
            >
              <Check className="h-4 w-4 mr-1.5" />
              {isMarkingRead ? "Marking…" : "Mark as read"}
            </Button>
          )}
          <Button
            type="button"
            variant="destructive"
            onClick={onDelete}
          >
            <Trash2 className="h-4 w-4 mr-1.5" />
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// ComposeDialog
// ---------------------------------------------------------------------------

function ComposeDialog({
  open,
  onOpenChange,
  onSent,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSent: () => void;
}) {
  const { toast } = useToast();
  const [recipientId, setRecipientId] = React.useState<string>("");
  const [subject, setSubject] = React.useState("");
  const [body, setBody] = React.useState("");

  const recipientsQuery = useQuery<RecipientsResponse>({
    queryKey: ["messages", "recipients"],
    queryFn: async () => {
      const res = await fetch("/api/messages/recipients");
      if (!res.ok) throw new Error("Failed to load recipients");
      return (await res.json()) as RecipientsResponse;
    },
    enabled: open, // only fetch when dialog opens
  });

  const recipients = recipientsQuery.data?.items ?? [];

  // Reset form when dialog closes.
  React.useEffect(() => {
    if (!open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRecipientId("");
      setSubject("");
      setBody("");
    }
  }, [open]);

  const sendMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientId, subject, body }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error ?? "Failed to send message");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Message sent",
        description: "The recipient will see a notification in their inbox.",
      });
      onSent();
      onOpenChange(false);
    },
    onError: (e: Error) =>
      toast({ title: "Send failed", description: e.message, variant: "destructive" }),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!recipientId) {
      toast({ title: "Pick a recipient", variant: "destructive" });
      return;
    }
    if (subject.trim().length < 3) {
      toast({ title: "Subject too short", description: "At least 3 characters.", variant: "destructive" });
      return;
    }
    if (body.trim().length < 5) {
      toast({ title: "Body too short", description: "At least 5 characters.", variant: "destructive" });
      return;
    }
    sendMutation.mutate();
  }

  const subjectLen = subject.trim().length;
  const bodyLen = body.trim().length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Compose message</DialogTitle>
          <DialogDescription>
            Send a direct message to another chapter leader. They will receive an in-app notification.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Recipient */}
          <div className="space-y-1.5">
            <Label htmlFor="recipient">To</Label>
            <Select
              value={recipientId}
              onValueChange={setRecipientId}
              disabled={recipientsQuery.isLoading}
            >
              <SelectTrigger id="recipient">
                <SelectValue
                  placeholder={
                    recipientsQuery.isLoading
                      ? "Loading recipients…"
                      : "Select a recipient"
                  }
                />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {recipients.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="truncate">{r.name}</span>
                      <span className="text-muted-foreground text-xs">·</span>
                      <span className="text-xs text-muted-foreground truncate">
                        {r.roleLabel}
                      </span>
                    </div>
                  </SelectItem>
                ))}
                {recipients.length === 0 && !recipientsQuery.isLoading && (
                  <div className="p-2 text-xs text-muted-foreground text-center">
                    No recipients available
                  </div>
                )}
              </SelectContent>
            </Select>
            {recipientsQuery.isError && (
              <p className="text-xs text-destructive">
                Failed to load recipients. Close and try again.
              </p>
            )}
          </div>

          {/* Subject */}
          <div className="space-y-1.5">
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Brief subject line"
              maxLength={160}
              required
            />
            <p className="text-xs text-muted-foreground">
              {subjectLen}/160
            </p>
          </div>

          {/* Body */}
          <div className="space-y-1.5">
            <Label htmlFor="body">Message</Label>
            <Textarea
              id="body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your message…"
              rows={8}
              maxLength={5000}
              required
            />
            <p className="text-xs text-muted-foreground">
              {bodyLen}/5000
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={sendMutation.isPending}>
              {sendMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-1.5 animate-spin" />
                  Sending…
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-1.5" />
                  Send message
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
