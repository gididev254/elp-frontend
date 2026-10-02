"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { Logo } from "@/components/layout/logo";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetClose } from "@/components/ui/sheet";
import { Menu, LogOut, Bell, ChevronRight, Search } from "lucide-react";
import { signOut } from "next-auth/react";
import { DASHBOARD_NAV, type NavGroup } from "@/components/dashboard/nav-config";
import { SearchDialog } from "@/components/dashboard/search-dialog";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [searchOpen, setSearchOpen] = React.useState(false);

  // Global keyboard shortcut: Cmd+K / Ctrl+K toggles the search dialog.
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((v) => !v);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const role = session?.user?.role ?? "LEADER";
  const userName = session?.user?.name ?? "Account";
  const userEmail = session?.user?.email ?? "";
  const userInitials = userName
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="min-h-[calc(100vh-4rem)] flex">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-border bg-sidebar">
        <div className="flex h-14 items-center gap-2 border-b border-sidebar-border px-4">
          <Logo className="h-7 w-7 text-sidebar-primary" />
          <div className="leading-tight">
            <div className="text-sm font-bold">Embuni ELC</div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Dashboard
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin py-4">
          <DashboardNav pathname={pathname} role={role} />
        </div>

        <div className="border-t border-sidebar-border p-3">
          <div className="flex items-center gap-2.5 rounded-md p-2">
            <Avatar className="h-9 w-9 border border-border">
              <AvatarImage src="/images/avatars/avatar-1.png" alt="" />
              <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                {userInitials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{userName}</div>
              <div className="truncate text-[11px] text-muted-foreground">{userEmail}</div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground"
              onClick={() => signOut({ callbackUrl: "/" })}
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Mobile sidebar (Sheet) */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden fixed top-[3.75rem] left-3 z-40 bg-background shadow-sm border border-border"
            aria-label="Open dashboard menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[280px] p-0">
          <SheetTitle className="sr-only">Dashboard navigation</SheetTitle>
          <div className="flex h-full flex-col">
            <div className="flex h-14 items-center gap-2 border-b border-sidebar-border px-4">
              <Logo className="h-7 w-7 text-sidebar-primary" />
              <span className="text-sm font-bold">Embuni ELC</span>
              <SheetClose asChild>
                <Button variant="ghost" size="icon" className="ml-auto" aria-label="Close menu">
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </SheetClose>
            </div>
            <div className="flex-1 overflow-y-auto scrollbar-thin py-4">
              <DashboardNav pathname={pathname} role={role} onNavigate={() => setMobileOpen(false)} />
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <DashboardTopBar onOpenSearch={() => setSearchOpen(true)} />
        <div className="flex-1 p-4 md:p-6 lg:p-8">{children}</div>
      </div>

      {/* Global search dialog (Cmd+K / Ctrl+K) */}
      <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  );
}

function DashboardTopBar({ onOpenSearch }: { onOpenSearch: () => void }) {
  return (
    <header className="sticky top-16 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/85 backdrop-blur px-4 md:px-6">
      <div className="lg:hidden w-10" /> {/* spacer for mobile menu trigger */}
      <Button
        variant="outline"
        onClick={onOpenSearch}
        className="flex-1 max-w-md justify-start text-muted-foreground hover:text-foreground"
        aria-label="Open search"
      >
        <Search className="h-4 w-4 mr-2 shrink-0" />
        <span className="truncate text-sm font-normal">Search the chapter…</span>
        <kbd className="ml-auto hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] text-muted-foreground">
          ⌘K
        </kbd>
      </Button>
      <div className="flex-1" />
      <Button asChild variant="ghost" size="icon" className="relative" aria-label="Notifications">
        <Link href="/dashboard/notifications">
          <Bell className="h-4 w-4" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-accent" />
        </Link>
      </Button>
    </header>
  );
}

function DashboardNav({
  pathname,
  role,
  onNavigate,
}: {
  pathname: string;
  role: string;
  onNavigate?: () => void;
}) {
  // Filter nav groups to only those visible to this role.
  const visibleGroups = DASHBOARD_NAV.filter((g) =>
    g.items.some((item) => !item.roles || item.roles.includes(role)),
  );

  return (
    <nav className="space-y-6 px-3">
      {visibleGroups.map((group) => (
        <NavGroupBlock
          key={group.label}
          group={group}
          pathname={pathname}
          role={role}
          onNavigate={onNavigate}
        />
      ))}
    </nav>
  );
}

function NavGroupBlock({
  group,
  pathname,
  role,
  onNavigate,
}: {
  group: NavGroup;
  pathname: string;
  role: string;
  onNavigate?: () => void;
}) {
  const items = group.items.filter((item) => !item.roles || item.roles.includes(role));
  if (items.length === 0) return null;

  return (
    <div className="space-y-1">
      <div className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {group.label}
      </div>
      {items.map((item) => {
        const Icon = item.icon;
        const active = pathname === item.href || pathname.startsWith(item.href + "/");
        const linkEl = (
          <Link
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-sidebar-primary text-sidebar-primary-foreground"
                : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="truncate">{item.label}</span>
          </Link>
        );
        return <div key={item.href}>{linkEl}</div>;
      })}
    </div>
  );
}
