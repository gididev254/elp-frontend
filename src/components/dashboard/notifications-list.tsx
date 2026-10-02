"use client";

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Bell, Check, CheckCheck, CalendarDays, Megaphone, AlertCircle, Settings2 } from "lucide-react";

interface NotifItem {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  createdAt: string;
}

const TYPE_ICONS: Record<string, typeof Bell> = {
  system: Settings2,
  event_reminder: CalendarDays,
  announcement: Megaphone,
  concern_update: AlertCircle,
  role_change: Settings2,
};

export function NotificationsList({ initial }: { initial: NotifItem[] }) {
  const { toast } = useToast();
  const qc = useQueryClient();

  const markAllMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/notifications/read-all", { method: "POST" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "All notifications marked as read" });
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: () => toast({ title: "Failed", variant: "destructive" }),
  });

  const markOneMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/notifications/${id}/read`, { method: "POST" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const unreadCount = initial.filter((n) => !n.read).length;

  if (initial.length === 0) {
    return (
      <Card>
        <CardContent className="p-10 text-center">
          <Bell className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <h3 className="font-medium">No notifications yet</h3>
          <p className="text-sm text-muted-foreground mt-1">
            You&apos;ll see chapter announcements, event reminders and account updates here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
        </p>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => markAllMutation.mutate()}
            disabled={markAllMutation.isPending}
          >
            <CheckCheck className="h-3.5 w-3.5 mr-1.5" />
            Mark all as read
          </Button>
        )}
      </div>

      <div className="space-y-2">
        {initial.map((n) => {
          const Icon = TYPE_ICONS[n.type] ?? Bell;
          return (
            <Card key={n.id} className={n.read ? "" : "border-primary/40 bg-primary/5"}>
              <CardContent className="p-3 flex items-start gap-3">
                <div className={`flex h-9 w-9 items-center justify-center rounded-md shrink-0 ${n.read ? "bg-secondary text-muted-foreground" : "bg-primary/10 text-primary"}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">{n.title}</span>
                    {!n.read && (
                      <Badge variant="default" className="text-[10px] uppercase">New</Badge>
                    )}
                  </div>
                  {n.body && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>
                  )}
                  <div className="text-[11px] text-muted-foreground mt-1">
                    {format(new Date(n.createdAt), "d MMM yyyy, h:mm a")}
                  </div>
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                  {n.link && (
                    <Button asChild size="sm" variant="ghost" className="h-7 px-2 text-xs">
                      <a href={n.link}>View</a>
                    </Button>
                  )}
                  {!n.read && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs"
                      onClick={() => markOneMutation.mutate(n.id)}
                      disabled={markOneMutation.isPending}
                    >
                      <Check className="h-3 w-3 mr-1" />
                      Read
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
