// /dashboard/messages — Direct messaging module.
//
// Lightweight one-to-one / role-to-role messaging that complements the
// Announcements module (broadcast). Any authenticated active user can send
// and receive messages. The server component pre-fetches the user's inbox
// and sent messages so the client manager can hydrate instantly.

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { resolveUser } from "@/lib/rbac/server";
import { db } from "@/lib/db";
import {
  MessagesManager,
  type MessageItem,
} from "@/components/dashboard/messages-manager";
import { redirect } from "next/navigation";
import { MessageSquare } from "lucide-react";

export const metadata = { title: "Messages" };

export default async function MessagesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");
  const user = await resolveUser(session.user.id);
  if (!user) redirect("/login");

  // Pre-fetch both boxes. Each message includes sender + recipient profile +
  // primary role, so the client doesn't need a second round-trip.
  const [inboxRows, sentRows] = await Promise.all([
    db.message.findMany({
      where: { recipientId: user.id },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        sender: {
          select: {
            id: true,
            email: true,
            profile: { select: { preferredName: true, fullName: true } },
            userRoles: { include: { role: { select: { key: true, name: true } } } },
          },
        },
        recipient: {
          select: {
            id: true,
            email: true,
            profile: { select: { preferredName: true, fullName: true } },
            userRoles: { include: { role: { select: { key: true, name: true } } } },
          },
        },
      },
    }),
    db.message.findMany({
      where: { senderId: user.id },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        sender: {
          select: {
            id: true,
            email: true,
            profile: { select: { preferredName: true, fullName: true } },
            userRoles: { include: { role: { select: { key: true, name: true } } } },
          },
        },
        recipient: {
          select: {
            id: true,
            email: true,
            profile: { select: { preferredName: true, fullName: true } },
            userRoles: { include: { role: { select: { key: true, name: true } } } },
          },
        },
      },
    }),
  ]);

  const mapToItem = (m: typeof inboxRows[number]): MessageItem => ({
    id: m.id,
    senderId: m.senderId,
    recipientId: m.recipientId,
    subject: m.subject,
    body: m.body,
    read: m.read,
    createdAt: m.createdAt.toISOString(),
    sender: {
      id: m.sender.id,
      email: m.sender.email,
      name:
        m.sender.profile?.preferredName ??
        m.sender.profile?.fullName ??
        m.sender.email,
      primaryRole: m.sender.userRoles[0]?.role?.key ?? null,
      primaryRoleLabel: m.sender.userRoles[0]?.role?.name ?? null,
    },
    recipient: {
      id: m.recipient.id,
      email: m.recipient.email,
      name:
        m.recipient.profile?.preferredName ??
        m.recipient.profile?.fullName ??
        m.recipient.email,
      primaryRole: m.recipient.userRoles[0]?.role?.key ?? null,
      primaryRoleLabel: m.recipient.userRoles[0]?.role?.name ?? null,
    },
  });

  const initialInbox = inboxRows.map(mapToItem);
  const initialSent = sentRows.map(mapToItem);

  return (
    <div className="space-y-6">
      <PageHeader />
      <MessagesManager initialInbox={initialInbox} initialSent={initialSent} />
    </div>
  );
}

function PageHeader() {
  return (
    <div>
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground mb-1">
        <MessageSquare className="h-3.5 w-3.5" />
        <span>Direct Messaging</span>
      </div>
      <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Messages</h1>
      <p className="mt-1 text-sm text-muted-foreground max-w-2xl">
        Send and receive direct messages with other chapter leaders. Use this
        for targeted, private communication — questions to the executive,
        mentorship follow-ups, or feedback to a specific role holder.
      </p>
    </div>
  );
}
